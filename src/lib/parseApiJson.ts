/**
 * Avoid cryptic "Unexpected token '<'" when /api hits index.html (no backend / wrong port).
 */
export const API_HTML_BODY_HINT =
  'The app expected JSON from /api but got HTML (usually the Vite shell). `npm run dev` waits for `/api/health` before starting Vite; if you still see this, start the API (`npm run dev:server`) or align `PORT` / `VITE_API_PROXY_TARGET` in `.env` with Express. For `vite preview`, start the API first. Open `http://127.0.0.1:<PORT>/api/health` (default port 3001) to verify.'

export function isProbablyHtml(text: string): boolean {
  const t = text.trimStart()
  return t.startsWith('<!DOCTYPE') || t.startsWith('<!doctype') || t.startsWith('<html')
}

export async function parseApiJson<T>(res: Response): Promise<T> {
  const text = await res.text()
  if (isProbablyHtml(text)) {
    throw new Error(API_HTML_BODY_HINT)
  }
  try {
    return JSON.parse(text) as T
  } catch {
    throw new Error(`Invalid JSON from server: ${text.slice(0, 120).replace(/\s+/g, ' ')}`)
  }
}

/** Parse JSON; if !res.ok, throw using body.error when present */
export async function parseApiJsonOrError<T>(res: Response): Promise<T> {
  const text = await res.text()
  if (isProbablyHtml(text)) {
    throw new Error(API_HTML_BODY_HINT)
  }
  let data: T
  try {
    data = JSON.parse(text) as T
  } catch {
    throw new Error(text.slice(0, 120) || res.statusText)
  }
  if (!res.ok) {
    const errObj = data as unknown as { error?: string }
    throw new Error(errObj?.error || res.statusText)
  }
  return data
}
