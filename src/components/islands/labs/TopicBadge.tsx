import { loadAllQuestions } from '@lib/content-loader';

interface TopicBadgeProps {
  id: string; // frontmatter.id，例如 'web3-w1-q11'
}

// 构建期一次性反查 id → slug，缓存到模块作用域。
// 题库内容在 build 期就固定，运行时不需要重复 load。
const ID_TO_SLUG: Map<string, string> = (() => {
  const map = new Map<string, string>();
  for (const q of loadAllQuestions()) {
    map.set(q.frontmatter.id, q.slug);
  }
  return map;
})();

export function TopicBadge({ id }: TopicBadgeProps) {
  const slug = ID_TO_SLUG.get(id);
  if (!slug) {
    return (
      <span className="text-xs text-slate-400 dark:text-slate-500">
        🔗 {id}
      </span>
    );
  }
  return (
    <a
      href={`/questions/${slug}`}
      className="inline-flex items-center rounded-full bg-slate-100 px-2 py-0.5 text-xs text-slate-600 transition hover:bg-slate-200 hover:text-slate-900 dark:bg-slate-800 dark:text-slate-300 dark:hover:bg-slate-700 dark:hover:text-white"
    >
      🔗 {id}
    </a>
  );
}

export default TopicBadge;
