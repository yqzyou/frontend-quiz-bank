// @vitest-environment happy-dom
import { describe, it, expect, beforeEach } from 'vitest';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { QuizCard } from '@islands/QuizCard';
import { useProgressStore } from '@lib/progress-store';
import type { ParsedQuestion } from '@lib/types';

const SLUG = 'frontend/w1-react-basics/q01-usestate-closure';

function buildQuestion(overrides: Partial<ParsedQuestion & { type: 'choice' | 'multi-choice' | 'interview' }> = {}): ParsedQuestion {
  const base: ParsedQuestion = {
    slug: SLUG,
    frontmatter: {
      id: 'fe-w1-q01',
      title: 'useState closure',
      category: 'frontend',
      sub_category: 'react-basics',
      week: 1,
      difficulty: 'intermediate',
      type: 'choice',
      tags: ['react'],
      source: 'handwritten',
      status: 'reviewed',
      reviewer: 'yasser',
      language: 'zh',
      last_updated: '2026-08-07',
    },
    question: '点击三次后 count 是多少？',
    options: [
      { key: 'A', text: '3', correct: true },
      { key: 'B', text: '1', correct: false },
      { key: 'C', text: '0', correct: false },
      { key: 'D', text: '报错', correct: false },
    ],
    explanation: '闭包陷阱：三次 setCount 都用同一个 count。',
  };
  if (overrides.options !== undefined) base.options = overrides.options;
  if (overrides.question !== undefined) base.question = overrides.question;
  if (overrides.explanation !== undefined) base.explanation = overrides.explanation;
  if (overrides.frontmatter) {
    base.frontmatter = { ...base.frontmatter, ...overrides.frontmatter };
  }
  return base;
}

describe('<QuizCard />', () => {
  beforeEach(() => {
    useProgressStore.getState().reset();
  });

  it('renders the question title and all options', () => {
    render(<QuizCard question={buildQuestion()} slug={SLUG} />);
    expect(screen.getByRole('heading', { level: 2 }).textContent).toMatch(/useState closure/);
    expect(screen.getByText('点击三次后 count 是多少？')).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /^A\b/ })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /^B\b/ })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /^C\b/ })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /^D\b/ })).toBeInTheDocument();
  });

  it('selects a single option and submits a correct answer', async () => {
    const user = userEvent.setup();
    render(<QuizCard question={buildQuestion()} slug={SLUG} />);
    await user.click(screen.getByRole('button', { name: /^A\b/ }));
    await user.click(screen.getByRole('button', { name: /提交/i }));

    expect(screen.getByText(/正确/i)).toBeInTheDocument();
    expect(screen.getByText('闭包陷阱：三次 setCount 都用同一个 count。')).toBeInTheDocument();
    const rec = useProgressStore.getState().answered[SLUG];
    expect(rec?.correct).toBe(true);
    expect(rec?.picked).toEqual(['A']);
  });

  it('shows wrong feedback and records wrong answer', async () => {
    const user = userEvent.setup();
    render(<QuizCard question={buildQuestion()} slug={SLUG} />);
    await user.click(screen.getByRole('button', { name: /^B\b/ }));
    await user.click(screen.getByRole('button', { name: /提交/i }));

    expect(screen.getByText(/没答对|错误|不正确/i)).toBeInTheDocument();
    const rec = useProgressStore.getState().answered[SLUG];
    expect(rec?.correct).toBe(false);
    expect(rec?.picked).toEqual(['B']);
  });

  it('requires at least one selection before submit', async () => {
    const user = userEvent.setup();
    render(<QuizCard question={buildQuestion()} slug={SLUG} />);
    await user.click(screen.getByRole('button', { name: /提交/i }));

    expect(useProgressStore.getState().answered[SLUG]).toBeUndefined();
  });

  it('multi-choice allows toggling multiple selections', async () => {
    const user = userEvent.setup();
    const multi = buildQuestion({
      frontmatter: {
        id: 'fe-w1-q-multi',
        title: 'multi',
        category: 'frontend',
        sub_category: 'react-basics',
        week: 1,
        difficulty: 'basic',
        type: 'multi-choice',
        tags: ['react'],
        source: 'handwritten',
        status: 'reviewed',
        reviewer: 'yasser',
        language: 'zh',
        last_updated: '2026-08-07',
      },
      options: [
        { key: 'A', text: 'a', correct: true },
        { key: 'B', text: 'b', correct: true },
        { key: 'C', text: 'c', correct: false },
        { key: 'D', text: 'd', correct: false },
      ],
    });
    render(<QuizCard question={multi} slug={SLUG} />);

    await user.click(screen.getByRole('button', { name: /^A\b/ }));
    await user.click(screen.getByRole('button', { name: /^B\b/ }));
    await user.click(screen.getByRole('button', { name: /^A\b/ }));
    await user.click(screen.getByRole('button', { name: /提交/i }));

    expect(screen.getByText(/正确/i)).toBeInTheDocument();
    expect(useProgressStore.getState().answered[SLUG]?.picked).toEqual(['B']);
  });

  it('resets selection when reset button clicked (before submit)', async () => {
    const user = userEvent.setup();
    render(<QuizCard question={buildQuestion()} slug={SLUG} />);
    await user.click(screen.getByRole('button', { name: /^B\b/ }));
    await user.click(screen.getByRole('button', { name: /重置/i }));
    await user.click(screen.getByRole('button', { name: /提交/i }));

    expect(useProgressStore.getState().answered[SLUG]).toBeUndefined();
  });

  it('toggles bookmark and reflects store state', async () => {
    const user = userEvent.setup();
    render(<QuizCard question={buildQuestion()} slug={SLUG} />);
    await user.click(screen.getByRole('button', { name: /收藏/i }));
    expect(useProgressStore.getState().bookmarks).toContain(SLUG);
    await user.click(screen.getByRole('button', { name: /取消收藏/i }));
    expect(useProgressStore.getState().bookmarks).not.toContain(SLUG);
  });

  it('renders interview question without options or submit button', () => {
    const interview = buildQuestion({});
    interview.frontmatter.type = 'interview';
    interview.options = [];
    render(<QuizCard question={interview} slug={SLUG} />);
    expect(screen.queryByRole('button', { name: /提交/i })).toBeNull();
    expect(screen.getByText('useState closure')).toBeInTheDocument();
  });

  it('renders reference answer when provided on interview question', () => {
    const interview = buildQuestion({});
    interview.frontmatter.type = 'interview';
    interview.options = [];
    interview.referenceAnswer = '参考答案：使用 prev 形式';
    render(<QuizCard question={interview} slug={SLUG} />);
    expect(screen.getAllByText(/参考答案/).length).toBeGreaterThan(0);
    expect(screen.getByText(/使用 prev 形式/)).toBeInTheDocument();
  });

  it('preserves previously-recorded answer across remounts (rehydration)', async () => {
    useProgressStore.getState().recordAnswer(SLUG, ['A'], true);
    const { unmount } = render(<QuizCard question={buildQuestion()} slug={SLUG} />);
    expect(screen.getByText(/正确/i)).toBeInTheDocument();
    unmount();
    render(<QuizCard question={buildQuestion()} slug={SLUG} />);
    expect(screen.getByText(/正确/i)).toBeInTheDocument();
  });

  describe('SM-2 self-rating', () => {
    it('shows rating buttons after submitting a choice question', async () => {
      const user = userEvent.setup();
      render(<QuizCard question={buildQuestion()} slug={SLUG} />);
      await user.click(screen.getByRole('button', { name: /^A\b/ }));
      await user.click(screen.getByRole('button', { name: /提交/i }));

      expect(screen.getByRole('button', { name: /忘了|Again/i })).toBeInTheDocument();
      expect(screen.getByRole('button', { name: /勉强|Hard/i })).toBeInTheDocument();
      expect(screen.getByRole('button', { name: /记得|Good/i })).toBeInTheDocument();
      expect(screen.getByRole('button', { name: /轻松|Easy/i })).toBeInTheDocument();
    });

    it('does not show rating buttons before submit on choice questions', () => {
      render(<QuizCard question={buildQuestion()} slug={SLUG} />);
      expect(screen.queryByRole('button', { name: /忘了|Again/i })).toBeNull();
    });

    it('records SM-2 rating in the store when clicked', async () => {
      const user = userEvent.setup();
      render(<QuizCard question={buildQuestion()} slug={SLUG} />);
      await user.click(screen.getByRole('button', { name: /^A\b/ }));
      await user.click(screen.getByRole('button', { name: /提交/i }));
      await user.click(screen.getByRole('button', { name: /记得|Good/i }));

      const entry = useProgressStore.getState().sm2[SLUG];
      expect(entry).toBeDefined();
      expect(entry!.repetition).toBe(1);
      expect(entry!.interval).toBe(1);
    });

    it('shows next-review hint after rating', async () => {
      const user = userEvent.setup();
      render(<QuizCard question={buildQuestion()} slug={SLUG} />);
      await user.click(screen.getByRole('button', { name: /^A\b/ }));
      await user.click(screen.getByRole('button', { name: /提交/i }));
      await user.click(screen.getByRole('button', { name: /记得|Good/i }));

      expect(screen.getByText(/下次复习|明日/i)).toBeInTheDocument();
    });

    it('shows rating buttons immediately for interview questions', () => {
      const interview = buildQuestion({});
      interview.frontmatter.type = 'interview';
      interview.options = [];
      render(<QuizCard question={interview} slug={SLUG} />);
      expect(screen.getByRole('button', { name: /记得|Good/i })).toBeInTheDocument();
    });

    it('updates the rating when a different rating is clicked later', async () => {
      const user = userEvent.setup();
      render(<QuizCard question={buildQuestion()} slug={SLUG} />);
      await user.click(screen.getByRole('button', { name: /^A\b/ }));
      await user.click(screen.getByRole('button', { name: /提交/i }));
      await user.click(screen.getByRole('button', { name: /记得|Good/i }));
      await user.click(screen.getByRole('button', { name: /轻松|Easy/i }));

      const entry = useProgressStore.getState().sm2[SLUG];
      // good: rep 1, easy: rep 2 (since good already moved it forward)
      // Actually after good, entry.repetition = 1; after easy, entry.repetition = 2
      expect(entry!.repetition).toBe(2);
    });
  });
});
