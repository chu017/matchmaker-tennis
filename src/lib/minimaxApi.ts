/**
 * MiniMax API client - calls our backend proxy
 */

import { isProbablyHtml, parseApiJsonOrError } from './parseApiJson'

const API_BASE = '/api'

export async function chat(messages: { role: string; content: string }[]): Promise<string> {
  const res = await fetch(`${API_BASE}/chat`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ messages }),
  })
  const data = await parseApiJsonOrError<{ content: string }>(res)
  return data.content
}

export interface SeedingSuggestion {
  name: string;
  seed?: number;
  rating?: number;
}

export async function getSeedingSuggestions(
  playerDescriptions: string
): Promise<SeedingSuggestion[]> {
  const res = await fetch(`${API_BASE}/seeding-suggestions`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ playerDescriptions }),
  })
  const data = await parseApiJsonOrError<{ suggestions: SeedingSuggestion[] }>(res)
  return data.suggestions
}

export async function checkApiHealth(): Promise<{ ok: boolean; hasKey: boolean }> {
  const res = await fetch(`${API_BASE}/health`)
  const text = await res.text()
  if (isProbablyHtml(text)) return { ok: false, hasKey: false }
  try {
    return JSON.parse(text) as { ok: boolean; hasKey: boolean }
  } catch {
    return { ok: false, hasKey: false }
  }
}
