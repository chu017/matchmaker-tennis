/**
 * Who is in the bracket vs waiting list — first {@link MAX_DRAW_PLAYERS} to sign up (per event type).
 */
import type { StoredParticipant } from './participantsApi'
import { MAX_DRAW_PLAYERS } from './tournament'

export { MAX_DRAW_PLAYERS }

/** Sort by signup time (earliest first), then id for stability */
export function compareSignupOrder(a: StoredParticipant, b: StoredParticipant): number {
  const ta = a.createdAt ? Date.parse(a.createdAt) : 0
  const tb = b.createdAt ? Date.parse(b.createdAt) : 0
  if (Number.isFinite(ta) && Number.isFinite(tb) && ta !== tb) return ta - tb
  if (!Number.isFinite(ta) && Number.isFinite(tb)) return 1
  if (Number.isFinite(ta) && !Number.isFinite(tb)) return -1
  return a.id.localeCompare(b.id)
}

export function splitPoolBySignupOrder(
  all: StoredParticipant[],
  type: 'singles' | 'doubles',
  maxInDraw: number = MAX_DRAW_PLAYERS,
): { inDraw: StoredParticipant[]; waiting: StoredParticipant[] } {
  const pool = [...all.filter((p) => p.type === type)].sort(compareSignupOrder)

  const forcedWaiting = pool.filter((p) => p.adminBracketSlot === 'waiting')
  const forcedDraw = pool.filter((p) => p.adminBracketSlot === 'draw')
  const neutral = pool.filter(
    (p) => p.adminBracketSlot !== 'waiting' && p.adminBracketSlot !== 'draw',
  )

  const forcedDrawSorted = [...forcedDraw].sort(compareSignupOrder)
  const inDrawForced = forcedDrawSorted.slice(0, maxInDraw)
  const forcedDrawOverflow = forcedDrawSorted.slice(maxInDraw)

  const slotsLeft = maxInDraw - inDrawForced.length
  const neutralSorted = [...neutral].sort(compareSignupOrder)
  const neutralInDraw = slotsLeft > 0 ? neutralSorted.slice(0, slotsLeft) : []
  const neutralWaiting = slotsLeft > 0 ? neutralSorted.slice(slotsLeft) : [...neutralSorted]

  const inDraw = [...inDrawForced, ...neutralInDraw].sort(compareSignupOrder)
  const waiting = [...forcedWaiting, ...neutralWaiting, ...forcedDrawOverflow].sort(compareSignupOrder)

  return { inDraw, waiting }
}

/** Short label for lists (local time) */
export function formatSignedUpAt(iso: string | undefined): string {
  if (!iso) return '—'
  const d = new Date(iso)
  if (Number.isNaN(d.getTime())) return '—'
  return d.toLocaleString(undefined, {
    month: 'short',
    day: 'numeric',
    hour: 'numeric',
    minute: '2-digit',
  })
}

/** Admin: clearer signup timestamp for every row */
export function formatAdminSignedUpAt(iso: string | undefined): string {
  if (!iso) return '— (no time)'
  const d = new Date(iso)
  if (Number.isNaN(d.getTime())) return '— (invalid)'
  return d.toLocaleString(undefined, {
    dateStyle: 'medium',
    timeStyle: 'short',
  })
}
