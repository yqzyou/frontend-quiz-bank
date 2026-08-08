import { describe, it, expect, beforeEach } from 'vitest';
import { useProgressStore } from '@lib/progress-store';
import { DEFAULT_SM2_STATE, MS_PER_DAY } from '@lib/sm2';

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
    expect(state.streak).toEqual({ current: 0, lastStudyDate: '', history: [] });
    expect(state.dailyMission).toEqual({ date: '', questionIds: [], completed: [] });
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

  it('reset clears all maps', () => {
    useProgressStore.getState().recordAnswer(SLUG, ['A'], true);
    useProgressStore.getState().toggleBookmark(SLUG);
    useProgressStore.getState().recordRating(SLUG, 'good', 1_000_000);
    useProgressStore.getState().reset();
    const state = useProgressStore.getState();
    expect(state.answered).toEqual({});
    expect(state.bookmarks).toEqual([]);
    expect(state.sm2).toEqual({});
    expect(state.streak).toEqual({ current: 0, lastStudyDate: '', history: [] });
    expect(state.dailyMission).toEqual({ date: '', questionIds: [], completed: [] });
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
      expect(entry!.dueAt).toBe(1_000_000 + 1 * MS_PER_DAY);
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
      expect(entry!.dueAt).toBe(5_000_000 + 1 * MS_PER_DAY);
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
        streak: 0,
        missionDone: 0,
        missionTotal: 0,
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
      useProgressStore.getState().recordRating('a', 'good', 1);
      useProgressStore.getState().recordRating('a', 'good', 2);
      useProgressStore.getState().recordRating('a', 'good', 3); // rep 3 -> mastered
      useProgressStore.getState().recordRating('b', 'good', 4); // rep 1
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
      expect(stats.learning).toBe(1);
      expect(stats.mastered).toBe(1);
    });

    it('exposes current streak in stats', () => {
      useProgressStore.getState().recordAnswer('a', ['A'], true);
      const stats = useProgressStore.getState().getStats(Date.now());
      expect(stats.streak).toBe(1);
    });

    it('exposes mission completion counts', () => {
      useProgressStore.getState().ensureDailyMission(['a', 'b', 'c'], 3, 1_000_000);
      useProgressStore.getState().recordAnswer('a', ['A'], true, 1_000_000);
      const stats = useProgressStore.getState().getStats(1_000_000);
      expect(stats.missionTotal).toBe(3);
      expect(stats.missionDone).toBe(1);
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

  // Streak system
  describe('streak', () => {
    it('starts at 0 with empty lastStudyDate', () => {
      expect(useProgressStore.getState().streak).toEqual({
        current: 0,
        lastStudyDate: '',
        history: [],
      });
    });

    it('increments to 1 on first recordAnswer', () => {
      useProgressStore.getState().recordAnswer('a', ['A'], true, 1_700_000_000_000);
      expect(useProgressStore.getState().streak.current).toBe(1);
      expect(useProgressStore.getState().streak.lastStudyDate).toMatch(/^\d{4}-\d{2}-\d{2}$/);
    });

    it('does not double-increment when answering twice on the same day', () => {
      const now = 1_700_000_000_000;
      useProgressStore.getState().recordAnswer('a', ['A'], true, now);
      useProgressStore.getState().recordAnswer('b', ['B'], true, now + 60_000);
      expect(useProgressStore.getState().streak.current).toBe(1);
    });

    it('increments again on the next calendar day', () => {
      const day1 = 1_700_000_000_000;
      const day2 = day1 + MS_PER_DAY;
      useProgressStore.getState().recordAnswer('a', ['A'], true, day1);
      useProgressStore.getState().recordAnswer('b', ['B'], true, day2);
      expect(useProgressStore.getState().streak.current).toBe(2);
    });

    it('resets to 1 when there is a gap > 1 day', () => {
      const day1 = 1_700_000_000_000;
      const day3 = day1 + 3 * MS_PER_DAY;
      useProgressStore.getState().recordAnswer('a', ['A'], true, day1);
      useProgressStore.getState().recordAnswer('b', ['B'], true, day3);
      expect(useProgressStore.getState().streak.current).toBe(1);
      expect(useProgressStore.getState().streak.history).toContain(toDateString(day1));
    });

    it('updates on recordRating as well', () => {
      useProgressStore.getState().recordRating('a', 'good', 1_700_000_000_000);
      expect(useProgressStore.getState().streak.current).toBe(1);
    });

    it('records history of unique study dates', () => {
      const day1 = 1_700_000_000_000;
      const day2 = day1 + MS_PER_DAY;
      useProgressStore.getState().recordAnswer('a', ['A'], true, day1);
      useProgressStore.getState().recordAnswer('b', ['B'], true, day1 + 60_000); // same day
      useProgressStore.getState().recordAnswer('c', ['C'], true, day2);
      const history = useProgressStore.getState().streak.history;
      expect(history.length).toBe(2);
      expect(history).toContain(toDateString(day1));
      expect(history).toContain(toDateString(day2));
    });
  });

  // Daily mission
  describe('ensureDailyMission', () => {
    it('generates a mission of up to N slugs on first call for the day', () => {
      const mission = useProgressStore.getState().ensureDailyMission(
        ['a', 'b', 'c', 'd', 'e'],
        3,
        1_700_000_000_000,
      );
      expect(mission.date).toBe(toDateString(1_700_000_000_000));
      expect(mission.questionIds.length).toBe(3);
      expect(mission.completed).toEqual([]);
    });

    it('returns the existing mission on subsequent calls same day', () => {
      const candidates = ['a', 'b', 'c', 'd', 'e'];
      const first = useProgressStore.getState().ensureDailyMission(candidates, 3, 1_700_000_000_000);
      const second = useProgressStore.getState().ensureDailyMission(candidates, 3, 1_700_000_000_000 + 60_000);
      expect(second.questionIds).toEqual(first.questionIds);
      expect(second.date).toBe(first.date);
    });

    it('regenerates on a new day', () => {
      const candidates = ['a', 'b', 'c', 'd', 'e'];
      const day1 = useProgressStore.getState().ensureDailyMission(candidates, 3, 1_700_000_000_000);
      const day2 = useProgressStore.getState().ensureDailyMission(candidates, 3, 1_700_000_000_000 + MS_PER_DAY);
      expect(day2.date).not.toBe(day1.date);
    });

    it('returns empty mission when candidates is empty', () => {
      const mission = useProgressStore.getState().ensureDailyMission([], 3, 1_700_000_000_000);
      expect(mission.questionIds).toEqual([]);
    });

    it('caps mission size when fewer candidates than limit', () => {
      const mission = useProgressStore.getState().ensureDailyMission(['a', 'b'], 5, 1_700_000_000_000);
      expect(mission.questionIds.length).toBe(2);
    });

    it('marks completed slugs after recordAnswer', () => {
      const candidates = ['a', 'b', 'c'];
      useProgressStore.getState().ensureDailyMission(candidates, 3, 1_700_000_000_000);
      useProgressStore.getState().recordAnswer('a', ['A'], true, 1_700_000_000_000);
      const mission = useProgressStore.getState().dailyMission;
      expect(mission.completed).toContain('a');
    });

    it('does not add duplicates to completed', () => {
      const candidates = ['a', 'b', 'c'];
      useProgressStore.getState().ensureDailyMission(candidates, 3, 1_700_000_000_000);
      useProgressStore.getState().recordAnswer('a', ['A'], true, 1_700_000_000_000);
      useProgressStore.getState().recordAnswer('a', ['A'], true, 1_700_000_000_000 + 60_000);
      const mission = useProgressStore.getState().dailyMission;
      expect(mission.completed.filter((s) => s === 'a').length).toBe(1);
    });

    it('only marks completed when slug is in mission', () => {
      const candidates = ['a', 'b', 'c'];
      useProgressStore.getState().ensureDailyMission(candidates, 3, 1_700_000_000_000);
      useProgressStore.getState().recordAnswer('z', ['A'], true, 1_700_000_000_000);
      const mission = useProgressStore.getState().dailyMission;
      expect(mission.completed).not.toContain('z');
    });
  });

  describe('getDailyMission lazy selector', () => {
    it('returns the current mission without regenerating', () => {
      const mission = useProgressStore.getState().getDailyMission();
      expect(mission).toEqual({ date: '', questionIds: [], completed: [] });
    });
  });
});

function toDateString(ms: number): string {
  const d = new Date(ms);
  const y = d.getUTCFullYear();
  const m = String(d.getUTCMonth() + 1).padStart(2, '0');
  const day = String(d.getUTCDate()).padStart(2, '0');
  return `${y}-${m}-${day}`;
}
