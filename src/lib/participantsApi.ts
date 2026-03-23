/**
 * Participants API - fetch and add participants
 */
import { isProbablyHtml, parseApiJsonOrError } from './parseApiJson'

export interface StoredParticipant {
  id: string
  name: string
  rating: number
  type: 'singles' | 'doubles'
  /** Primary player; optional on legacy rows (treated as male for pairing math) */
  gender?: 'male' | 'female' | null
  partnerName?: string | null
  partnerRating?: number | null
  /** Doubles partner; optional on legacy rows */
  partnerGender?: 'male' | 'female' | null
  createdAt?: string
  /** Liability waiver — present for new signups after waiver tracking shipped */
  waiverAccepted?: boolean
  waiverAcceptedAt?: string | null
  waiverVersion?: string | null
  waiverIp?: string | null
  waiverUserAgent?: string | null
  /** Legal name typed when acknowledging the waiver (may differ from `name`) */
  waiverLegalName?: string | null
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

export type SignupBracketStatus = 'draw' | 'waiting'

export type StoredParticipantWithBracketStatus = StoredParticipant & {
  bracketStatus?: SignupBracketStatus
}

export async function addParticipant(data: {
  name: string
  rating?: number
  type: 'singles' | 'doubles'
  gender: 'male' | 'female'
  partnerName?: string
  partnerRating?: number
  partnerGender?: 'male' | 'female'
  waiverAccepted: boolean
  waiverVersion: string
  waiverLegalName: string
}): Promise<StoredParticipantWithBracketStatus> {
  const res = await fetch('/api/participants', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(data),
  })
  return parseApiJsonOrError<StoredParticipantWithBracketStatus>(res)
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

/** Ensure API / stored payloads always have object maps (avoids undefined.singles crashes). */
export function normalizeMatchResults(data: unknown): MatchResults {
  if (!data || typeof data !== 'object') return { singles: {}, doubles: {} }
  const o = data as Record<string, unknown>
  const singles =
    o.singles != null && typeof o.singles === 'object' && !Array.isArray(o.singles)
      ? (o.singles as Record<string, MatchResultValue>)
      : {}
  const doubles =
    o.doubles != null && typeof o.doubles === 'object' && !Array.isArray(o.doubles)
      ? (o.doubles as Record<string, MatchResultValue>)
      : {}
  return { singles, doubles }
}

export async function fetchMatchResults(): Promise<MatchResults> {
  const res = await fetch(`/api/match-results?t=${Date.now()}`, { cache: 'no-store' })
  const text = await res.text()
  if (!res.ok) return { singles: {}, doubles: {} }
  if (isProbablyHtml(text)) return { singles: {}, doubles: {} }
  try {
    return normalizeMatchResults(JSON.parse(text))
  } catch {
    return { singles: {}, doubles: {} }
  }
}
