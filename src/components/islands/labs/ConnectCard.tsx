import { useAccount, useConnect, useConnectors } from 'wagmi';
import { TopicBadge } from './TopicBadge';

/**
 * ConnectCard —— 钱包连接入口卡片
 *
 * 三态分支（按渲染优先级）：
 *   1. 已连接 → 灰态提示去看 AccountCard
 *   2. 未连 + 无 connector → "未检测到钱包" + MetaMask 安装链接
 *   3. 未连 + 有 connector → 钱包按钮列表 + 错误重试条
 *
 * 教学对应：
 *   - q01 EIP-6963（多钱包发现）
 *   - q11 useAccount（连接状态判断）
 */
export function ConnectCard() {
  const { status } = useAccount();
  const { connect, isPending: isConnecting, error } = useConnect();
  const connectors = useConnectors();

  const isConnected = status === 'connected';

  if (isConnected) {
    return (
      <Card>
        <Header />
        <div className="rounded-lg bg-slate-50 p-4 text-sm text-slate-500 dark:bg-slate-800/50 dark:text-slate-400">
          ✅ 已连接 · 请查看下方账户信息
        </div>
      </Card>
    );
  }

  if (connectors.length === 0) {
    return (
      <Card>
        <Header />
        <div className="rounded-lg border border-amber-200 bg-amber-50 p-4 text-sm text-amber-800 dark:border-amber-900 dark:bg-amber-950 dark:text-amber-300">
          <p className="font-medium">⚠️ 未检测到钱包</p>
          <p className="mt-1 text-xs">
            请安装{' '}
            <a
              href="https://metamask.io/download/"
              target="_blank"
              rel="noopener noreferrer"
              className="underline"
            >
              MetaMask
            </a>{' '}
            或其他 EIP-1193 钱包扩展后刷新本页。
          </p>
        </div>
      </Card>
    );
  }

  return (
    <Card>
      <Header />
      <p className="mb-3 text-sm text-slate-600 dark:text-slate-400">
        点击钱包发起连接：
      </p>
      <ul className="space-y-2" aria-label="可用钱包列表">
        {connectors.map((c) => (
          <li key={c.uid}>
            <button
              type="button"
              onClick={() => connect({ connector: c })}
              disabled={isConnecting}
              className="w-full rounded-xl border border-slate-200 bg-white px-4 py-3 text-left text-sm font-medium text-slate-700 transition hover:border-indigo-300 hover:bg-indigo-50 disabled:cursor-not-allowed disabled:opacity-50 dark:border-slate-700 dark:bg-slate-800 dark:text-slate-200 dark:hover:border-indigo-700 dark:hover:bg-slate-700"
            >
              {isConnecting ? '连接中…' : `连接 ${c.name}`}
            </button>
          </li>
        ))}
      </ul>
      {error && (
        <p
          aria-live="polite"
          className="mt-3 rounded-lg border border-rose-200 bg-rose-50 p-3 text-sm text-rose-700 dark:border-rose-900 dark:bg-rose-950 dark:text-rose-300"
        >
          ❌ 连接失败：{error.name} — {error.message}。可重试。
        </p>
      )}
    </Card>
  );
}

function Card({ children }: { children: React.ReactNode }) {
  return (
    <section className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm dark:border-slate-800 dark:bg-slate-900">
      {children}
    </section>
  );
}

function Header() {
  return (
    <div className="mb-4 flex items-center justify-between">
      <h2 className="text-lg font-semibold text-slate-900 dark:text-white">
        连接钱包
      </h2>
      <div className="flex gap-1">
        <TopicBadge id="web3-w1-q01" />
        <TopicBadge id="web3-w1-q11" />
      </div>
    </div>
  );
}

export default ConnectCard;
