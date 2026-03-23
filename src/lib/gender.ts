/** Stored on each signup; used for doubles pairing strength. */
export type Gender = 'male' | 'female'

/** For doubles seeding / pair strength: female NTRP is treated as 0.5 lower than male at the same number. */
export const FEMALE_PAIRING_NTRP_ADJUSTMENT = 0.5

/** Effective NTRP for ordering doubles pairs (female vs male baseline). */
export function effectiveNtrpForPairing(rating: number, gender: Gender | null | undefined): number {
  if (gender === 'female') return rating - FEMALE_PAIRING_NTRP_ADJUSTMENT
  return rating
}
