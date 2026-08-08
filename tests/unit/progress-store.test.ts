import { describe, it, expect, beforeEach } from 'vitest';
import { useProgressStore } from '@lib/progress-store';
import { DEFAULT_SM2_STATE } from '@lib/sm2';

const SLUG = 'frontend/w1-react-basics/q01-usestate-closure';

describe('useProgressStore', () => {
  beforeEach(() => {
    useProgressStore.getState().reset();
  });

  it('starts empty', () => {
    const state = useProgressStore.getState();
    expect(state.answered).toEqual({});
    expect(state.bookmarks).toEqual([]);
    expect(state.sm2).toEqual({});
  });

  it('records an answer with attempts counter', () => {
    useProgressStore.getState().recordAnswer(SLUG, ['A'], true);
    const state = useProgressStore.getState();
    expect(state.answered[SLUG]).toEqual({
      picked: ['A'],
      correct: true,
      at: expect.any(Number),
      attempts: 1,
    });
  });

  it('increments attempts when re-answering the same slug', () => {
    useProgressStore.getState().recordAnswer(SLUG, ['B'], false);
    useProgressStore.getState().recordAnswer(SLUG, ['A'], true);
    const rec = useProgressStore.getState().answered[SLUG];
    expect(rec.attempts).toBe(2);
    expect(rec.correct).toBe(true);
    expect(rec.picked).toEqual(['A']);
  });

  it('toggles bookmark on and off', () => {
    useProgressStore.getState().toggleBookmark(SLUG);
    expect(useProgressStore.getState().bookmarks).toContain(SLUG);

    useProgressStore.getState().toggleBookmark(SLUG);
    expect(useProgressStore.getState().bookmarks).not.toContain(SLUG);
  });

  it('reset clears all three maps', () => {
    useProgressStore.getState().recordAnswer(SLUG, ['A'], true);
    useProgressStore.getState().toggleBookmark(SLUG);
    useProgressStore.getState().recordRating(SLUG, 'good', 1_000_000);
    useProgressStore.getState().reset();
    const state = useProgressStore.getState();
    expect(state.answered).toEqual({});
    expect(state.bookmarks).toEqual([]);
    expect(state.sm2).toEqual({});
  });

  it('exposes derived selectors that do not mutate state', () => {
    useProgressStore.getState().recordAnswer(SLUG, ['A'], true);
    useProgressStore.getState().recordAnswer('web3/w1/q01', ['B'], false);
    const before = JSON.parse(JSON.stringify(useProgressStore.getState().answered));
    const total = useProgressStore.getState().getAnsweredCount();
    const correct = useProgressStore.getState().getCorrectCount();
    expect(total).toBe(2);
    expect(correct).toBe(1);
    expect(useProgressStore.getState().answered).toEqual(before);
  });

  it('returns undefined for unknown slug from getAnswer', () => {
    expect(useProgressStore.getState().getAnswer('nope')).toBeUndefined();
  });

  // SM-2 integration
  describe('recordRating', () => {
    it('creates an SM-2 entry on first rating', () => {
      useProgressStore.getState().recordRating(SLUG, 'good', 1_000_000);
      const entry = useProgressStore.getState().sm2[SLUG];
      expect(entry).toBeDefined();
      expect(entry!.repetition).toBe(1);
      expect(entry!.interval).toBe(1);
      expect(entry!.dueAt).toBe(1_000_000 + 1 * 24 * 60 * 60 * 1000);
    });

    it('accumulates state across multiple ratings', () => {
      useProgressStore.getState().recordRating(SLUG, 'good', 1_000_000);
      useProgressStore.getState().recordRating(SLUG, 'good', 2_000_000);
      const entry = useProgressStore.getState().sm2[SLUG];
      expect(entry!.repetition).toBe(2);
      expect(entry!.interval).toBe(6);
    });

    it('respects the ratedAt timestamp argument', () => {
      useProgressStore.getState().recordRating(SLUG, 'good', 5_000_000);
      const entry = useProgressStore.getState().sm2[SLUG];
      expect(entry!.dueAt).toBe(5_000_000 + 1 * 24 * 60 * 60 * 1000);
    });
  });

  describe('getDueSlugs', () => {
    it('returns empty when nothing rated yet', () => {
      expect(useProgressStore.getState().getDueSlugs(1_000_000)).toEqual([]);
    });

    it('returns slugs whose dueAt <= now', () => {
      useProgressStore.getState().recordRating('a', 'good', 0); // due in 1 day
      useProgressStore.getState().recordRating('b', 'again', 0); // due immediately
      const due = useProgressStore.getState().getDueSlugs(0);
      expect(due).toContain('b');
      expect(due).not.toContain('a');
    });

    it('includes slugs exactly at the threshold', () => {
      const now = 1_000_000;
      useProgressStore.getState().recordRating('x', 'again', now); // dueAt = now
      const due = useProgressStore.getState().getDueSlugs(now);
      expect(due).toContain('x');
    });

    it('excludes future-due slugs', () => {
      useProgressStore.getState().recordRating('a', 'good', 0); // due in 1 day
      const due = useProgressStore.getState().getDueSlugs(1000);
      expect(due).toEqual([]);
    });
  });

  describe('getSm2Entry', () => {
    it('returns undefined for unrated slug', () => {
      expect(useProgressStore.getState().getSm2Entry('nope')).toBeUndefined();
    });

    it('returns the entry for a rated slug', () => {
      useProgressStore.getState().recordRating(SLUG, 'good', 1_000_000);
      const entry = useProgressStore.getState().getSm2Entry(SLUG);
      expect(entry).toBeDefined();
      expect(entry!.repetition).toBe(1);
    });
  });

  describe('default SM-2 entry on first rating', () => {
    it('starts from DEFAULT_SM2_STATE when no prior entry', () => {
      useProgressStore.getState().recordRating(SLUG, 'easy', 100);
      const entry = useProgressStore.getState().sm2[SLUG];
      // repetition 0 -> 1, interval 1, easiness 2.5 -> 2.6
      expect(entry!.easiness).toBeGreaterThan(DEFAULT_SM2_STATE.easiness);
    });
  });

  describe('getStats', () => {
    it('returns zero stats on a fresh store', () => {
      const stats = useProgressStore.getState().getStats(1_000_000);
      expect(stats).toEqual({
        answered: 0,
        correct: 0,
        bookmarks: 0,
        due: 0,
        mastered: 0,
        learning: 0,
      });
    });

    it('counts answered, correct, bookmarks', () => {
      useProgressStore.getState().recordAnswer('a', ['A'], true);
      useProgressStore.getState().recordAnswer('b', ['B'], false);
      useProgressStore.getState().toggleBookmark('c');
      const stats = useProgressStore.getState().getStats(1_000_000);
      expect(stats.answered).toBe(2);
      expect(stats.correct).toBe(1);
      expect(stats.bookmarks).toBe(1);
    });

    it('counts mastered as repetition >= 3', () => {
      useProgressStore.getState().recordRating('a', 'good', 1);  // rep 1
      useProgressStore.getState().recordRating('a', 'good', 2);  // rep 2
      useProgressStore.getState().recordRating('a', 'good', 3);  // rep 3 -> mastered
      useProgressStore.getState().recordRating('b', 'good', 4);  // rep 1
      const stats = useProgressStore.getState().getStats(1_000_000);
      expect(stats.mastered).toBe(1);
      expect(stats.learning).toBe(1);
    });

    it('counts due from sm2 entries with dueAt <= now', () => {
      useProgressStore.getState().recordRating('a', 'good', 0);     // due in 1 day
      useProgressStore.getState().recordRating('b', 'again', 0);    // due immediately
      const stats = useProgressStore.getState().getStats(0);
      expect(stats.due).toBe(1);
    });

    it('counts learning = total sm2 entries - mastered', () => {
      useProgressStore.getState().recordRating('a', 'good', 0); // rep 1 (learning)
      useProgressStore.getState().recordRating('b', 'good', 0);
      useProgressStore.getState().recordRating('b', 'good', 1);
      useProgressStore.getState().recordRating('b', 'good', 2); // rep 3 (mastered)
      const stats = useProgressStore.getState().getStats(0);
      expect(stats.learning).toBe(1); // a
      expect(stats.mastered).toBe(1); // b
    });
  });

  describe('getMasteredCount', () => {
    it('returns 0 when no SM-2 entries', () => {
      expect(useProgressStore.getState().getMasteredCount()).toBe(0);
    });

    it('counts entries with repetition >= 3', () => {
      useProgressStore.getState().recordRating('a', 'good', 1);
      useProgressStore.getState().recordRating('a', 'good', 2);
      useProgressStore.getState().recordRating('a', 'good', 3); // rep 3
      useProgressStore.getState().recordRating('b', 'good', 1);
      expect(useProgressStore.getState().getMasteredCount()).toBe(1);
    });

    it('does not count lapses (rep reset)', () => {
      useProgressStore.getState().recordRating('a', 'good', 1);
      useProgressStore.getState().recordRating('a', 'good', 2);
      useProgressStore.getState().recordRating('a', 'good', 3);
      useProgressStore.getState().recordRating('a', 'again', 4); // reset
      expect(useProgressStore.getState().getMasteredCount()).toBe(0);
    });
  });
});

