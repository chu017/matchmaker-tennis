/**
 * MiniMax API client - calls our backend proxy
 */

const API_BASE = '/api';

export async function chat(messages: { role: string; content: string }[]): Promise<string> {
  const res = await fetch(`${API_BASE}/chat`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ messages }),
  });
  if (!res.ok) {
    const err = await res.json().catch(() => ({}));
    throw new Error((err as { error?: string }).error || res.statusText);
  }
  const data = await res.json();
  return (data as { content: string }).content;
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
  });
  if (!res.ok) {
    const err = await res.json().catch(() => ({}));
    throw new Error((err as { error?: string }).error || res.statusText);
  }
  const data = await res.json();
  return (data as { suggestions: SeedingSuggestion[] }).suggestions;
}

export async function checkApiHealth(): Promise<{ ok: boolean; hasKey: boolean }> {
  const res = await fetch(`${API_BASE}/health`);
  const data = await res.json();
  return data as { ok: boolean; hasKey: boolean };
}
