export type Category = 'frontend' | 'web3' | 'remote';
export type QuestionType = 'choice' | 'multi-choice' | 'interview' | 'code';
export type Difficulty = 'basic' | 'intermediate' | 'advanced';
export type Source = 'ai-generated' | 'handwritten' | 'community';
export type Status = 'reviewed' | 'draft' | 'needs-review';
export type Language = 'zh' | 'en' | 'bilingual';
export type SelfRating = 'again' | 'hard' | 'good' | 'easy';

export type Sm2Rating = SelfRating;
export interface Sm2State {
  repetition: number;
  interval: number;
  easiness: number;
  dueAt: number;
}

export interface Frontmatter {
  id: string;
  title: string;
  category: Category;
  sub_category: string;
  week: number;
  difficulty: Difficulty;
  type: QuestionType;
  tags: string[];
  source: Source;
  status: Status;
  reviewer?: string;
  language: Language;
  related?: string[];
  last_updated: string;
}

export interface ChoiceOption {
  key: string;
  text: string;
  correct: boolean;
}

export interface QuestionReference {
  text: string;
  url: string;
}

export interface ParsedQuestion {
  frontmatter: Frontmatter;
  question: string;
  options: ChoiceOption[];
  explanation: string;
  referenceAnswer?: string;
  references?: QuestionReference[];
  slug: string;
}

export interface QuestionRecord {
  questionId: string;
  type: QuestionType;
  lastAnswered: string;
  correctCount: number;
  wrongCount: number;
  selfRating?: SelfRating;
  nextReview?: string;
  timeSpentMs?: number;
}

export interface UserProgress {
  version: 1;
  walletAddress?: string;
  records: Record<string, QuestionRecord>;
  streak: {
    current: number;
    lastStudyDate: string;
    history: string[];
  };
  dailyMission: {
    date: string;
    questionIds: string[];
    completed: string[];
  };
  settings: {
    theme: 'light' | 'dark' | 'system';
    language: Language;
  };
}
