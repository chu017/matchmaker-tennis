/**
 * Tennis tournament draw — single elimination, SF Tennis Open rules
 *
 * **Field size:** Up to 16 players per event in the bracket. The **first 16 to sign up**
 * (by stored signup time) enter the draw; later sign-ups are on the **waiting list** (outside
 * the bracket until someone withdraws and order advances).
 *
 * **Seeding (within the 16):** After the field is fixed, players are ordered by NTRP (and optional
 * admin seed rank); ties broken by seed number. Seed 1 = strongest.
 *
 * **Community-style round 1:** Each match pairs **adjacent seeds** (similar NTRP): 1 vs 2, 3 vs 4, …
 * **Round 2+:** Match order is **shuffled** so winners from different parts of the list meet (e.g. pair
 * (1,2) feeds the same quarter as pair (5,6), not only (3,4)). **Alternating** which column gets the
 * stronger player keeps the two sides of the bracket from one column being much higher-rated than the other.
 *
 * **Bracket depth:** If **8 or fewer** entrants, the draw uses an **8-player** bracket (3 rounds
 * to the final). If **more than 8** (up to 16), a **16-player** bracket (4 rounds to the final).
 *
 * **Byes:** Empty bracket slots produce byes (one player advances without an opponent).
 */

/** Hard cap for singles/doubles draw size */
export const MAX_DRAW_PLAYERS = 16

export interface Participant {
  id: string;
  name: string;
  seed?: number; // 1 = top seed, 2 = second seed, etc.
  rating?: number; // NTRP-derived strength for display / future use
  /** When set (>=1), bracket seeding uses this rank before NTRP (see orderParticipantsForDraw). */
  adminSeedRank?: number | null;
}

export interface Match {
  id: string;
  /** 1-based round index. The last round (`draw.rounds`) is the final; labels depend on depth (see {@link getRoundName}). */
  round: number;
  position: number;
  player1: Participant | null;
  player2: Participant | null;
  winner?: Participant | null;
  /** Game score (e.g. "6-4, 6-3") when result is recorded */
  score?: string | null;
  isBye?: boolean;
}

export interface TournamentDraw {
  participants: Participant[];
  matches: Match[];
  rounds: number;
}

/**
 * Get the next power of 2 >= n (for bracket sizing)
 */
function nextPowerOf2(n: number): number {
  let p = 1;
  while (p < n) p *= 2;
  return p;
}

/**
 * Sort strongest first for draw entry, then place seeds 1..n for similar-rating R1 pairing.
 */
function orderParticipantsForDraw(participants: Participant[]): Participant[] {
  return [...participants].sort((a, b) => {
    const ar = a.adminSeedRank
    const br = b.adminSeedRank
    const aHas = ar != null && ar > 0
    const bHas = br != null && br > 0
    if (aHas && bHas && ar !== br) return ar - br
    if (aHas && !bHas) return -1
    if (!aHas && bHas) return 1
    const ra = a.rating ?? -Infinity
    const rb = b.rating ?? -Infinity
    if (rb !== ra) return rb - ra
    const sa = a.seed ?? Infinity
    const sb = b.seed ?? Infinity
    return sa - sb
  })
}

/**
 * Permute pair indices so round-2 merges **non-consecutive** adjacent-seed pairs (e.g. 0,2,4,6 then 1,3,5,7),
 * which mixes rating tiers after similar-NTRP round 1.
 */
function pairIndexPermutationForMixedRound2(half: number): number[] {
  if (half <= 1) return [0]
  const mid = Math.floor(half / 2)
  const perm: number[] = []
  for (let i = 0; i < mid; i++) perm.push(i * 2)
  for (let i = 0; i < half - mid; i++) perm.push(i * 2 + 1)
  return perm
}

/**
 * Adjacent-seed pairs (similar NTRP in R1), permuted for **mixed round-2 paths**, with **alternating**
 * strong/weak in top vs bottom column so the two bracket columns stay closer in average strength.
 */
function seedBracketSimilarRating(participants: Participant[], bracketSize: number): (Participant | null)[] {
  const slots: (Participant | null)[] = new Array(bracketSize).fill(null)
  const half = bracketSize / 2
  const n = participants.length

  type Pair = readonly [Participant | null, Participant | null]
  const pairList: Pair[] = []
  for (let i = 0; i < half; i++) {
    const a = 2 * i < n ? participants[2 * i] : null
    const b = 2 * i + 1 < n ? participants[2 * i + 1] : null
    pairList.push([a, b])
  }

  const perm = pairIndexPermutationForMixedRound2(half)

  for (let m = 0; m < half; m++) {
    const pIdx = perm[m]
    const [a, b] = pairList[pIdx]
    if (!a && !b) continue
    if (a && !b) {
      slots[m] = a
      continue
    }
    if (!a && b) {
      slots[m + half] = b
      continue
    }
    const stronger = a!
    const weaker = b!
    if (m % 2 === 0) {
      slots[m] = stronger
      slots[m + half] = weaker
    } else {
      slots[m] = weaker
      slots[m + half] = stronger
    }
  }

  return slots
}

/**
 * Generate first-round matchups from seeded slots
 */
function generateFirstRoundMatches(
  slots: (Participant | null)[],
  roundIdPrefix: string
): Match[] {
  const matches: Match[] = [];
  const half = slots.length / 2;

  for (let i = 0; i < half; i++) {
    const p1 = slots[i];
    const p2 = slots[i + half];
    const isBye = !p1 || !p2;

    matches.push({
      id: `${roundIdPrefix}-${i}`,
      round: 1,
      position: i,
      player1: p1 ?? null,
      player2: p2 ?? null,
      isBye,
      winner: isBye ? (p1 ?? p2) ?? null : undefined,
    });
  }

  return matches;
}

/**
 * Generate the complete tournament draw (max {@link MAX_DRAW_PLAYERS}, similar-rating round 1).
 */
export function generateDraw(participants: Participant[]): TournamentDraw {
  if (participants.length < 2) {
    return {
      participants,
      matches: [],
      rounds: 0,
    };
  }

  const ordered = orderParticipantsForDraw(participants)
  const inDraw = ordered.slice(0, MAX_DRAW_PLAYERS).map((p, i) => ({
    ...p,
    seed: i + 1,
  }))

  const n = inDraw.length
  const bracketSize =
    n <= 8 ? 8 : Math.min(MAX_DRAW_PLAYERS, nextPowerOf2(n))
  const rounds = Math.log2(bracketSize)
  const seededSlots = seedBracketSimilarRating(inDraw, bracketSize)
  const firstRoundMatches = generateFirstRoundMatches(seededSlots, 'r1')

  // Build all rounds (quarters, semis, final)
  const allMatches: Match[] = [...firstRoundMatches];
  let prevRoundCount = firstRoundMatches.length;
  let roundNum = 2;

  while (prevRoundCount > 1) {
    const matchesThisRound = prevRoundCount / 2;
    for (let i = 0; i < matchesThisRound; i++) {
      allMatches.push({
        id: `r${roundNum}-${i}`,
        round: roundNum,
        position: i,
        player1: null,
        player2: null,
      });
    }
    prevRoundCount = matchesThisRound;
    roundNum++;
  }

  return {
    participants: inDraw,
    matches: allMatches,
    rounds,
  };
}

/** Match result: winnerId required, score optional. Legacy format was just winnerId string. */
export type MatchResultValue = string | { winnerId: string; score?: string | null }

function getWinnerId(val: MatchResultValue | undefined): string | undefined {
  if (!val) return undefined
  return typeof val === 'string' ? val : val.winnerId || undefined
}

function getScore(val: MatchResultValue | undefined): string | null | undefined {
  if (!val || typeof val === 'string') return undefined
  return val.score ?? undefined
}

/**
 * Drop winner/score when they cannot apply to the current slotting (e.g. participant count
 * changed and `match-results` still has r2-0 = old winner who is not in this match).
 */
function sanitizeMatchWinnerAgainstSlots(m: Match): Match {
  const p1 = m.player1
  const p2 = m.player2
  const oneSided = !p1 || !p2

  // Round 1 with one empty slot = bye; the sole entrant always advances. Restore when stored
  // results cleared the winner (bad id) or `isBye` was lost — otherwise propagation leaves SF as TBD.
  if (m.round === 1 && oneSided) {
    const sole = p1 ?? p2
    if (!sole) {
      return { ...m, winner: undefined, score: undefined, isBye: true }
    }
    const wid = m.winner?.id
    if (wid !== sole.id) {
      return { ...m, winner: sole, score: undefined, isBye: true }
    }
    if (!m.isBye) return { ...m, isBye: true }
    return m
  }

  if (!m.winner) return m

  const wid = m.winner.id
  const sole = p1 ?? p2

  if (m.isBye) {
    if (!sole) return { ...m, winner: undefined, score: undefined }
    if (wid === sole.id) return m
    return { ...m, winner: sole, score: undefined }
  }

  const has1 = p1 != null
  const has2 = p2 != null
  if (has1 && has2) {
    if (wid === m.player1!.id || wid === m.player2!.id) return m
    return { ...m, winner: undefined, score: undefined }
  }

  // Not a bye but missing an opponent — no completed match; ignore stale stored results
  return { ...m, winner: undefined, score: undefined }
}

function propagateWinnersIntoSlots(matches: Match[], rounds: number): Match[] {
  const next = [...matches]
  for (let r = 2; r <= rounds; r++) {
    const prevMatches = next.filter((m) => m.round === r - 1).sort((a, b) => a.position - b.position)
    const currMatches = next.filter((m) => m.round === r).sort((a, b) => a.position - b.position)
    for (let i = 0; i < currMatches.length; i++) {
      const left = prevMatches[i * 2]
      const right = prevMatches[i * 2 + 1]
      const curr = currMatches[i]
      const idx = next.findIndex((m) => m.id === curr.id)
      if (idx < 0) continue
      const p1 = left?.winner ?? null
      const p2 = right?.winner ?? null
      next[idx] = {
        ...next[idx],
        player1: p1,
        player2: p2,
      }
    }
  }
  return next
}

function matchStateFingerprint(ms: Match[]): string {
  return ms
    .map((m) => [
      m.id,
      m.player1?.id ?? '',
      m.player2?.id ?? '',
      m.winner?.id ?? '',
      m.score ?? '',
    ].join(':'))
    .join('|')
}

/**
 * Apply stored match results to a draw (set winners, advance to next round)
 */
export function applyMatchResults(
  draw: TournamentDraw,
  results: Record<string, MatchResultValue>
): TournamentDraw {
  const participantsById = new Map(draw.participants.map((p) => [p.id, p]))

  let next = draw.matches.map((m) => {
    const result = results[m.id]
    if (result === undefined) return { ...m }
    const winnerId = getWinnerId(result)
    const score = getScore(result)
    if (!winnerId) {
      return { ...m, score: score ?? m.score }
    }
    const p = participantsById.get(winnerId)
    // Unknown id (e.g. deleted participant) → clear winner/score, do not keep stale m.winner
    return {
      ...m,
      winner: p ?? null,
      score: p ? score : undefined,
    }
  })

  // Alternate propagate ↔ sanitize until stable (stale JSON winners after redraw must not
  // leave impossible advancement in deep rounds).
  let prevFp = ''
  for (let iter = 0; iter < 12; iter++) {
    next = propagateWinnersIntoSlots(next, draw.rounds)
    next = next.map(sanitizeMatchWinnerAgainstSlots)
    const fp = matchStateFingerprint(next)
    if (fp === prevFp) break
    prevFp = fp
  }

  return { ...draw, matches: next }
}

/**
 * Get match IDs that depend on this match (downstream in bracket).
 * Clearing a match invalidates results of matches that were fed by its winner.
 */
export function getDownstreamMatchIds(matchId: string, draw: TournamentDraw): string[] {
  const m = /^r(\d+)-(\d+)$/.exec(matchId);
  if (!m) return [];
  let round = parseInt(m[1], 10);
  let pos = parseInt(m[2], 10);
  const downstream: string[] = [];
  for (let r = round + 1; r <= draw.rounds; r++) {
    pos = Math.floor(pos / 2);
    downstream.push(`r${r}-${pos}`);
  }
  return downstream;
}

/**
 * Human-readable round title. Depends on **total bracket depth** so the last round is always
 * "Final" (8-bracket / ≤8 players → 3 rounds: QF → SF → Final; 16-bracket → 4 rounds).
 */
export function getRoundName(round: number, totalRounds?: number): string {
  const tr = totalRounds ?? 4

  if (tr === 3) {
    const names: Record<number, string> = {
      1: 'Quarterfinals',
      2: 'Semifinals',
      3: 'Final',
    }
    return names[round] ?? `Round ${round}`
  }

  if (tr === 4) {
    const names: Record<number, string> = {
      1: 'First Round',
      2: 'Quarterfinals',
      3: 'Semifinals',
      4: 'Final',
    }
    return names[round] ?? `Round ${round}`
  }

  if (tr <= 0) return `Round ${round}`
  if (round === tr) return 'Final'
  if (round === tr - 1) return 'Semifinals'
  if (round === tr - 2) return 'Quarterfinals'
  if (round === 1) return 'First Round'
  return `Round ${round}`
}

/** Sort matches for admin lists using optional per-match display order (lower = earlier). */
export function sortMatchesByDisplayOrder<T extends { id: string; position: number }>(
  matches: T[],
  orderMap: Record<string, number>,
): T[] {
  return [...matches].sort((a, b) => {
    const oa = orderMap[a.id]
    const ob = orderMap[b.id]
    const va = oa !== undefined && Number.isFinite(oa) ? Number(oa) : a.position
    const vb = ob !== undefined && Number.isFinite(ob) ? Number(ob) : b.position
    if (va !== vb) return va - vb
    return a.position - b.position
  })
}
