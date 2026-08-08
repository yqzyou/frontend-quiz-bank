/**
 * SM-2 spaced repetition algorithm (SuperMemo 2).
 *
 * Reference: https://www.supermemo.com/en/blog/application-of-a-computer-to-improve-the-results-obtained-in-working-with-the-supermemo-method
 *
 * Simplified to a 4-level rating scale (Anki-style):
 *   again → quality 1 (lapse, reset)
 *   hard  → quality 3
 *   good  → quality 4
 *   easy  → quality 5
 *
 * All time math uses milliseconds since epoch; intervals are stored as
 * whole days but `dueAt` is an absolute timestamp.
 */

import type { Sm2Rating, Sm2State } from './types';

export type { Sm2Rating, Sm2State };

export const MS_PER_DAY = 24 * 60 * 60 * 1000;

export const DEFAULT_EASINESS = 2.5;

export const RATING_QUALITY: Record<Sm2Rating, number> = {
  again: 1,
  hard: 3,
  good: 4,
  easy: 5,
};

export const MIN_EASINESS = 1.3;

export const DEFAULT_SM2_STATE: Sm2State = {
  repetition: 0,
  interval: 0,
  easiness: DEFAULT_EASINESS,
  dueAt: Date.now(),
};

/**
 * Compute the next SM-2 state from the previous state plus a rating.
 *
 * @param prev     Prior SM-2 state (not mutated).
 * @param rating   User self-rating.
 * @param ratedAt  Epoch milliseconds when the rating happened. Defaults to now.
 */
export function calculateSm2(
  prev: Sm2State,
  rating: Sm2Rating,
  ratedAt: number = Date.now(),
): Sm2State {
  const q = RATING_QUALITY[rating];

  const nextRepetition = q < 3 ? 0 : prev.repetition + 1;
  const nextInterval = computeInterval(nextRepetition, prev.interval, prev.easiness);
  const nextEasiness = clampEasiness(computeEasiness(prev.easiness, q));

  const dueAt = nextInterval === 0 ? ratedAt : ratedAt + nextInterval * MS_PER_DAY;

  return {
    repetition: nextRepetition,
    interval: nextInterval,
    easiness: nextEasiness,
    dueAt,
  };
}

function computeInterval(repetition: number, prevInterval: number, easiness: number): number {
  if (repetition <= 0) return 0;
  if (repetition === 1) return 1;
  if (repetition === 2) return 6;
  return Math.round(prevInterval * easiness);
}

function computeEasiness(prevEasiness: number, quality: number): number {
  return prevEasiness + (0.1 - (5 - quality) * (0.08 + (5 - quality) * 0.02));
}

function clampEasiness(value: number): number {
  return Math.max(MIN_EASINESS, value);
}
