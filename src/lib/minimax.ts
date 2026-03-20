/**
 * Minimax Match Prediction Model
 *
 * Uses Elo-style ratings + tournament performance to predict match outcomes.
 * Weights: base rating (NTRP/Elo) + performance boost from wins/losses.
 */

import type { Participant, Match, TournamentDraw } from './tournament'

const DEFAULT_RATING = 1500;
const SEED_RATING_DECAY = 100; // Each seed step = 100 Elo points
const TOP_SEED_RATING = 2400;
/** Elo adjustment per win/loss in this tournament */
const PERF_ELO_PER_MATCH = 45;

/** NTRP 1-7 maps to Elo ~1200-2100 (sign-up form uses NTRP) */
const NTRP_TO_ELO = (ntrp: number) =>
  Math.round(1200 + Math.max(0, Math.min(6, ntrp - 1)) * 150);

/**
 * Get base Elo rating for a participant (no performance adjustment).
 */
export function getRating(p: Participant | null): number {
  if (!p) return DEFAULT_RATING;
  if (p.rating != null) {
    return p.rating >= 1000 ? p.rating : NTRP_TO_ELO(p.rating);
  }
  if (p.seed != null) return TOP_SEED_RATING - (p.seed - 1) * SEED_RATING_DECAY;
  return DEFAULT_RATING;
}

/**
 * Build wins/losses from completed matches in the draw.
 */
function getRecordFromDraw(matches: Match[]): Map<string, { wins: number; losses: number }> {
  const record = new Map<string, { wins: number; losses: number }>();
  for (const m of matches) {
    if (!m.winner || m.isBye) continue; // only count actual match results, not byes
    const p1Id = m.player1?.id;
    const p2Id = m.player2?.id;
    if (!p1Id && !p2Id) continue;
    for (const id of [p1Id, p2Id].filter(Boolean) as string[]) {
      if (!record.has(id)) record.set(id, { wins: 0, losses: 0 });
      const r = record.get(id)!;
      if (m.winner.id === id) r.wins++;
      else r.losses++;
    }
  }
  return record;
}

/**
 * Effective rating = base + performance. Each win +45 Elo, each loss -45.
 */
function getEffectiveRating(
  p: Participant | null,
  record: Map<string, { wins: number; losses: number }>
): number {
  const base = getRating(p);
  if (!p) return base;
  const r = record.get(p.id);
  if (!r) return base;
  return base + (r.wins - r.losses) * PERF_ELO_PER_MATCH;
}

/**
 * Elo win probability: P(A beats B) = 1 / (1 + 10^((R_B - R_A) / 400))
 * Uses effective rating (base + tournament performance).
 */
export function winProbability(
  player1: Participant | null,
  player2: Participant | null,
  record?: Map<string, { wins: number; losses: number }>
): number {
  const rec = record ?? new Map();
  const r1 = getEffectiveRating(player1, rec);
  const r2 = getEffectiveRating(player2, rec);
  return 1 / (1 + Math.pow(10, (r2 - r1) / 400));
}

/**
 * Predict winner based on ratings + performance
 */
export function predictWinner(
  player1: Participant | null,
  player2: Participant | null,
  record?: Map<string, { wins: number; losses: number }>
): Participant | null {
  if (!player1) return player2;
  if (!player2) return player1;
  return winProbability(player1, player2, record) >= 0.5 ? player1 : player2;
}

export interface MatchPrediction {
  winProbability: number; // P(player1 wins)
  predictedWinner: Participant | null;
}

export function predictMatch(
  player1: Participant | null,
  player2: Participant | null,
  record?: Map<string, { wins: number; losses: number }>
): MatchPrediction {
  const prob = winProbability(player1, player2, record);
  return {
    winProbability: prob,
    predictedWinner: predictWinner(player1, player2, record),
  };
}

/**
 * Apply minimax predictions to entire draw - propagates predicted winners through bracket
 */
export function applyPredictionsToDraw(draw: TournamentDraw): TournamentDraw {
  const matches = draw.matches.map((m) => ({ ...m }));
  const record = getRecordFromDraw(matches);
  const matchesByRound = matches.reduce<Record<number, Match[]>>((acc, m) => {
    if (!acc[m.round]) acc[m.round] = [];
    acc[m.round].push(m);
    return acc;
  }, {});

  const getPredictedPlayersForMatch = (round: number, position: number): [Participant | null, Participant | null] => {
    if (round === 1) {
      const m = (matchesByRound[1] ?? [])[position];
      return [m?.player1 ?? null, m?.player2 ?? null];
    }
    const prevRound = (matchesByRound[round - 1] ?? []).sort((a, b) => a.position - b.position);
    const m1 = prevRound[position * 2];
    const m2 = prevRound[position * 2 + 1];
    return [
      (m1?.predictedWinner ?? m1?.winner) ?? null,
      (m2?.predictedWinner ?? m2?.winner) ?? null,
    ];
  };

  const roundOrder = [...new Set(matches.map((m) => m.round))].sort((a, b) => a - b);
  for (const round of roundOrder) {
    const roundMatches = (matchesByRound[round] ?? []).sort((a, b) => a.position - b.position);
    for (const match of roundMatches) {
      const [p1, p2] = match.player1 != null && match.player2 != null
        ? [match.player1, match.player2]
        : getPredictedPlayersForMatch(match.round, match.position);

      const pred = predictMatch(p1, p2, record);
      match.predictedWinProb = pred.winProbability;
      match.predictedWinner = match.isBye ? (p1 ?? p2) : pred.predictedWinner;
    }
  }

  return { ...draw, matches };
}
