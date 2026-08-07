import { useEffect, useMemo, useState } from 'react';
import type { ParsedQuestion, ChoiceOption } from '@lib/types';
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

export function QuizCard({ question, slug }: QuizCardProps) {
  const isChoice = question.frontmatter.type === 'choice' || question.frontmatter.type === 'multi-choice';
  const isMulti = question.frontmatter.type === 'multi-choice';

  const recorded = useProgressStore((s) => s.answered[slug]);
  const bookmarks = useProgressStore((s) => s.bookmarks);
  const recordAnswer = useProgressStore((s) => s.recordAnswer);
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
    </article>
  );
}

export default QuizCard;
