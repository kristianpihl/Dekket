// GET /api/send-reminders — the daily job that sends reminder e-mails. Vercel calls it on a schedule (see "crons"
// in vercel.json). It is NOT for users: it needs the cron secret, and it uses the Supabase service role to read
// every user's data, which is why it must only ever run here on the server.
//
// Environment variables (set in Vercel → Settings → Environment Variables; never with a VITE_ prefix):
//   CRON_SECRET                required. Vercel sends it as "Authorization: Bearer <secret>" on scheduled calls.
//   SUPABASE_SERVICE_ROLE_KEY  required. Supabase → Project Settings → API → service_role / secret key. VERY powerful: keep it secret.
//   RESEND_API_KEY             required to actually send (not for ?dry=1).
//   RESEND_FROM                required to send, e.g. "Dekket <paaminnelser@dittdomene.no>" (the domain must be verified in Resend).
//   APP_URL                    optional, default https://dekket.vercel.app (used for links in the e-mail).
// The Supabase URL is read from VITE_SUPABASE_URL as before.
//
// Try it without sending anything:  /api/send-reminders?dry=1  (with the Authorization header). It returns only counts.

import { timingSafeEqual } from 'node:crypto'
import { createClient } from '@supabase/supabase-js'
import { runReminders } from './_reminders.js'

function reply(status, body) {
  return Response.json(body, { status })
}

function safeEqual(a, b) {
  const x = Buffer.from(a)
  const y = Buffer.from(b)
  return x.length === y.length && timingSafeEqual(x, y)
}

// Today's date in Norway (the job runs on a UTC server, so "today" must be worked out for Oslo).
function todayInOslo() {
  const iso = new Intl.DateTimeFormat('sv-SE', { timeZone: 'Europe/Oslo' }).format(new Date()) // 2026-10-07
  const [y, m, d] = iso.split('-').map(Number)
  return new Date(y, m - 1, d)
}

export async function GET(request) {
  const secret = process.env.CRON_SECRET
  const supabaseUrl = process.env.SUPABASE_URL ?? process.env.VITE_SUPABASE_URL
  const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY
  if (!secret || !supabaseUrl || !serviceKey) {
    console.error('send-reminders: missing CRON_SECRET, Supabase URL or service role key')
    return reply(500, { error: 'Ikke satt opp.' })
  }

  const given = request.headers.get('authorization') ?? ''
  if (!safeEqual(given, `Bearer ${secret}`)) return reply(401, { error: 'Ikke tillatt.' })

  const dry = new URL(request.url).searchParams.get('dry') === '1'
  const resendKey = process.env.RESEND_API_KEY
  const from = process.env.RESEND_FROM
  if (!dry && (!resendKey || !from)) {
    console.error('send-reminders: missing RESEND_API_KEY or RESEND_FROM')
    return reply(500, { error: 'E-posttjenesten er ikke satt opp.' })
  }

  const admin = createClient(supabaseUrl, serviceKey, { auth: { persistSession: false, autoRefreshToken: false } })

  const deps = {
    async loadEnabledUsers() {
      const { data, error } = await admin.from('notification_settings').select('user_id, lead_days').eq('email_reminders', true)
      if (error) throw error
      return data
    },
    async loadPolicies(userId) {
      const { data, error } = await admin
        .from('policies')
        .select('id, title, insurer, valid_to, auto_renews, annual_premium, next_change_date, next_annual_premium, next_change_note')
        .eq('user_id', userId)
      if (error) throw error
      return data
    },
    async loadSent(userId) {
      const { data, error } = await admin.from('reminders_sent').select('policy_id, kind, target_date, lead_days').eq('user_id', userId)
      if (error) throw error
      return data
    },
    async getEmail(userId) {
      const { data, error } = await admin.auth.admin.getUserById(userId)
      return error ? null : (data.user?.email ?? null)
    },
    async claim(rows) {
      const { error } = await admin.from('reminders_sent').insert(rows)
      return !error // a unique-constraint error means another run already claimed them
    },
    async release(rows) {
      for (const row of rows) {
        await admin.from('reminders_sent').delete().match({ policy_id: row.policy_id, kind: row.kind, target_date: row.target_date, lead_days: row.lead_days })
      }
    },
    async send({ to, subject, text, html }) {
      const response = await fetch('https://api.resend.com/emails', {
        method: 'POST',
        headers: { Authorization: `Bearer ${resendKey}`, 'Content-Type': 'application/json' },
        body: JSON.stringify({ from, to: [to], subject, text, html }),
      })
      if (!response.ok) throw new Error(`Resend answered ${response.status}`)
    },
  }

  try {
    const summary = await runReminders({
      deps,
      today: todayInOslo(),
      appUrl: process.env.APP_URL ?? 'https://dekket.vercel.app',
      dry,
    })
    return reply(200, summary) // counts only — never names, addresses or content
  } catch (error) {
    console.error('send-reminders failed', error)
    return reply(500, { error: 'Jobben feilet.' })
  }
}
