/**
 * Poll /api/health until the Express API is up (same origin logic as vite.config.ts).
 * Used so Vite starts after the server, avoiding HTML responses for /api during dev.
 */
import 'dotenv/config'

const apiOrigin =
  process.env.VITE_API_PROXY_TARGET?.replace(/\/$/, '') ||
  `http://127.0.0.1:${process.env.PORT || '3001'}`

const url = `${apiOrigin}/api/health`
const intervalMs = 300
const maxWaitMs = 45_000

const start = Date.now()
process.stderr.write(`Waiting for API at ${url} …\n`)

while (Date.now() - start < maxWaitMs) {
  const ctrl = new AbortController()
  const kill = setTimeout(() => ctrl.abort(), 2500)
  try {
    const res = await fetch(url, { signal: ctrl.signal })
    if (res.ok) {
      process.stderr.write(`API ready (${Math.round((Date.now() - start) / 100) / 10}s)\n`)
      process.exit(0)
    }
  } catch {
    /* still starting */
  } finally {
    clearTimeout(kill)
  }
  await new Promise((r) => setTimeout(r, intervalMs))
}

process.stderr.write(
  `Timed out after ${maxWaitMs / 1000}s waiting for ${url}\n` +
    `Start the API first (e.g. npm run dev:server), or fix PORT / VITE_API_PROXY_TARGET in .env to match Express.\n`,
)
process.exit(1)
