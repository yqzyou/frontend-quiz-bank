import { useAccount, useDisconnect } from 'wagmi';
import { TopicBadge } from './TopicBadge';

export function DisconnectCard() {
  const { status } = useAccount();
  const { disconnect, isPending } = useDisconnect();

  // 未连时整张卡不渲染 —— 避免给用户多余视觉噪音
  if (status !== 'connected') {
    return null;
  }

  return (
    <section className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm dark:border-slate-800 dark:bg-slate-900">
      <div className="mb-4 flex items-center justify-between">
        <h2 className="text-lg font-semibold text-slate-900 dark:text-white">
          断开连接
        </h2>
        <TopicBadge id="web3-w1-q11" />
      </div>

      <button
        type="button"
        onClick={() => disconnect()}
        disabled={isPending}
        className="w-full rounded-xl border border-rose-200 bg-rose-50 px-4 py-3 text-sm font-medium text-rose-700 transition hover:bg-rose-100 disabled:cursor-not-allowed disabled:opacity-50 dark:border-rose-900 dark:bg-rose-950 dark:text-rose-300 dark:hover:bg-rose-900"
      >
        {isPending ? '断开中…' : '断开钱包'}
      </button>

      <p className="mt-3 text-xs text-slate-500 dark:text-slate-400">
        说明：wagmi v2 的 disconnect 只清除本站状态。若要在钱包侧也「断开站点」，
        请在 MetaMask → 设置 → 连接的站点 里手动操作。
      </p>
    </section>
  );
}

export default DisconnectCard;
