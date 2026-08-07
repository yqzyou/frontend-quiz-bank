import { create } from 'zustand';
import { persist, createJSONStorage } from 'zustand/middleware';
import type { StateStorage } from 'zustand/middleware';

export interface AnswerRecord {
  picked: string[];
  correct: boolean;
  at: number;
  attempts: number;
}

export interface ProgressState {
  answered: Record<string, AnswerRecord>;
  bookmarks: string[];
  recordAnswer: (slug: string, picked: string[], correct: boolean) => void;
  toggleBookmark: (slug: string) => void;
  reset: () => void;
  getAnswer: (slug: string) => AnswerRecord | undefined;
  getAnsweredCount: () => number;
  getCorrectCount: () => number;
}

const initialState = {
  answered: {} as Record<string, AnswerRecord>,
  bookmarks: [] as string[],
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

      reset: () => set({ ...initialState }),

      getAnswer: (slug) => get().answered[slug],

      getAnsweredCount: () => Object.keys(get().answered).length,

      getCorrectCount: () =>
        Object.values(get().answered).filter((r) => r.correct).length,
    }),
    {
      name: 'frontend-quiz-bank/progress',
      version: 1,
      storage: createJSONStorage(resolveStorage),
      partialize: ({ answered, bookmarks }) => ({ answered, bookmarks }),
    },
  ),
);

