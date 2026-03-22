/**
 * Tennis tournament draw — single elimination, SF Tennis Open rules
 *
 * **Field size:** Up to 16 players per event. If more than 16 sign up, only the top 16
 * by rating (NTRP 2.5–4.5) enter the draw.
 *
 * **Seeding:** Sort by rating descending; ties broken by existing seed (lower = stronger).
 *
 * **Fair bracket:** Uses standard ITF-style single-elimination positions for 2/4/8/16 draws.
 * That spreads strength so:
 * - Seeds 1 vs 2 can only meet in the final (16 draw).
 * - The **top 4 by rating** land in **four different quarterfinal quadrants** (1/4 区).
 * - Weaker players are paired with stronger ones early (1 vs 16, 2 vs 15, … when the field is full).
 *
 * **Byes:** Bracket size is the next power of 2 (max 16). Empty slots produce byes; the way
 * seeds map to lines, higher seeds tend to receive byes when the field is not full.
 */

/** Hard cap for singles/doubles draw size */
export const MAX_DRAW_PLAYERS = 16

export interface Participant {
  id: string;
  name: string;
  seed?: number; // 1 = top seed, 2 = second seed, etc.
  rating?: number; // Elo-style rating for minimax prediction (default: derived from seed)
}

export interface Match {
  id: string;
  round: number; // 1 = first round, 2 = quarter, 3 = semi, 4 = final
  position: number;
  player1: Participant | null;
  player2: Participant | null;
  winner?: Participant | null;
  /** Game score (e.g. "6-4, 6-3") when result is recorded */
  score?: string | null;
  isBye?: boolean;
  /** Minimax model: P(player1 wins) */
  predictedWinProb?: number;
  /** Minimax model: predicted winner */
  predictedWinner?: Participant | null;
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
 * Standard single-elimination line positions.
 * First round pairs slot `i` with slot `i + size/2` (see generateFirstRoundMatches).
 * Index `s` = tournament seed (1-based) → bracket slot index (0-based).
 *
 * For size 16 this is the usual 1v16, 8v9, 5v12, … ordering so seeds 1–4 occupy
 * four different quarterfinal sections.
 */
const SEED_TO_SLOT_BY_SIZE: Record<number, number[]> = {
  2: [0, 1],
  // 1v4, 2v3
  4: [0, 1, 3, 2],
  // 1v8, 4v5, 3v6, 2v7
  8: [0, 3, 2, 1, 5, 4, 6, 7],
  // 1v16, 8v9, 5v12, 4v13, 3v14, 6v11, 7v10, 2v15
  16: [0, 7, 4, 3, 2, 5, 6, 1, 9, 14, 13, 12, 11, 10, 15, 8],
}

function getSeedToSlotTable(bracketSize: number): number[] {
  const t = SEED_TO_SLOT_BY_SIZE[bracketSize]
  if (!t) {
    throw new Error(`Unsupported bracket size: ${bracketSize}`)
  }
  return t
}

/**
 * Sort strongest first for draw entry, then place seeds 1..n on standard lines.
 */
function orderParticipantsForDraw(participants: Participant[]): Participant[] {
  return [...participants].sort((a, b) => {
    const ra = a.rating ?? -Infinity
    const rb = b.rating ?? -Infinity
    if (rb !== ra) return rb - ra
    const sa = a.seed ?? Infinity
    const sb = b.seed ?? Infinity
    return sa - sb
  })
}

function seedBracketStandard(participants: Participant[], bracketSize: number): (Participant | null)[] {
  const slots: (Participant | null)[] = new Array(bracketSize).fill(null)
  const table = getSeedToSlotTable(bracketSize)
  const n = participants.length
  for (let s = 0; s < n; s++) {
    const slotIndex = table[s]
    if (slotIndex === undefined) break
    slots[slotIndex] = participants[s]
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
 * Generate the complete tournament draw (max {@link MAX_DRAW_PLAYERS}, standard seeding).
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
  const rawSize = nextPowerOf2(n)
  const bracketSize = Math.min(MAX_DRAW_PLAYERS, rawSize)
  const rounds = Math.log2(bracketSize)
  const seededSlots = seedBracketStandard(inDraw, bracketSize)
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
 * Apply stored match results to a draw (set winners, advance to next round)
 */
export function applyMatchResults(
  draw: TournamentDraw,
  results: Record<string, MatchResultValue>
): TournamentDraw {
  const participantsById = new Map(draw.participants.map((p) => [p.id, p]))

  const matches = draw.matches.map((m) => {
    const result = results[m.id]
    const winnerId = getWinnerId(result)
    const score = getScore(result)
    const winner = winnerId ? participantsById.get(winnerId) ?? null : undefined
    return { ...m, winner: winner ?? m.winner, score }
  })

  // Advance winners into the next round. Must run even when `results` is empty so bye
  // matches (winner set at draw time) immediately fill downstream slots.
  // Pair each side independently: bye vs TBD → one name + TBD; both byes → both names.
  for (let r = 2; r <= draw.rounds; r++) {
    const prevMatches = matches.filter((m) => m.round === r - 1).sort((a, b) => a.position - b.position)
    const currMatches = matches.filter((m) => m.round === r).sort((a, b) => a.position - b.position)
    for (let i = 0; i < currMatches.length; i++) {
      const left = prevMatches[i * 2]
      const right = prevMatches[i * 2 + 1]
      const curr = currMatches[i]
      const idx = matches.findIndex((m) => m.id === curr.id)
      if (idx < 0) continue
      const p1 = left?.winner ?? null
      const p2 = right?.winner ?? null
      matches[idx] = {
        ...matches[idx],
        player1: p1,
        player2: p2,
      }
    }
  }

  return { ...draw, matches }
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
 * Get round name for display
 */
export function getRoundName(round: number): string {
  const names: Record<number, string> = {
    1: 'First Round',
    2: 'Quarterfinals',
    3: 'Semifinals',
    4: 'Final',
    5: 'Championship',
  };
  return names[round] ?? `Round ${round}`;
}
