import { useMemo } from 'react';
import { useProgressStore } from '@lib/progress-store';

interface ReviewQueueProps {
  allSlugs: string[];
}

interface Bucket {
  label: string;
  hint: string;
  slugs: string[];
  accent: string;
}

const MS_PER_DAY = 24 * 60 * 60 * 1000;

function buildBuckets(allSlugs: string[], sm2: Record<string, { dueAt: number; repetition: number; interval: number }>): {
  due: string[];
  upcoming: string[];
  fresh: string[];
} {
  const now = Date.now();
  const due: string[] = [];
  const upcoming: string[] = [];
  const fresh: string[] = [];

  for (const slug of allSlugs) {
    const entry = sm2[slug];
    if (!entry) {
      fresh.push(slug);
      continue;
    }
    if (entry.dueAt <= now) {
      due.push(slug);
    } else if (entry.dueAt <= now + 7 * MS_PER_DAY) {
      upcoming.push(slug);
    }
  }
  return { due, upcoming, fresh };
}

export function ReviewQueue({ allSlugs }: ReviewQueueProps) {
  const sm2 = useProgressStore((s) => s.sm2);

  const { due, upcoming, fresh } = useMemo(() => buildBuckets(allSlugs, sm2), [allSlugs, sm2]);

  const buckets: Bucket[] = [
    {
      label: '今日待复习',
      hint: 'SM-2 算法判定为到期 · 完成后下次间隔自动延长',
      slugs: due,
      accent: 'border-rose-200 bg-rose-50 dark:border-rose-800 dark:bg-rose-950',
    },
    {
      label: '未来 7 天内',
      hint: '尚未到期，可提前预习',
      slugs: upcoming,
      accent: 'border-amber-200 bg-amber-50 dark:border-amber-800 dark:bg-amber-950',
    },
    {
      label: '未学习',
      hint: '尚未评分 · 进入详情页可建立学习记录',
      slugs: fresh,
      accent: 'border-slate-200 bg-slate-50 dark:border-slate-700 dark:bg-slate-800',
    },
  ];

  return (
    <section aria-label="复习队列" className="space-y-4">
      {buckets.map((b) => (
        <div className={`rounded-2xl border p-5 ${b.accent}`}>
          <header className="mb-3 flex items-baseline justify-between gap-4">
            <div>
              <h2 className="text-lg font-semibold text-slate-900 dark:text-slate-100">
                {b.label}
                <span className="ml-2 text-sm font-normal text-slate-500 dark:text-slate-400">
                  {b.slugs.length} 道
                </span>
              </h2>
              <p className="text-xs text-slate-500 dark:text-slate-400">{b.hint}</p>
            </div>
            {b.label === '今日待复习' && b.slugs.length > 0 && (
              <a
                href={`/questions/${b.slugs[0]}`}
                className="rounded-xl bg-rose-600 px-4 py-2 text-sm font-medium text-white shadow-sm transition hover:bg-rose-500"
              >
                开始 →
              </a>
            )}
          </header>
          {b.slugs.length === 0 ? (
            <p className="text-sm text-slate-500 dark:text-slate-400">本组暂无题目</p>
          ) : (
            <ul className="grid gap-2 sm:grid-cols-2">
              {b.slugs.slice(0, 12).map((slug) => (
                <li key={slug}>
                  <a
                    href={`/questions/${slug}`}
                    className="block rounded-xl border border-slate-200 bg-white px-3 py-2 text-sm text-slate-700 transition hover:border-indigo-300 hover:bg-indigo-50 dark:border-slate-700 dark:bg-slate-900 dark:text-slate-200 dark:hover:border-indigo-700 dark:hover:bg-indigo-950"
                  >
                    <code className="text-xs">{slug}</code>
                  </a>
                </li>
              ))}
              {b.slugs.length > 12 && (
                <li className="self-center text-xs text-slate-500 dark:text-slate-400">
                  还有 {b.slugs.length - 12} 道 …
                </li>
              )}
            </ul>
          )}
        </div>
      ))}
    </section>
  );
}

export default ReviewQueue;
