/**
 * Admin API - requires X-Admin-Key header
 */

export interface StoredParticipant {
  id: string
  name: string
  rating: number
  type: 'singles' | 'doubles'
  partnerName?: string | null
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
  return res.ok
}

export async function deleteParticipant(id: string, adminKey: string): Promise<void> {
  const res = await fetch(`/api/admin/participants/${id}`, {
    method: 'DELETE',
    headers: adminHeaders(adminKey),
  })
  if (!res.ok) {
    const err = await res.json().catch(() => ({}))
    throw new Error((err as { error?: string }).error || res.statusText)
  }
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
  if (!res.ok) {
    const err = await res.json().catch(() => ({}))
    throw new Error((err as { error?: string }).error || res.statusText)
  }
  return res.json()
}

export async function clearMatchResult(
  matchId: string,
  type: 'singles' | 'doubles',
  adminKey: string
): Promise<{ singles: Record<string, string>; doubles: Record<string, string> }> {
  const res = await fetch(`/api/admin/match-result?matchId=${encodeURIComponent(matchId)}&type=${encodeURIComponent(type)}`, {
    method: 'DELETE',
    headers: adminHeaders(adminKey),
  })
  if (!res.ok) {
    const err = await res.json().catch(() => ({}))
    throw new Error((err as { error?: string }).error || res.statusText)
  }
  return res.json()
}
