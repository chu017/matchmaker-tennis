/**
 * Avoid cryptic "Unexpected token '<'" when /api hits index.html (no backend / wrong port).
 */
export function isProbablyHtml(text: string): boolean {
  const t = text.trimStart()
  return t.startsWith('<!DOCTYPE') || t.startsWith('<!doctype') || t.startsWith('<html')
}

export async function parseApiJson<T>(res: Response): Promise<T> {
  const text = await res.text()
  if (isProbablyHtml(text)) {
    throw new Error(
      'API returned a web page instead of JSON. Start the backend: run `npm run dev` (recommended), or in two terminals: `npm run dev:server` then `npm run dev:client`. If you use `vite preview`, run the API on port 3001 first.'
    )
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
    throw new Error(
      'API returned a web page instead of JSON. Start the backend with `npm run dev` or `npm run dev:server` on port 3001.'
    )
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
