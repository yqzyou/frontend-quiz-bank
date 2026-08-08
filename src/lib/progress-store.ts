import { create } from 'zustand';
import { persist, createJSONStorage } from 'zustand/middleware';
import type { StateStorage } from 'zustand/middleware';
import { calculateSm2, DEFAULT_SM2_STATE, MS_PER_DAY } from './sm2';
import type { Sm2Rating, Sm2State } from './types';

export interface AnswerRecord {
  picked: string[];
  correct: boolean;
  at: number;
  attempts: number;
}

export interface StreakState {
  current: number;
  lastStudyDate: string;
  history: string[];
}

export interface DailyMission {
  date: string;
  questionIds: string[];
  completed: string[];
}

export interface ProgressState {
  answered: Record<string, AnswerRecord>;
  bookmarks: string[];
  sm2: Record<string, Sm2State>;
  streak: StreakState;
  dailyMission: DailyMission;
  recordAnswer: (slug: string, picked: string[], correct: boolean, ratedAt?: number) => void;
  toggleBookmark: (slug: string) => void;
  recordRating: (slug: string, rating: Sm2Rating, ratedAt?: number) => void;
  reset: () => void;
  ensureDailyMission: (candidates: string[], limit: number, now?: number) => DailyMission;
  getDailyMission: () => DailyMission;
  getAnswer: (slug: string) => AnswerRecord | undefined;
  getSm2Entry: (slug: string) => Sm2State | undefined;
  getAnsweredCount: () => number;
  getCorrectCount: () => number;
  getDueSlugs: (now?: number) => string[];
  getMasteredCount: () => number;
  getStats: (now?: number) => ProgressStats;
}

export interface ProgressStats {
  answered: number;
  correct: number;
  bookmarks: number;
  due: number;
  mastered: number;
  learning: number;
  streak: number;
  missionDone: number;
  missionTotal: number;
}

const MASTERY_REPETITION = 3;

const initialStreak: StreakState = {
  current: 0,
  lastStudyDate: '',
  history: [],
};

const initialMission: DailyMission = {
  date: '',
  questionIds: [],
  completed: [],
};

const initialState = {
  answered: {} as Record<string, AnswerRecord>,
  bookmarks: [] as string[],
  sm2: {} as Record<string, Sm2State>,
  streak: initialStreak,
  dailyMission: initialMission,
};

const noopStorage: StateStorage = {
  getItem: () => null,
  setItem: () => {},
  removeItem: () => {},
};

function resolveStorage(): StateStorage {
  if (typeof globalThis === 'undefined') return noopStorage;
  const ls = (globalThis as unknown as { localStorage?: unknown }).localStorage;
  if (
    ls &&
    typeof ls === 'object' &&
    typeof (ls as { getItem?: unknown }).getItem === 'function' &&
    typeof (ls as { setItem?: unknown }).setItem === 'function' &&
    typeof (ls as { removeItem?: unknown }).removeItem === 'function'
  ) {
    return ls as StateStorage;
  }
  return noopStorage;
}

/**
 * Format an epoch-ms timestamp as a UTC YYYY-MM-DD string.
 * Using UTC keeps the streak day-boundary deterministic across timezones
 * and matches the test fixture.
 */
export function toDateString(ms: number): string {
  const d = new Date(ms);
  const y = d.getUTCFullYear();
  const m = String(d.getUTCMonth() + 1).padStart(2, '0');
  const day = String(d.getUTCDate()).padStart(2, '0');
  return `${y}-${m}-${day}`;
}

/**
 * Whole calendar days between two YYYY-MM-DD strings (b - a).
 * Positive when b is later than a.
 */
function daysBetween(a: string, b: string): number {
  const parse = (s: string): number =>
    Date.UTC(+s.slice(0, 4), +s.slice(5, 7) - 1, +s.slice(8, 10));
  return Math.round((parse(b) - parse(a)) / MS_PER_DAY);
}

/**
 * Compute the next streak state given a study event on `todayKey`.
 * Same-day events do not double-count; a gap > 1 day resets to 1.
 */
function computeStreak(prev: StreakState, todayKey: string): StreakState {
  if (prev.lastStudyDate === todayKey) return prev;

  const history = prev.history.includes(todayKey)
    ? prev.history
    : [...prev.history, todayKey];

  if (prev.lastStudyDate === '') {
    return { current: 1, lastStudyDate: todayKey, history };
  }

  const gap = daysBetween(prev.lastStudyDate, todayKey);
  if (gap === 1) {
    return { current: prev.current + 1, lastStudyDate: todayKey, history };
  }
  return { current: 1, lastStudyDate: todayKey, history };
}

/**
 * Deterministic 32-bit hash of a seed string (FNV-1a variant).
 * Used to seed per-day mission shuffling so the same day always
 * produces the same mission for a given candidate list.
 */
function hashSeed(str: string): number {
  let h = 2166136261;
  for (let i = 0; i < str.length; i++) {
    h ^= str.charCodeAt(i);
    h = Math.imul(h, 16777619);
  }
  return h >>> 0;
}

/**
 * Pick `limit` items from `candidates` using a seeded Fisher-Yates shuffle.
 * - When candidates.length <= limit, returns all candidates (no shuffle needed).
 * - The same seed always produces the same selection, so per-day missions are stable.
 */
function pickMission(candidates: string[], limit: number, seedStr: string): string[] {
  if (candidates.length <= limit) return [...candidates];
  const arr = [...candidates];
  let seed = hashSeed(seedStr);
  for (let i = arr.length - 1; i > 0; i--) {
    seed = (Math.imul(seed, 1664525) + 1013904223) >>> 0;
    const j = seed % (i + 1);
    [arr[i], arr[j]] = [arr[j], arr[i]];
  }
  return arr.slice(0, limit);
}

export const useProgressStore = create<ProgressState>()(
  persist(
    (set, get) => ({
      ...initialState,

      recordAnswer: (slug, picked, correct, ratedAt = Date.now()) =>
        set((state) => {
          const prev = state.answered[slug];
          const rec: AnswerRecord = {
            picked,
            correct,
            at: ratedAt,
            attempts: prev ? prev.attempts + 1 : 1,
          };
          const todayKey = toDateString(ratedAt);
          const streak = computeStreak(state.streak, todayKey);

          const mission = state.dailyMission;
          const inMission =
            mission.date === todayKey &&
            mission.questionIds.includes(slug) &&
            !mission.completed.includes(slug);
          const dailyMission = inMission
            ? { ...mission, completed: [...mission.completed, slug] }
            : mission;

          return {
            answered: { ...state.answered, [slug]: rec },
            streak,
            dailyMission,
          };
        }),

      toggleBookmark: (slug) =>
        set((state) => ({
          bookmarks: state.bookmarks.includes(slug)
            ? state.bookmarks.filter((b) => b !== slug)
            : [...state.bookmarks, slug],
        })),

      recordRating: (slug, rating, ratedAt = Date.now()) =>
        set((state) => {
          const prev = state.sm2[slug] ?? DEFAULT_SM2_STATE;
          const next = calculateSm2(prev, rating, ratedAt);
          const todayKey = toDateString(ratedAt);
          const streak = computeStreak(state.streak, todayKey);
          return {
            sm2: { ...state.sm2, [slug]: next },
            streak,
          };
        }),

      reset: () => set({ ...initialState }),

      ensureDailyMission: (candidates, limit, now = Date.now()) => {
        const todayKey = toDateString(now);
        const prev = get().dailyMission;
        if (prev.date === todayKey) return prev;

        const mission: DailyMission = {
          date: todayKey,
          questionIds: pickMission(candidates, limit, todayKey),
          completed: [],
        };
        set({ dailyMission: mission });
        return mission;
      },

      getDailyMission: () => get().dailyMission,

      getAnswer: (slug) => get().answered[slug],

      getSm2Entry: (slug) => get().sm2[slug],

      getAnsweredCount: () => Object.keys(get().answered).length,

      getCorrectCount: () =>
        Object.values(get().answered).filter((r) => r.correct).length,

      getDueSlugs: (now: number = Date.now()) =>
        Object.entries(get().sm2)
          .filter(([, state]) => state.dueAt <= now)
          .map(([slug]) => slug),

      getMasteredCount: () =>
        Object.values(get().sm2).filter((s) => s.repetition >= MASTERY_REPETITION).length,

      getStats: (now: number = Date.now()): ProgressStats => {
        const state = get();
        const sm2Entries = Object.values(state.sm2);
        const mastered = sm2Entries.filter((s) => s.repetition >= MASTERY_REPETITION).length;
        const learning = sm2Entries.length - mastered;
        const due = sm2Entries.filter((s) => s.dueAt <= now).length;
        return {
          answered: Object.keys(state.answered).length,
          correct: Object.values(state.answered).filter((r) => r.correct).length,
          bookmarks: state.bookmarks.length,
          due,
          mastered,
          learning,
          streak: state.streak.current,
          missionDone: state.dailyMission.completed.length,
          missionTotal: state.dailyMission.questionIds.length,
        };
      },
    }),
    {
      name: 'frontend-quiz-bank/progress',
      version: 2,
      storage: createJSONStorage(resolveStorage),
      partialize: ({ answered, bookmarks, sm2, streak, dailyMission }) => ({
        answered,
        bookmarks,
        sm2,
        streak,
        dailyMission,
      }),
    },
  ),
);
