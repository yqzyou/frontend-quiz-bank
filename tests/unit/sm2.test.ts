import { describe, it, expect } from 'vitest';
import { calculateSm2, DEFAULT_SM2_STATE, RATING_QUALITY, type Sm2Rating } from '@lib/sm2';

describe('DEFAULT_SM2_STATE', () => {
  it('starts with repetition 0, interval 0, easiness 2.5', () => {
    expect(DEFAULT_SM2_STATE).toEqual({
      repetition: 0,
      interval: 0,
      easiness: 2.5,
      dueAt: expect.any(Number),
    });
  });

  it('has dueAt that is effectively now (within 1 second)', () => {
    const now = Date.now();
    expect(Math.abs(DEFAULT_SM2_STATE.dueAt - now)).toBeLessThan(1000);
  });
});

describe('calculateSm2 — first rating', () => {
  it('rating=good (q=4) moves to repetition 1, interval 1 day', () => {
    const before = { ...DEFAULT_SM2_STATE, dueAt: 1_000_000 };
    const result = calculateSm2(before, 'good', 1_000_000);
    expect(result.repetition).toBe(1);
    expect(result.interval).toBe(1);
    expect(result.dueAt).toBe(1_000_000 + 1 * 24 * 60 * 60 * 1000);
    expect(result.easiness).toBeCloseTo(2.5, 5);
  });

  it('rating=easy (q=5) on first try gives interval 1 and bumps easiness', () => {
    const before = { ...DEFAULT_SM2_STATE, dueAt: 1_000_000 };
    const result = calculateSm2(before, 'easy', 1_000_000);
    expect(result.repetition).toBe(1);
    expect(result.interval).toBe(1);
    expect(result.easiness).toBeGreaterThan(2.5);
    expect(result.dueAt).toBe(1_000_000 + 1 * 24 * 60 * 60 * 1000);
  });

  it('rating=hard (q=3) keeps interval 1 but slightly drops easiness', () => {
    const before = { ...DEFAULT_SM2_STATE, dueAt: 1_000_000 };
    const result = calculateSm2(before, 'hard', 1_000_000);
    expect(result.repetition).toBe(1);
    expect(result.interval).toBe(1);
    expect(result.easiness).toBeLessThan(2.5);
    expect(result.easiness).toBeGreaterThanOrEqual(1.3);
  });

  it('rating=again (q=1) resets repetition to 0 and interval to 0', () => {
    const before = { ...DEFAULT_SM2_STATE, dueAt: 1_000_000 };
    const result = calculateSm2(before, 'again', 1_000_000);
    expect(result.repetition).toBe(0);
    expect(result.interval).toBe(0);
    expect(result.dueAt).toBe(1_000_000); // due immediately
    expect(result.easiness).toBeLessThan(2.5);
    expect(result.easiness).toBeGreaterThanOrEqual(1.3);
  });
});

describe('calculateSm2 — second rating (repetition=1 → 2)', () => {
  it('rating=good advances to interval 6', () => {
    const before = {
      repetition: 1,
      interval: 1,
      easiness: 2.5,
      dueAt: 1_000_000,
    };
    const result = calculateSm2(before, 'good', 2_000_000);
    expect(result.repetition).toBe(2);
    expect(result.interval).toBe(6);
    expect(result.dueAt).toBe(2_000_000 + 6 * 24 * 60 * 60 * 1000);
    expect(result.easiness).toBeCloseTo(2.5, 5);
  });
});

describe('calculateSm2 — third+ rating uses interval × easiness', () => {
  it('rating=good on third repetition multiplies interval by easiness', () => {
    const before = {
      repetition: 2,
      interval: 6,
      easiness: 2.5,
      dueAt: 1_000_000,
    };
    const result = calculateSm2(before, 'good', 2_000_000);
    expect(result.repetition).toBe(3);
    expect(result.interval).toBe(15); // round(6 * 2.5)
    expect(result.dueAt).toBe(2_000_000 + 15 * 24 * 60 * 60 * 1000);
  });

  it('rating=easy on third repetition bumps easiness and uses it', () => {
    const before = {
      repetition: 2,
      interval: 6,
      easiness: 2.6,
      dueAt: 1_000_000,
    };
    const result = calculateSm2(before, 'easy', 2_000_000);
    expect(result.repetition).toBe(3);
    expect(result.interval).toBe(Math.round(6 * 2.6 + 0.1)); // new easiness applied
    expect(result.easiness).toBeGreaterThan(2.6);
  });
});

describe('calculateSm2 — easiness floor', () => {
  it('clamps easiness to minimum 1.3 after repeated "again" ratings', () => {
    let state = { ...DEFAULT_SM2_STATE, dueAt: 0 };
    for (let i = 0; i < 50; i++) {
      state = calculateSm2(state, 'again', i * 1000);
    }
    expect(state.easiness).toBeGreaterThanOrEqual(1.3);
    expect(state.repetition).toBe(0);
    expect(state.interval).toBe(0);
  });
});

describe('calculateSm2 — failure resets', () => {
  it('rating=again after multiple successes resets to repetition 0', () => {
    const before = {
      repetition: 5,
      interval: 30,
      easiness: 2.6,
      dueAt: 1_000_000,
    };
    const result = calculateSm2(before, 'again', 2_000_000);
    expect(result.repetition).toBe(0);
    expect(result.interval).toBe(0);
    expect(result.dueAt).toBe(2_000_000);
    expect(result.easiness).toBeLessThan(2.6);
    expect(result.easiness).toBeGreaterThanOrEqual(1.3);
  });
});

describe('calculateSm2 — immutability', () => {
  it('does not mutate the input state', () => {
    const before = {
      repetition: 2,
      interval: 6,
      easiness: 2.5,
      dueAt: 1_000_000,
    };
    const snapshot = JSON.parse(JSON.stringify(before));
    calculateSm2(before, 'good', 2_000_000);
    expect(before).toEqual(snapshot);
  });
});

describe('RATING_QUALITY', () => {
  it('maps each rating to its quality value', () => {
    expect(RATING_QUALITY.again).toBe(1);
    expect(RATING_QUALITY.hard).toBe(3);
    expect(RATING_QUALITY.good).toBe(4);
    expect(RATING_QUALITY.easy).toBe(5);
  });

  it('covers all Sm2Rating values', () => {
    const ratings: Sm2Rating[] = ['again', 'hard', 'good', 'easy'];
    for (const r of ratings) {
      expect(RATING_QUALITY[r]).toBeDefined();
    }
  });
});
