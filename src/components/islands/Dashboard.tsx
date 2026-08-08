import { useProgressStore } from '@lib/progress-store';

interface StatTileProps {
  label: string;
  value: number | string;
  hint?: string;
  accent?: 'indigo' | 'emerald' | 'amber' | 'rose' | 'slate' | 'violet';
}

const ACCENT_CLASSES: Record<NonNullable<StatTileProps['accent']>, string> = {
  indigo: 'border-indigo-200 bg-indigo-50 text-indigo-700 dark:border-indigo-800 dark:bg-indigo-950 dark:text-indigo-300',
  emerald: 'border-emerald-200 bg-emerald-50 text-emerald-700 dark:border-emerald-800 dark:bg-emerald-950 dark:text-emerald-300',
  amber: 'border-amber-200 bg-amber-50 text-amber-700 dark:border-amber-800 dark:bg-amber-950 dark:text-amber-300',
  rose: 'border-rose-200 bg-rose-50 text-rose-700 dark:border-rose-800 dark:bg-rose-950 dark:text-rose-300',
  slate: 'border-slate-200 bg-slate-50 text-slate-700 dark:border-slate-700 dark:bg-slate-800 dark:text-slate-300',
  violet: 'border-violet-200 bg-violet-50 text-violet-700 dark:border-violet-800 dark:bg-violet-950 dark:text-violet-300',
};

function StatTile({ label, value, hint, accent = 'slate' }: StatTileProps) {
  return (
    <div className={`rounded-xl border p-4 ${ACCENT_CLASSES[accent]}`}>
      <div className="text-xs font-medium uppercase tracking-wide opacity-70">{label}</div>
      <div className="mt-1 text-2xl font-bold tabular-nums">{value}</div>
      {hint && <div className="mt-0.5 text-xs opacity-70">{hint}</div>}
    </div>
  );
}

export function Dashboard() {
  // Subscribe to primitive values individually to avoid new-object-selector
  // infinite re-render loops with React 19's useSyncExternalStore.
  const answered = useProgressStore((s) => Object.keys(s.answered).length);
  const correct = useProgressStore((s) => Object.values(s.answered).filter((r) => r.correct).length);
  const bookmarks = useProgressStore((s) => s.bookmarks.length);
  const due = useProgressStore((s) => {
    const now = Date.now();
    return Object.values(s.sm2).filter((entry) => entry.dueAt <= now).length;
  });
  const mastered = useProgressStore((s) =>
    Object.values(s.sm2).filter((entry) => entry.repetition >= 3).length,
  );
  const learning = useProgressStore((s) => {
    const total = Object.keys(s.sm2).length;
    const masteredCount = Object.values(s.sm2).filter((entry) => entry.repetition >= 3).length;
    return total - masteredCount;
  });
  const streak = useProgressStore((s) => s.streak.current);

  const stats = { answered, correct, bookmarks, due, mastered, learning, streak };
  const accuracy = stats.answered === 0 ? null : Math.round((stats.correct / stats.answered) * 100);
  const streakHint = stats.streak === 0 ? '今日开始连胜' : `已坚持 ${stats.streak} 天`;

  return (
    <section
      aria-label="学习概览"
      className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm dark:border-slate-800 dark:bg-slate-900"
    >
      <div className="mb-4 flex items-center justify-between">
        <div>
          <h2 className="text-lg font-semibold text-slate-900 dark:text-slate-100">学习概览</h2>
          <p className="text-xs text-slate-500 dark:text-slate-400">
            本地保存 · 不上传 · 可在 <a href="/review" className="underline">复习中心</a> 开始今日练习
          </p>
        </div>
        <a
          href="/review"
          className="rounded-xl bg-indigo-600 px-4 py-2 text-sm font-medium text-white shadow-sm transition hover:bg-indigo-500"
        >
          开始复习 →
        </a>
      </div>

      <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-4 xl:grid-cols-7">
        <StatTile
          label="今日待复习"
          value={stats.due}
          hint={stats.due === 0 ? '暂无到期' : '建议今日完成'}
          accent={stats.due > 0 ? 'rose' : 'slate'}
        />
        <StatTile
          label="已答"
          value={stats.answered}
          hint={accuracy === null ? '—' : `正确率 ${accuracy}%`}
          accent="indigo"
        />
        <StatTile
          label="已掌握"
          value={stats.mastered}
          hint="连续 3 次正确"
          accent="emerald"
        />
        <StatTile
          label="学习中"
          value={stats.learning}
          hint="尚未达掌握线"
          accent="amber"
        />
        <StatTile
          label="连续学习"
          value={stats.streak}
          hint={streakHint}
          accent="violet"
        />
        <StatTile
          label="收藏"
          value={stats.bookmarks}
          hint="待回看"
          accent="slate"
        />
        <StatTile
          label="正确率"
          value={accuracy === null ? '—' : `${accuracy}%`}
          hint={`${stats.correct}/${stats.answered}`}
          accent="emerald"
        />
      </div>
    </section>
  );
}

export default Dashboard;
