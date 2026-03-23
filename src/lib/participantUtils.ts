/**
 * Convert stored participants to tournament Participant format
 */
import type { Participant } from './tournament'
import type { StoredParticipant } from './participantsApi'
import { getDisplayName } from './participantsApi'
import { effectiveNtrpForPairing } from './gender'

/**
 * Sorting strength for the draw: singles use raw NTRP; doubles use average of each side’s
 * **effective** NTRP (female = stored − 0.5 vs male baseline for pairing fairness).
 */
function getPairRating(p: StoredParticipant): number {
  if (p.type !== 'doubles' || p.partnerRating == null) return p.rating
  const r1 = effectiveNtrpForPairing(p.rating, p.gender ?? undefined)
  const r2 = effectiveNtrpForPairing(p.partnerRating, p.partnerGender ?? undefined)
  return (r1 + r2) / 2
}

/**
 * Map **main-draw** entrants only (≤16, already chosen by signup order).
 * Seeds 1…n are assigned by **NTRP** (strongest = #1) for fair bracket placement.
 */
export function toTournamentParticipants(stored: StoredParticipant[]): Participant[] {
  const sorted = [...stored].sort((a, b) => getPairRating(b) - getPairRating(a))
  return sorted.map((p, i) => ({
    id: p.id,
    name: getDisplayName(p),
    seed: i + 1,
    rating: getPairRating(p),
  }))
}
