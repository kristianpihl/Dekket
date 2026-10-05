// POST /api/analyze  { policyId }  — analyse one of the logged-in user's documents with Claude.
//
// Runs on the server (Vercel function; locally via the dev plugin in vite.config.js) because it needs
// secret keys that must never reach the browser. The steps:
//   1. Check who is calling (the user's Supabase session token) — no token, no analysis.
//   2. Enforce a daily limit per user, so cost can't run away.
//   3. Fetch the policy row and the file with the USER's own permissions (row-level security
//      makes it impossible to touch anyone else's data, even by sending someone else's id).
//   4. Send the document to Claude and get back a schema-constrained answer.
//   5. Check the answer, save it in `analyses`, return it.
//
// Environment variables (set in Vercel, and in .env for local runs — never with a VITE_ prefix):
//   ANTHROPIC_API_KEY        required, secret
//   ANALYSIS_MODEL           optional, default claude-opus-5-5 (e.g. claude-sonnet-5-5 is cheaper)
//   ANALYSIS_EFFORT          optional, low | medium | high (default medium)
//   ANALYSIS_DAILY_LIMIT     optional, analyses per user per 24 h (default 20)
// The Supabase URL and anon key are read from VITE_SUPABASE_URL / VITE_SUPABASE_ANON_KEY as before.

import Anthropic from '@anthropic-ai/sdk'
import { createClient } from '@supabase/supabase-js'
import { ANALYSIS_SCHEMA, SYSTEM_PROMPT, buildUserText, validateResult } from './_analysis.js'

const BUCKET = 'policies'
const MAX_FILE_BYTES = 10 * 1024 * 1024

function reply(status, body) {
  return Response.json(body, { status })
}

export async function POST(request) {
  const apiKey = process.env.ANTHROPIC_API_KEY
  const supabaseUrl = process.env.SUPABASE_URL ?? process.env.VITE_SUPABASE_URL
  const supabaseAnon = process.env.SUPABASE_ANON_KEY ?? process.env.VITE_SUPABASE_ANON_KEY
  if (!apiKey || !supabaseUrl || !supabaseAnon) {
    console.error('analyze: missing ANTHROPIC_API_KEY or Supabase settings')
    return reply(500, { error: 'Analysen er ikke satt opp ennå (mangler nøkkel på serveren).' })
  }

  // 1) Who is calling?
  const token = request.headers.get('authorization')?.replace(/^Bearer\s+/i, '')
  if (!token) return reply(401, { error: 'Du må være logget inn.' })

  const supabase = createClient(supabaseUrl, supabaseAnon, {
    global: { headers: { Authorization: `Bearer ${token}` } },
    auth: { persistSession: false, autoRefreshToken: false },
  })
  const { data: userData, error: userError } = await supabase.auth.getUser(token)
  if (userError || !userData?.user) return reply(401, { error: 'Innloggingen er utløpt. Logg inn på nytt.' })

  let policyId
  try {
    policyId = (await request.json()).policyId
  } catch {
    return reply(400, { error: 'Ugyldig forespørsel.' })
  }
  if (typeof policyId !== 'string' || !/^[0-9a-f-]{36}$/i.test(policyId)) {
    return reply(400, { error: 'Ugyldig forespørsel.' })
  }

  // 2) Daily limit
  const dailyLimit = Number(process.env.ANALYSIS_DAILY_LIMIT ?? 20)
  const since = new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString()
  const { count, error: countError } = await supabase
    .from('analyses')
    .select('id', { count: 'exact', head: true })
    .gte('created_at', since)
  if (countError) {
    console.error('analyze: count failed', countError)
    return reply(500, { error: 'Er databasen satt opp? Kjør supabase/analysis.sql i Supabase.' })
  }
  if ((count ?? 0) >= dailyLimit) {
    return reply(429, { error: `Du har nådd grensen på ${dailyLimit} analyser per døgn. Prøv igjen i morgen.` })
  }

  // 3) The policy, the user's other documents, and the file itself
  const { data: policy, error: policyError } = await supabase.from('policies').select('*').eq('id', policyId).single()
  if (policyError || !policy) return reply(404, { error: 'Fant ikke dokumentet.' })

  const { data: others } = await supabase
    .from('policies')
    .select('title, insurance_type, doc_kind')
    .neq('id', policyId)

  const { data: blob, error: downloadError } = await supabase.storage.from(BUCKET).download(policy.file_path)
  if (downloadError || !blob) {
    console.error('analyze: download failed', downloadError)
    return reply(500, { error: 'Kunne ikke hente filen.' })
  }
  if (blob.size > MAX_FILE_BYTES) return reply(413, { error: 'Filen er for stor til analyse.' })
  const base64 = Buffer.from(await blob.arrayBuffer()).toString('base64')

  const fileBlock =
    policy.mime_type === 'application/pdf'
      ? { type: 'document', source: { type: 'base64', media_type: 'application/pdf', data: base64 } }
      : { type: 'image', source: { type: 'base64', media_type: policy.mime_type, data: base64 } }

  // 4) Ask Claude
  const client = new Anthropic({ apiKey })
  const model = process.env.ANALYSIS_MODEL ?? 'claude-opus-5-5'
  let message
  try {
    const stream = client.beta.messages.stream({
      model,
      max_tokens: 16000,
      // If a safety classifier declines the request, the API re-runs it on a fallback model instead of failing.
      betas: ['server-side-fallback-2026-07-01'],
      fallbacks: 'default',
      thinking: { type: 'adaptive' },
      output_config: {
        effort: process.env.ANALYSIS_EFFORT ?? 'medium',
        format: { type: 'json_schema', schema: ANALYSIS_SCHEMA },
      },
      system: SYSTEM_PROMPT,
      messages: [
        {
          role: 'user',
          content: [
            fileBlock,
            { type: 'text', text: buildUserText({ hints: policy, others: others ?? [] }) },
          ],
        },
      ],
    })
    message = await stream.finalMessage()
  } catch (error) {
    console.error('analyze: Claude request failed', error)
    if (error instanceof Anthropic.RateLimitError) {
      return reply(429, { error: 'Tjenesten er travel akkurat nå. Prøv igjen om litt.' })
    }
    if (error instanceof Anthropic.AuthenticationError) {
      return reply(500, { error: 'Nøkkelen til analysetjenesten er ugyldig.' })
    }
    if (error instanceof Anthropic.BadRequestError) {
      return reply(422, { error: 'Dokumentet kunne ikke leses (kanskje er det passordbeskyttet eller skadet).' })
    }
    return reply(502, { error: 'Analysen feilet. Prøv igjen.' })
  }

  if (message.stop_reason === 'refusal') {
    return reply(422, { error: 'Analysetjenesten kunne ikke behandle dette dokumentet.' })
  }
  if (message.stop_reason === 'max_tokens') {
    return reply(502, { error: 'Dokumentet ble for omfattende å oppsummere i én omgang.' })
  }

  // 5) Check, save, return
  let result
  try {
    const answer = message.content
      .filter((block) => block.type === 'text')
      .map((block) => block.text)
      .join('')
    result = validateResult(JSON.parse(answer))
  } catch (error) {
    console.error('analyze: bad answer from Claude', error)
    return reply(502, { error: 'Fikk et uleselig svar fra analysen. Prøv igjen.' })
  }

  const { data: saved, error: saveError } = await supabase
    .from('analyses')
    .insert({
      policy_id: policyId,
      model: message.model,
      result,
      usage: {
        input_tokens: message.usage?.input_tokens ?? null,
        output_tokens: message.usage?.output_tokens ?? null,
        cache_read_input_tokens: message.usage?.cache_read_input_tokens ?? null,
      },
    })
    .select()
    .single()
  if (saveError) {
    console.error('analyze: save failed', saveError)
    return reply(500, { error: 'Analysen ble laget, men kunne ikke lagres. Prøv igjen.' })
  }

  return reply(200, { analysis: saved })
}
