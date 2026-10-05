import react from '@vitejs/plugin-react'
import fs from 'node:fs'
import path from 'node:path'
import { defineConfig, loadEnv } from 'vite'

// While developing (`npm run dev`) there is no Vercel, so this small plugin answers /api/* requests
// by running the same files that Vercel runs in production (api/analyze.js etc.).
// It also loads ALL variables from .env (including ones without the VITE_ prefix, like
// ANTHROPIC_API_KEY) into the dev SERVER only — they are never sent to the browser.
function devApi(mode) {
  return {
    name: 'dekket-dev-api',
    configureServer(server) {
      const env = loadEnv(mode, process.cwd(), '')
      for (const [key, value] of Object.entries(env)) {
        if (process.env[key] === undefined) process.env[key] = value
      }

      server.middlewares.use(async (req, res, next) => {
        const match = req.url?.match(/^\/api\/([a-z0-9-]+)(?:\?|$)/i)
        if (!match) return next()

        try {
          if (!fs.existsSync(path.join(process.cwd(), 'api', `${match[1]}.js`))) {
            res.statusCode = 404
            res.setHeader('content-type', 'application/json')
            return res.end(JSON.stringify({ error: 'Fant ikke endepunktet.' }))
          }
          const mod = await server.ssrLoadModule(`/api/${match[1]}.js`)
          const handler = mod[req.method]
          if (!handler) {
            res.statusCode = 405
            return res.end()
          }

          const chunks = []
          for await (const chunk of req) chunks.push(chunk)
          const hasBody = !['GET', 'HEAD'].includes(req.method)
          const request = new Request(`http://${req.headers.host}${req.url}`, {
            method: req.method,
            headers: req.headers,
            body: hasBody ? Buffer.concat(chunks) : undefined,
          })

          const response = await handler(request)
          res.statusCode = response.status
          response.headers.forEach((value, name) => res.setHeader(name, value))
          res.end(Buffer.from(await response.arrayBuffer()))
        } catch (error) {
          console.error(error)
          res.statusCode = 500
          res.setHeader('content-type', 'application/json')
          res.end(JSON.stringify({ error: 'Serverfeil.' }))
        }
      })
    },
  }
}

// https://vite.dev/config/
export default defineConfig(({ mode }) => ({
  plugins: [react(), devApi(mode)],
}))
