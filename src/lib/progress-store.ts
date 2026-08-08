import { create } from 'zustand';
import { persist, createJSONStorage } from 'zustand/middleware';
import type { StateStorage } from 'zustand/middleware';
import { calculateSm2, DEFAULT_SM2_STATE } from './sm2';
import type { Sm2Rating, Sm2State } from './types';

export interface AnswerRecord {
  picked: string[];
  correct: boolean;
  at: number;
  attempts: number;
}

export interface ProgressState {
  answered: Record<string, AnswerRecord>;
  bookmarks: string[];
  sm2: Record<string, Sm2State>;
  recordAnswer: (slug: string, picked: string[], correct: boolean) => void;
  toggleBookmark: (slug: string) => void;
  recordRating: (slug: string, rating: Sm2Rating, ratedAt?: number) => void;
  reset: () => void;
  getAnswer: (slug: string) => AnswerRecord | undefined;
  getSm2Entry: (slug: string) => Sm2State | undefined;
  getAnsweredCount: () => number;
  getCorrectCount: () => number;
  getDueSlugs: (now?: number) => string[];
}

const initialState = {
  answered: {} as Record<string, AnswerRecord>,
  bookmarks: [] as string[],
  sm2: {} as Record<string, Sm2State>,
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

export const useProgressStore = create<ProgressState>()(
  persist(
    (set, get) => ({
      ...initialState,

      recordAnswer: (slug, picked, correct) =>
        set((state) => {
          const prev = state.answered[slug];
          const next: AnswerRecord = {
            picked,
            correct,
            at: Date.now(),
            attempts: prev ? prev.attempts + 1 : 1,
          };
          return {
            answered: { ...state.answered, [slug]: next },
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
          return {
            sm2: { ...state.sm2, [slug]: next },
          };
        }),

      reset: () => set({ ...initialState }),

      getAnswer: (slug) => get().answered[slug],

      getSm2Entry: (slug) => get().sm2[slug],

      getAnsweredCount: () => Object.keys(get().answered).length,

      getCorrectCount: () =>
        Object.values(get().answered).filter((r) => r.correct).length,

      getDueSlugs: (now: number = Date.now()) =>
        Object.entries(get().sm2)
          .filter(([, state]) => state.dueAt <= now)
          .map(([slug]) => slug),
    }),
    {
      name: 'frontend-quiz-bank/progress',
      version: 1,
      storage: createJSONStorage(resolveStorage),
      partialize: ({ answered, bookmarks, sm2 }) => ({ answered, bookmarks, sm2 }),
    },
  ),
);
