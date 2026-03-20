/**
 * Minimax Match Prediction Model
 *
 * Uses Elo-style ratings to predict match outcomes. The "minimax" principle:
 * we predict the outcome that minimizes expected error (max likelihood).
 * Given two players, the model outputs win probability for each.
 */

import type { Participant, Match, TournamentDraw } from './tournament'

const DEFAULT_RATING = 1500;
const SEED_RATING_DECAY = 100; // Each seed step = 100 Elo points
const TOP_SEED_RATING = 2400;

/**
 * Get effective rating for a participant (from explicit rating or seed)
 */
export function getRating(p: Participant | null): number {
  if (!p) return DEFAULT_RATING;
  if (p.rating != null) return p.rating;
  if (p.seed != null) return TOP_SEED_RATING - (p.seed - 1) * SEED_RATING_DECAY;
  return DEFAULT_RATING;
}

/**
 * Elo win probability: P(A beats B) = 1 / (1 + 10^((R_B - R_A) / 400))
 */
export function winProbability(player1: Participant | null, player2: Participant | null): number {
  const r1 = getRating(player1);
  const r2 = getRating(player2);
  return 1 / (1 + Math.pow(10, (r2 - r1) / 400));
}

/**
 * Predict winner based on ratings (minimax: choose highest probability outcome)
 */
export function predictWinner(
  player1: Participant | null,
  player2: Participant | null
): Participant | null {
  if (!player1) return player2;
  if (!player2) return player1;
  return winProbability(player1, player2) >= 0.5 ? player1 : player2;
}

export interface MatchPrediction {
  winProbability: number; // P(player1 wins)
  predictedWinner: Participant | null;
}

export function predictMatch(
  player1: Participant | null,
  player2: Participant | null
): MatchPrediction {
  const prob = winProbability(player1, player2);
  return {
    winProbability: prob,
    predictedWinner: predictWinner(player1, player2),
  };
}

/**
 * Apply minimax predictions to entire draw - propagates predicted winners through bracket
 */
export function applyPredictionsToDraw(draw: TournamentDraw): TournamentDraw {
  const matches = draw.matches.map((m) => ({ ...m }));
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

      const pred = predictMatch(p1, p2);
      match.predictedWinProb = pred.winProbability;
      match.predictedWinner = match.isBye ? (p1 ?? p2) : pred.predictedWinner;
    }
  }

  return { ...draw, matches };
}
