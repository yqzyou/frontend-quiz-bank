import { useEffect, useMemo, useState, useDeferredValue } from 'react';

export interface ExplorerQuestion {
  slug: string;
  title: string;
  question: string;
  category: 'frontend' | 'web3' | 'remote';
  sub_category: string;
  week: number;
  status: 'reviewed' | 'draft' | 'needs-review';
  difficulty: 'basic' | 'intermediate' | 'advanced';
  type: 'choice' | 'multi-choice' | 'interview' | 'code';
  tags: string[];
}

interface QuestionExplorerProps {
  questions: ExplorerQuestion[];
  initialCategory?: string;
  initialStatus?: string;
  initialWeek?: string;
  initialSearch?: string;
}

const CATEGORY_TABS = [
  { id: 'all', label: '全部' },
  { id: 'frontend', label: '前端' },
  { id: 'web3', label: 'Web3' },
  { id: 'remote', label: '远程' },
] as const;

const STATUS_OPTIONS = [
  { id: 'all', label: '全部状态' },
  { id: 'reviewed', label: '已审校' },
  { id: 'draft', label: '草稿' },
  { id: 'needs-review', label: '待审校' },
] as const;

const TYPE_LABEL: Record<ExplorerQuestion['type'], string> = {
  choice: '单选',
  'multi-choice': '多选',
  interview: '简答',
  code: '代码',
};

const STATUS_STYLE: Record<ExplorerQuestion['status'], string> = {
  reviewed: 'bg-emerald-100 text-emerald-700 dark:bg-emerald-950 dark:text-emerald-300',
  draft: 'bg-amber-100 text-amber-700 dark:bg-amber-950 dark:text-amber-300',
  'needs-review': 'bg-rose-100 text-rose-700 dark:bg-rose-950 dark:text-rose-300',
};

const CATEGORY_STYLE: Record<ExplorerQuestion['category'], string> = {
  frontend: 'bg-indigo-100 text-indigo-700 dark:bg-indigo-950 dark:text-indigo-300',
  web3: 'bg-violet-100 text-violet-700 dark:bg-violet-950 dark:text-violet-300',
  remote: 'bg-emerald-100 text-emerald-700 dark:bg-emerald-950 dark:text-emerald-300',
};

export function QuestionExplorer({
  questions,
  initialCategory = 'all',
  initialStatus = 'all',
  initialWeek = 'all',
  initialSearch = '',
}: QuestionExplorerProps) {
  const [category, setCategory] = useState(initialCategory);
  const [status, setStatus] = useState(initialStatus);
  const [week, setWeek] = useState(initialWeek);
  const [rawSearch, setRawSearch] = useState(initialSearch);
  const search = useDeferredValue(rawSearch.trim().toLowerCase());

  const weeks = useMemo(() => {
    const set = new Set(questions.map((q) => q.week));
    return [...set].sort((a, b) => a - b);
  }, [questions]);

  const filtered = useMemo(() => {
    return questions.filter((q) => {
      if (category !== 'all' && q.category !== category) return false;
      if (status !== 'all' && q.status !== status) return false;
      if (week !== 'all' && String(q.week) !== week) return false;
      if (search) {
        const haystack =
          `${q.title} ${q.question} ${q.sub_category} ${q.tags.join(' ')}`.toLowerCase();
        if (!haystack.includes(search)) return false;
      }
      return true;
    });
  }, [questions, category, status, week, search]);

  // 同步 URL query 参数（无刷新）— 蕾姆希望用户能复制/分享当前筛选状态
  useEffect(() => {
    if (typeof window === 'undefined') return;
    const params = new URLSearchParams();
    if (category !== 'all') params.set('category', category);
    if (status !== 'all') params.set('status', status);
    if (week !== 'all') params.set('week', week);
    if (search) params.set('q', search);
    const qs = params.toString();
    const nextUrl = qs ? `${window.location.pathname}?${qs}` : window.location.pathname;
    window.history.replaceState(null, '', nextUrl);
  }, [category, status, week, search]);

  const hasActiveFilter = category !== 'all' || status !== 'all' || week !== 'all' || search !== '';

  function handleReset() {
    setCategory('all');
    setStatus('all');
    setWeek('all');
    setRawSearch('');
  }

  return (
    <section aria-label="题目浏览" className="space-y-5">
      <div className="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm dark:border-slate-800 dark:bg-slate-900">
        <nav aria-label="分类" className="mb-4 flex flex-wrap items-center gap-1 rounded-xl bg-slate-100 p-1 text-sm dark:bg-slate-800">
          {CATEGORY_TABS.map((tab) => {
            const isActive = category === tab.id;
            return (
              <button
                key={tab.id}
                type="button"
                onClick={() => setCategory(tab.id)}
                aria-pressed={isActive}
                className={`inline-flex items-center rounded-lg px-4 py-1.5 font-medium transition ${
                  isActive
                    ? 'bg-white text-indigo-600 shadow-sm dark:bg-slate-900 dark:text-indigo-400'
                    : 'text-slate-600 hover:text-slate-900 dark:text-slate-300 dark:hover:text-white'
                }`}
              >
                {tab.label}
                <span className={`ml-1.5 text-xs ${isActive ? 'text-indigo-500' : 'text-slate-400'}`}>
                  {tab.id === 'all'
                    ? questions.length
                    : questions.filter((q) => q.category === tab.id).length}
                </span>
              </button>
            );
          })}
        </nav>

        <div className="flex flex-col gap-3 sm:flex-row sm:items-center">
          <label className="relative flex-1">
            <span className="sr-only">搜索关键词</span>
            <span
              aria-hidden="true"
              className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-slate-400"
            >
              🔍
            </span>
            <input
              type="search"
              value={rawSearch}
              onChange={(e) => setRawSearch(e.target.value)}
              placeholder="搜索标题 / 题面 / 标签…"
              aria-label="搜索关键词"
              className="w-full rounded-xl border border-slate-300 bg-white py-2 pl-10 pr-10 text-sm text-slate-700 outline-none transition focus:border-indigo-400 focus:ring-2 focus:ring-indigo-200 dark:border-slate-700 dark:bg-slate-800 dark:text-slate-200 dark:focus:border-indigo-500 dark:focus:ring-indigo-900/50"
            />
            {rawSearch && (
              <button
                type="button"
                onClick={() => setRawSearch('')}
                aria-label="清空搜索"
                className="absolute right-2 top-1/2 -translate-y-1/2 rounded-md px-2 py-1 text-xs text-slate-500 hover:bg-slate-100 hover:text-slate-700 dark:hover:bg-slate-700 dark:hover:text-slate-200"
              >
                ✕
              </button>
            )}
          </label>

          <div className="flex gap-2">
            <label className="flex items-center gap-1.5 text-xs text-slate-500 dark:text-slate-400">
              <span>状态</span>
              <select
                value={status}
                onChange={(e) => setStatus(e.target.value)}
                aria-label="按状态筛选"
                className="rounded-lg border border-slate-300 bg-white px-2 py-1.5 text-sm text-slate-700 dark:border-slate-700 dark:bg-slate-800 dark:text-slate-200"
              >
                {STATUS_OPTIONS.map((opt) => (
                  <option key={opt.id} value={opt.id}>
                    {opt.label}
                  </option>
                ))}
              </select>
            </label>

            <label className="flex items-center gap-1.5 text-xs text-slate-500 dark:text-slate-400">
              <span>周次</span>
              <select
                value={week}
                onChange={(e) => setWeek(e.target.value)}
                aria-label="按周次筛选"
                className="rounded-lg border border-slate-300 bg-white px-2 py-1.5 text-sm text-slate-700 dark:border-slate-700 dark:bg-slate-800 dark:text-slate-200"
              >
                <option value="all">全部</option>
                {weeks.map((w) => (
                  <option key={w} value={String(w)}>
                    W{w}
                  </option>
                ))}
              </select>
            </label>
          </div>
        </div>
      </div>

      <div className="flex items-center justify-between text-sm text-slate-500 dark:text-slate-400">
        <p>
          显示 <span className="font-semibold text-slate-700 dark:text-slate-200">{filtered.length}</span>
          {' '}/ {questions.length} 道题
          {search && (
            <span className="ml-2">
              · 关键词「<span className="font-medium text-slate-700 dark:text-slate-200">{search}</span>」
            </span>
          )}
        </p>
        {hasActiveFilter && (
          <button
            type="button"
            onClick={handleReset}
            className="text-xs text-indigo-600 hover:underline dark:text-indigo-400"
          >
            清空筛选
          </button>
        )}
      </div>

      {filtered.length === 0 ? (
        <div className="rounded-2xl border border-dashed border-slate-300 bg-white p-10 text-center dark:border-slate-700 dark:bg-slate-900">
          <p className="text-base text-slate-600 dark:text-slate-300">没找到匹配的题目</p>
          <p className="mt-1 text-sm text-slate-500 dark:text-slate-400">
            试试清空关键词或筛选条件？
          </p>
          {hasActiveFilter && (
            <button
              type="button"
              onClick={handleReset}
              className="mt-4 rounded-xl bg-indigo-600 px-4 py-2 text-sm font-medium text-white hover:bg-indigo-500"
            >
              清空所有筛选
            </button>
          )}
        </div>
      ) : (
        <ul className="grid gap-3">
          {filtered.map((q) => (
            <li key={q.slug}>
              <a
                href={`/questions/${q.slug}`}
                className="group flex flex-col gap-2 rounded-2xl border border-slate-200 bg-white p-5 transition hover:border-indigo-300 hover:shadow-md dark:border-slate-800 dark:bg-slate-900 dark:hover:border-indigo-700 sm:flex-row sm:items-center sm:justify-between"
              >
                <div className="flex-1">
                  <div className="mb-2 flex flex-wrap items-center gap-2 text-xs">
                    <span
                      className={`rounded-full px-2 py-0.5 font-medium ${CATEGORY_STYLE[q.category]}`}
                    >
                      {q.category}
                    </span>
                    <span className="text-slate-500">
                      W{q.week} · {q.sub_category}
                    </span>
                    <span
                      className={`rounded-full px-2 py-0.5 font-medium ${STATUS_STYLE[q.status]}`}
                    >
                      {q.status}
                    </span>
                    <span className="text-slate-500">· {q.difficulty}</span>
                    <span className="text-slate-500">· {TYPE_LABEL[q.type]}</span>
                  </div>
                  <h2 className="text-lg font-semibold text-slate-900 group-hover:text-indigo-600 dark:text-white dark:group-hover:text-indigo-400">
                    {q.title}
                  </h2>
                  <p className="mt-1 line-clamp-2 text-sm text-slate-600 dark:text-slate-400">
                    {q.question}
                  </p>
                  {q.tags.length > 0 && (
                    <ul className="mt-2 flex flex-wrap gap-1 text-xs text-slate-500">
                      {q.tags.map((t) => (
                        <li
                          key={t}
                          className="rounded bg-slate-100 px-2 py-0.5 dark:bg-slate-800"
                        >
                          #{t}
                        </li>
                      ))}
                    </ul>
                  )}
                </div>
                <div className="text-sm font-medium text-indigo-600 dark:text-indigo-400">
                  练习 →
                </div>
              </a>
            </li>
          ))}
        </ul>
      )}
    </section>
  );
}

export default QuestionExplorer;
