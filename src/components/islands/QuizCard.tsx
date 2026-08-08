import { useEffect, useMemo, useState } from 'react';
import type { ParsedQuestion, ChoiceOption, Sm2Rating, Sm2State } from '@lib/types';
import { useProgressStore } from '@lib/progress-store';

interface QuizCardProps {
  question: ParsedQuestion;
  slug: string;
}

function arraysEqualAsSets(a: string[], b: string[]): boolean {
  if (a.length !== b.length) return false;
  const setA = new Set(a);
  return b.every((v) => setA.has(v));
}

function optionLabel(o: ChoiceOption): string {
  return `${o.key}. ${o.text}`;
}

const RATING_LABELS: { rating: Sm2Rating; zh: string; en: string; hint: string }[] = [
  { rating: 'again', zh: '忘了', en: 'Again', hint: '今日再次复习' },
  { rating: 'hard', zh: '勉强', en: 'Hard', hint: '稍后再练' },
  { rating: 'good', zh: '记得', en: 'Good', hint: '明日再来' },
  { rating: 'easy', zh: '轻松', en: 'Easy', hint: '数日后再见' },
];

function formatDueHint(dueAt: number, now: number = Date.now()): string {
  const dayMs = 24 * 60 * 60 * 1000;
  const diff = dueAt - now;
  if (diff <= 0) return '今日再次复习';
  const days = Math.round(diff / dayMs);
  if (days === 0) return '今日稍后';
  if (days === 1) return '明日复习';
  if (days < 7) return `${days} 天后复习`;
  if (days < 30) return `${Math.round(days / 7)} 周后复习`;
  return `${Math.round(days / 30)} 个月后复习`;
}

export function QuizCard({ question, slug }: QuizCardProps) {
  const isChoice = question.frontmatter.type === 'choice' || question.frontmatter.type === 'multi-choice';
  const isMulti = question.frontmatter.type === 'multi-choice';
  const isInterview = question.frontmatter.type === 'interview' || question.frontmatter.type === 'code';

  const recorded = useProgressStore((s) => s.answered[slug]);
  const sm2Entry = useProgressStore((s) => s.sm2[slug]);
  const bookmarks = useProgressStore((s) => s.bookmarks);
  const recordAnswer = useProgressStore((s) => s.recordAnswer);
  const recordRating = useProgressStore((s) => s.recordRating);
  const toggleBookmark = useProgressStore((s) => s.toggleBookmark);

  const isBookmarked = bookmarks.includes(slug);

  const initialPicked = useMemo(() => {
    if (recorded) return new Set(recorded.picked);
    return new Set<string>();
  }, [recorded]);

  const [picked, setPicked] = useState<Set<string>>(initialPicked);
  const [submitted, setSubmitted] = useState<boolean>(!!recorded);

  useEffect(() => {
    setPicked(new Set(recorded?.picked ?? []));
    setSubmitted(!!recorded);
  }, [recorded, slug]);

  const correctKeys = useMemo(
    () => question.options.filter((o) => o.correct).map((o) => o.key),
    [question.options],
  );

  const isCorrect = useMemo(
    () => submitted && arraysEqualAsSets([...picked], correctKeys),
    [submitted, picked, correctKeys],
  );

  // Rating panel is shown when:
  //   - choice questions are submitted, OR
  //   - interview/code questions are viewed (no submit step)
  const showRating = isInterview ? true : submitted;

  function handlePick(key: string) {
    if (submitted) return;
    setPicked((prev) => {
      const next = new Set(prev);
      if (isMulti) {
        if (next.has(key)) next.delete(key);
        else next.add(key);
      } else {
        next.clear();
        next.add(key);
      }
      return next;
    });
  }

  function handleSubmit() {
    if (picked.size === 0) return;
    const correct = arraysEqualAsSets([...picked], correctKeys);
    recordAnswer(slug, [...picked], correct);
    setSubmitted(true);
  }

  function handleReset() {
    setPicked(new Set());
    setSubmitted(false);
  }

  function handleBookmark() {
    toggleBookmark(slug);
  }

  function handleRate(rating: Sm2Rating) {
    recordRating(slug, rating);
  }

  return (
    <article className="quiz-card rounded-2xl border border-slate-200 bg-white p-6 shadow-sm dark:border-slate-800 dark:bg-slate-900">
      <header className="mb-4 flex items-start justify-between gap-4">
        <div>
          <p className="text-xs uppercase tracking-wide text-slate-500">
            {question.frontmatter.category} · {question.frontmatter.sub_category} · W{question.frontmatter.week}
          </p>
          <h2 className="mt-1 text-xl font-semibold text-slate-900 dark:text-slate-100">
            {question.frontmatter.title}
          </h2>
        </div>
        <button
          type="button"
          onClick={handleBookmark}
          aria-label={isBookmarked ? '取消收藏' : '收藏'}
          className={`rounded-full px-3 py-1 text-sm transition ${
            isBookmarked
              ? 'bg-amber-100 text-amber-700 dark:bg-amber-900 dark:text-amber-200'
              : 'bg-slate-100 text-slate-600 hover:bg-slate-200 dark:bg-slate-800 dark:text-slate-300'
          }`}
        >
          {isBookmarked ? '★ 已收藏' : '☆ 收藏'}
        </button>
      </header>

      <div className="prose prose-slate mb-4 max-w-none dark:prose-invert">
        <p>{question.question}</p>
      </div>

      {isChoice && (
        <ul className="mb-4 space-y-2">
          {question.options.map((opt) => {
            const isPicked = picked.has(opt.key);
            const showAsCorrect = submitted && opt.correct;
            const showAsWrongPick = submitted && isPicked && !opt.correct;
            const cls = [
              'flex w-full items-center justify-between rounded-xl border px-4 py-2 text-left transition',
              showAsCorrect
                ? 'border-emerald-300 bg-emerald-50 text-emerald-800 dark:border-emerald-700 dark:bg-emerald-950 dark:text-emerald-200'
                : showAsWrongPick
                ? 'border-rose-300 bg-rose-50 text-rose-800 dark:border-rose-700 dark:bg-rose-950 dark:text-rose-200'
                : isPicked
                ? 'border-indigo-300 bg-indigo-50 text-indigo-800 dark:border-indigo-700 dark:bg-indigo-950 dark:text-indigo-200'
                : 'border-slate-200 bg-white text-slate-700 hover:border-slate-300 dark:border-slate-700 dark:bg-slate-800 dark:text-slate-200',
            ].join(' ');
            return (
              <li key={opt.key}>
                <button
                  type="button"
                  onClick={() => handlePick(opt.key)}
                  disabled={submitted}
                  aria-pressed={isPicked}
                  aria-label={optionLabel(opt)}
                  className={cls}
                >
                  <span>{optionLabel(opt)}</span>
                  {showAsCorrect && <span aria-hidden="true">✓</span>}
                  {showAsWrongPick && <span aria-hidden="true">×</span>}
                </button>
              </li>
            );
          })}
        </ul>
      )}

      {isChoice && (
        <div className="mb-4 flex flex-wrap gap-3">
          {!submitted ? (
            <>
              <button
                type="button"
                onClick={handleSubmit}
                disabled={picked.size === 0}
                className="rounded-xl bg-indigo-600 px-4 py-2 text-sm font-medium text-white shadow-sm disabled:cursor-not-allowed disabled:opacity-50"
              >
                提交答案
              </button>
              <button
                type="button"
                onClick={handleReset}
                className="rounded-xl border border-slate-300 px-4 py-2 text-sm font-medium text-slate-700 dark:border-slate-700 dark:text-slate-200"
              >
                重置
              </button>
            </>
          ) : (
            <div
              role="status"
              className={`rounded-xl px-4 py-2 text-sm font-medium ${
                isCorrect
                  ? 'bg-emerald-100 text-emerald-800 dark:bg-emerald-950 dark:text-emerald-200'
                  : 'bg-rose-100 text-rose-800 dark:bg-rose-950 dark:text-rose-200'
              }`}
            >
              {isCorrect ? '✓ 正确' : '✗ 不正确'} · 正确答案：{correctKeys.join(', ')}
              <button
                type="button"
                onClick={handleReset}
                className="ml-3 underline"
              >
                再试一次
              </button>
            </div>
          )}
        </div>
      )}

      {submitted && isChoice && question.explanation && (
        <details className="mt-4 rounded-xl bg-slate-50 p-4 text-sm text-slate-700 dark:bg-slate-800 dark:text-slate-200">
          <summary className="cursor-pointer font-medium">解析</summary>
          <div className="mt-2 whitespace-pre-line">{question.explanation}</div>
        </details>
      )}

      {!isChoice && question.referenceAnswer && (
        <details className="mt-4 rounded-xl bg-slate-50 p-4 text-sm text-slate-700 dark:bg-slate-800 dark:text-slate-200">
          <summary className="cursor-pointer font-medium">参考答案</summary>
          <div className="mt-2 whitespace-pre-line">{question.referenceAnswer}</div>
        </details>
      )}

      {showRating && (
        <Sm2RatingPanel
          entry={sm2Entry}
          onRate={handleRate}
        />
      )}
    </article>
  );
}

interface Sm2RatingPanelProps {
  entry?: Sm2State;
  onRate: (rating: Sm2Rating) => void;
}

function Sm2RatingPanel({ entry, onRate }: Sm2RatingPanelProps) {
  const now = Date.now();
  return (
    <section
      aria-label="自我评分"
      className="mt-6 rounded-xl border border-slate-200 bg-slate-50 p-4 dark:border-slate-700 dark:bg-slate-800"
    >
      <div className="mb-2 flex items-center justify-between">
        <h3 className="text-sm font-medium text-slate-700 dark:text-slate-200">自我评分</h3>
        {entry && (
          <p className="text-xs text-slate-500 dark:text-slate-400">
            {entry.dueAt <= now ? '到期' : '下次复习'}：{formatDueHint(entry.dueAt, now)}
          </p>
        )}
      </div>
      <div className="grid grid-cols-2 gap-2 sm:grid-cols-4">
        {RATING_LABELS.map(({ rating, zh, en, hint }) => (
          <button
            key={rating}
            type="button"
            onClick={() => onRate(rating)}
            aria-label={`${zh} (${en})`}
            title={hint}
            className="flex flex-col items-center gap-0.5 rounded-lg border border-slate-300 bg-white px-2 py-2 text-xs font-medium text-slate-700 transition hover:border-indigo-400 hover:bg-indigo-50 dark:border-slate-600 dark:bg-slate-900 dark:text-slate-200 dark:hover:border-indigo-500 dark:hover:bg-indigo-950"
          >
            <span className="text-sm font-semibold">{zh}</span>
            <span className="text-[10px] uppercase tracking-wide text-slate-500 dark:text-slate-400">{en}</span>
          </button>
        ))}
      </div>
      {entry && (
        <p className="mt-3 text-xs text-slate-500 dark:text-slate-400">
          记忆强度 EF {entry.easiness.toFixed(2)} · 连续 {entry.repetition} 次 · 间隔 {entry.interval} 天
        </p>
      )}
    </section>
  );
}

export default QuizCard;

