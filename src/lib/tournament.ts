/**
 * Tennis tournament draw logic for SF Matchmaker
 * Generates single-elimination brackets with proper seeding
 */

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
 * Standard tennis seeding: 1 vs 16, 2 vs 15, 3 vs 14, etc.
 * For smaller draws, seeds are distributed to avoid early meetings.
 */
function seedBracket(participants: Participant[], bracketSize: number): (Participant | null)[] {
  const slots: (Participant | null)[] = new Array(bracketSize).fill(null);

  // Sort by seed (unseeded go last)
  const sorted = [...participants].sort((a, b) => {
    const seedA = a.seed ?? Infinity;
    const seedB = b.seed ?? Infinity;
    return seedA - seedB;
  });

  // Standard bracket seeding pattern for power-of-2
  // Round 1 matchups: (1,16), (8,9), (4,13), (5,12), (2,15), (7,10), (3,14), (6,11)
  const seedOrder = getSeedOrder(bracketSize);

  let playerIdx = 0;
  for (const slot of seedOrder) {
    if (playerIdx < sorted.length) {
      slots[slot] = sorted[playerIdx];
      playerIdx++;
    }
  }

  return slots;
}

/**
 * Get the standard bracket slot order for proper seeding
 * Ensures top seeds don't meet until later rounds (1 vs 16, 2 vs 15, etc.)
 */
function getSeedOrder(size: number): number[] {
  if (size <= 2) return [0, 1];
  const half = size / 2;
  const top = getSeedOrder(half);
  const bottom = getSeedOrder(half);
  // Interleave so 1st seed goes top, 2nd goes bottom, 3rd goes top, etc.
  const result: number[] = [];
  for (let i = 0; i < half; i++) {
    result.push(top[i]);
    result.push(bottom[i] + half);
  }
  return result;
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
 * Generate the complete tournament draw
 */
export function generateDraw(participants: Participant[]): TournamentDraw {
  if (participants.length < 2) {
    return {
      participants,
      matches: [],
      rounds: 0,
    };
  }

  const bracketSize = nextPowerOf2(participants.length);
  const rounds = Math.log2(bracketSize);
  const seededSlots = seedBracket(participants, bracketSize);
  const firstRoundMatches = generateFirstRoundMatches(seededSlots, 'r1');

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
    participants,
    matches: allMatches,
    rounds,
  };
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
