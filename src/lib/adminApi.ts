/**
 * Admin API - requires X-Admin-Key header
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

function adminHeaders(key: string) {
  return {
    'Content-Type': 'application/json',
    'X-Admin-Key': key,
  }
}

export async function verifyAdminKey(key: string): Promise<boolean> {
  const res = await fetch('/api/admin/verify', {
    headers: adminHeaders(key),
  })
  const text = await res.text()
  if (isProbablyHtml(text)) return false
  try {
    const data = JSON.parse(text) as { ok?: boolean }
    return res.ok && data.ok === true
  } catch {
    return false
  }
}

export async function deleteParticipant(id: string, adminKey: string): Promise<void> {
  const res = await fetch(`/api/admin/participants/${id}`, {
    method: 'DELETE',
    headers: adminHeaders(adminKey),
  })
  await parseApiJsonOrError(res)
}

export async function setMatchResult(
  matchId: string,
  winnerId: string,
  type: 'singles' | 'doubles',
  adminKey: string,
  score?: string | null
): Promise<{ singles: Record<string, { winnerId: string; score?: string | null }>; doubles: Record<string, { winnerId: string; score?: string | null }> }> {
  const res = await fetch('/api/admin/match-result', {
    method: 'POST',
    headers: adminHeaders(adminKey),
    body: JSON.stringify({ matchId, winnerId, type, score: score ?? null }),
  })
  return parseApiJsonOrError(res)
}

export async function clearMatchResult(
  matchIds: string | string[],
  type: 'singles' | 'doubles',
  adminKey: string
): Promise<{ singles: Record<string, string>; doubles: Record<string, string> }> {
  const ids = Array.isArray(matchIds) ? matchIds : [matchIds]
  const res = await fetch(
    `/api/admin/match-result?matchIds=${encodeURIComponent(ids.join(','))}&type=${encodeURIComponent(type)}`,
    { method: 'DELETE', headers: adminHeaders(adminKey) }
  )
  return parseApiJsonOrError(res)
}

export interface EventPlanChecklistItem {
  id: string
  label: string
  done: boolean
}

export interface EventPlanMatchSlot {
  court?: string
  time?: string
  notes?: string
}

export interface EventPlan {
  checklist?: EventPlanChecklistItem[]
  courtRentalNotes?: string
  matchSlots?: Record<string, EventPlanMatchSlot>
  generalNotes?: string
}

export async function fetchEventPlan(adminKey: string): Promise<EventPlan> {
  const res = await fetch('/api/admin/event-plan', {
    headers: adminHeaders(adminKey),
  })
  return parseApiJsonOrError<EventPlan>(res)
}

export async function saveEventPlan(plan: EventPlan, adminKey: string): Promise<EventPlan> {
  const res = await fetch('/api/admin/event-plan', {
    method: 'POST',
    headers: adminHeaders(adminKey),
    body: JSON.stringify(plan),
  })
  return parseApiJsonOrError<EventPlan>(res)
}
