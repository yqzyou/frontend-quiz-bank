import { describe, it, expect, beforeEach } from 'vitest';
import { useProgressStore } from '@lib/progress-store';

const SLUG = 'frontend/w1-react-basics/q01-usestate-closure';

describe('useProgressStore', () => {
  beforeEach(() => {
    useProgressStore.getState().reset();
  });

  it('starts empty', () => {
    const state = useProgressStore.getState();
    expect(state.answered).toEqual({});
    expect(state.bookmarks).toEqual([]);
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

  it('reset clears both maps', () => {
    useProgressStore.getState().recordAnswer(SLUG, ['A'], true);
    useProgressStore.getState().toggleBookmark(SLUG);
    useProgressStore.getState().reset();
    const state = useProgressStore.getState();
    expect(state.answered).toEqual({});
    expect(state.bookmarks).toEqual([]);
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
});
