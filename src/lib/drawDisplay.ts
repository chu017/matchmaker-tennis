/**
 * Bracket / draw display — e.g. "Jane (4.5) #1"
 */
import type { Participant } from './tournament'

/** Rating only, for inside parentheses: NTRP one decimal, Elo as integer */
function ratingForParens(r: number | undefined): string | null {
  if (r == null || !Number.isFinite(r)) return null
  if (r >= 1000) return String(Math.round(r))
  return r.toFixed(1)
}

/**
 * Single-line label: `Name (4.5) #1` — rating optional, seed optional.
 * `null` player → `TBD`.
 */
export function formatParticipantDrawInline(p: Participant | null): string {
  if (!p) return 'TBD'
  let s = p.name
  const r = ratingForParens(p.rating)
  if (r) s += ` (${r})`
  if (p.seed != null) s += ` #${p.seed}`
  return s
}
