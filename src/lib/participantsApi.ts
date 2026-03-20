/**
 * Participants API - fetch and add participants
 */

export interface StoredParticipant {
  id: string
  name: string
  rating: number
  type: 'singles' | 'doubles'
  partnerName?: string | null
  createdAt?: string
}

export function getDisplayName(p: StoredParticipant): string {
  if (p.type === 'doubles' && p.partnerName) {
    return `${p.name} / ${p.partnerName}`
  }
  return p.name
}

export async function fetchParticipants(): Promise<StoredParticipant[]> {
  const res = await fetch('/api/participants')
  if (!res.ok) throw new Error('Failed to fetch participants')
  const data = await res.json()
  return (data as { participants: StoredParticipant[] }).participants
}

export async function addParticipant(data: {
  name: string
  rating?: number
  type: 'singles' | 'doubles'
  partnerName?: string
}): Promise<StoredParticipant> {
  const res = await fetch('/api/participants', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(data),
  })
  if (!res.ok) {
    const err = await res.json().catch(() => ({}))
    throw new Error((err as { error?: string }).error || res.statusText)
  }
  return res.json()
}

export interface MatchResultEntry {
  winnerId: string
  score?: string | null
}
export type MatchResultValue = string | MatchResultEntry

export interface MatchResults {
  singles: Record<string, MatchResultValue>
  doubles: Record<string, MatchResultValue>
}

export async function fetchMatchResults(): Promise<MatchResults> {
  const res = await fetch('/api/match-results')
  if (!res.ok) return { singles: {}, doubles: {} }
  return res.json()
}
