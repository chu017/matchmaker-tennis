/**
 * Participants API - fetch and add participants
 */
import { isProbablyHtml, parseApiJsonOrError } from './parseApiJson'

export interface StoredParticipant {
  id: string
  name: string
  rating: number
  type: 'singles' | 'doubles'
  partnerName?: string | null
  partnerRating?: number | null
  createdAt?: string
}

export function getDisplayName(p: StoredParticipant): string {
  if (p.type === 'doubles' && p.partnerName) {
    return `${p.name} / ${p.partnerName}`
  }
  return p.name
}

/** For list display: includes each player's rating (e.g. "Name (3.0) / Partner (3.5)") */
export function getDisplayNameWithRatings(p: StoredParticipant): string {
  if (p.type === 'doubles' && p.partnerName) {
    const partnerR = p.partnerRating != null ? p.partnerRating : 3.0
    return `${p.name} (${p.rating}) / ${p.partnerName} (${partnerR})`
  }
  return `${p.name} (${p.rating})`
}

export async function fetchParticipants(): Promise<StoredParticipant[]> {
  const res = await fetch('/api/participants')
  const data = await parseApiJsonOrError<{ participants: StoredParticipant[] }>(res)
  return data.participants
}

export async function addParticipant(data: {
  name: string
  rating?: number
  type: 'singles' | 'doubles'
  partnerName?: string
  partnerRating?: number
}): Promise<StoredParticipant> {
  const res = await fetch('/api/participants', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(data),
  })
  return parseApiJsonOrError<StoredParticipant>(res)
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
  const res = await fetch(`/api/match-results?t=${Date.now()}`, { cache: 'no-store' })
  const text = await res.text()
  if (!res.ok) return { singles: {}, doubles: {} }
  if (isProbablyHtml(text)) return { singles: {}, doubles: {} }
  try {
    return JSON.parse(text) as MatchResults
  } catch {
    return { singles: {}, doubles: {} }
  }
}
