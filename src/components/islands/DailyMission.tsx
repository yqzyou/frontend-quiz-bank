import { useEffect, useRef } from 'react';
import { useProgressStore } from '@lib/progress-store';
import type { DailyMission as DailyMissionData } from '@lib/progress-store';

interface DailyMissionProps {
  /** Flat list of all candidate slugs (e.g. all reviewed questions). */
  allSlugs: string[];
  /** How many slugs to surface in today's mission. Default 3. */
  missionSize?: number;
  /**
   * Optional timestamp (epoch ms) used to determine the calendar day.
   * Test fixture; defaults to Date.now() at mount time.
   */
  now?: number;
}

/**
 * Daily mission island.
 *
 * On mount, calls `ensureDailyMission` to lazily generate today's mission
 * (deterministic per-day shuffle). Renders the picked slugs as links to the
 * detail page and marks completed ones. Subscribes to primitive fields to
 * stay compatible with React 19's useSyncExternalStore.
 */
export function DailyMission({ allSlugs, missionSize = 3, now }: DailyMissionProps) {
  const mission = useProgressStore((s) => s.dailyMission);
  const ensureDailyMission = useProgressStore((s) => s.ensureDailyMission);
  const nowRef = useRef<number>(now ?? Date.now());

  useEffect(() => {
    ensureDailyMission(allSlugs, missionSize, nowRef.current);
  }, [allSlugs, missionSize, ensureDailyMission]);

  const total = mission.questionIds.length;
  const done = mission.completed.length;
  const allDone = total > 0 && done === total;

  return (
    <section
      aria-label="今日任务"
      className="rounded-2xl border border-violet-200 bg-white p-5 shadow-sm dark:border-violet-800 dark:bg-slate-900"
    >
      <header className="mb-4 flex items-baseline justify-between">
        <div>
          <h2 className="text-lg font-semibold text-slate-900 dark:text-slate-100">
            今日任务
            <span className="ml-2 rounded-full bg-violet-100 px-2 py-0.5 text-xs font-medium text-violet-700 dark:bg-violet-950 dark:text-violet-300">
              每日刷新
            </span>
          </h2>
          <p className="text-xs text-slate-500 dark:text-slate-400">
            从题库中随机抽取 · 完成后日历日自动更新
          </p>
        </div>
        <div className="text-right">
          <div className="text-2xl font-bold tabular-nums text-violet-700 dark:text-violet-300">
            {done} / {total}
          </div>
          <div className="text-xs text-slate-500 dark:text-slate-400">已完成</div>
        </div>
      </header>

      {total === 0 ? (
        <p className="rounded-xl border border-dashed border-slate-300 bg-slate-50 px-4 py-6 text-center text-sm text-slate-500 dark:border-slate-700 dark:bg-slate-800 dark:text-slate-400">
          暂无题目 · 请管理员添加审校题目
        </p>
      ) : (
        <>
          {allDone && (
            <div className="mb-3 rounded-xl border border-emerald-200 bg-emerald-50 px-4 py-3 text-sm font-medium text-emerald-700 dark:border-emerald-800 dark:bg-emerald-950 dark:text-emerald-300">
              🎉 已完成今日任务，继续保持每日连胜！
            </div>
          )}
          <ul className="space-y-2">
            {mission.questionIds.map((slug) => {
              const completed = mission.completed.includes(slug);
              return (
                <li key={slug}>
                  <a
                    href={`/questions/${slug}`}
                    data-completed={completed ? 'true' : 'false'}
                    className={
                      'flex items-center justify-between rounded-xl border px-4 py-3 text-sm transition ' +
                      (completed
                        ? 'border-emerald-200 bg-emerald-50 text-emerald-700 line-through dark:border-emerald-800 dark:bg-emerald-950 dark:text-emerald-300'
                        : 'border-slate-200 bg-white text-slate-700 hover:border-violet-300 hover:bg-violet-50 dark:border-slate-700 dark:bg-slate-800 dark:text-slate-200 dark:hover:border-violet-700 dark:hover:bg-violet-950')
                    }
                  >
                    <code className="text-xs">{slug}</code>
                    <span aria-hidden="true">{completed ? '✓' : '→'}</span>
                  </a>
                </li>
              );
            })}
          </ul>
        </>
      )}
    </section>
  );
}

export default DailyMission;

/**
 * Helper type re-export for consumers that need the data shape without
 * importing from the store directly.
 */
export type { DailyMissionData };
