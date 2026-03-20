/**
 * Convert stored participants to tournament Participant format
 */
import type { Participant } from './tournament'
import type { StoredParticipant } from './participantsApi'
import { getDisplayName } from './participantsApi'

export function toTournamentParticipants(stored: StoredParticipant[]): Participant[] {
  // Sort by rating descending (highest = seed 1)
  const sorted = [...stored].sort((a, b) => b.rating - a.rating)
  return sorted.map((p, i) => ({
    id: p.id,
    name: getDisplayName(p),
    seed: i + 1,
    rating: p.rating,
  }))
}
