/**
 * Convert stored participants to tournament Participant format
 */
import type { Participant } from './tournament'
import type { StoredParticipant } from './participantsApi'
import { getDisplayName } from './participantsApi'

/** Pair rating for doubles: average of both players' ratings */
function getPairRating(p: StoredParticipant): number {
  if (p.type !== 'doubles' || p.partnerRating == null) return p.rating
  return (p.rating + p.partnerRating) / 2
}

export function toTournamentParticipants(stored: StoredParticipant[]): Participant[] {
  // Sort by rating descending (doubles: average of pair)
  const sorted = [...stored].sort((a, b) => getPairRating(b) - getPairRating(a))
  return sorted.map((p, i) => ({
    id: p.id,
    name: getDisplayName(p),
    seed: i + 1,
    rating: getPairRating(p),
  }))
}
