import { useState } from 'react';
import { useAccount, useBalance, useChainId } from 'wagmi';
import { mainnet, sepolia } from 'viem/chains';
import { formatUnits, type Chain } from 'viem';
import { TopicBadge } from './TopicBadge';

const SUPPORTED_CHAINS: Record<number, Chain> = {
  [mainnet.id]: mainnet,
  [sepolia.id]: sepolia,
};

function formatAddress(addr: string): string {
  if (!addr || addr.length < 10) return addr;
  return `${addr.slice(0, 6)}...${addr.slice(-4)}`;
}

export function AccountCard() {
  const { address, status } = useAccount();
  const chainId = useChainId();
  const { data: balance, isLoading, isError } = useBalance({ address });

  const [copied, setCopied] = useState(false);

  if (status !== 'connected' || !address) {
    return (
      <Card>
        <Header />
        <div className="rounded-lg border border-dashed border-slate-300 p-6 text-center text-sm text-slate-400 dark:border-slate-700 dark:text-slate-500">
          未连接钱包
        </div>
      </Card>
    );
  }

  const chain = SUPPORTED_CHAINS[chainId];
  const isUnsupported = !chain;

  async function handleCopy() {
    try {
      await navigator.clipboard?.writeText(address ?? '');
      setCopied(true);
      setTimeout(() => setCopied(false), 1500);
    } catch {
      // happy-dom / 旧浏览器降级：什么都不做，按钮只是不生效
    }
  }

  return (
    <Card>
      <Header />
      <dl className="space-y-3 text-sm">
        <div className="flex items-center justify-between gap-3">
          <dt className="text-slate-500 dark:text-slate-400">地址</dt>
          <dd className="flex items-center gap-2">
            <code className="rounded bg-slate-100 px-2 py-0.5 font-mono text-xs text-slate-700 dark:bg-slate-800 dark:text-slate-200">
              {formatAddress(address)}
            </code>
            <button
              type="button"
              onClick={handleCopy}
              aria-label="复制地址"
              className="rounded-md px-2 py-0.5 text-xs text-slate-500 hover:bg-slate-100 hover:text-slate-700 dark:hover:bg-slate-700 dark:hover:text-slate-200"
            >
              {copied ? '✓ 已复制' : '复制'}
            </button>
          </dd>
        </div>

        <div className="flex items-center justify-between gap-3">
          <dt className="text-slate-500 dark:text-slate-400">链</dt>
          <dd>
            {isUnsupported ? (
              <span className="font-medium text-amber-700 dark:text-amber-300">
                ⚠️ 链 ID {chainId} 未配置
              </span>
            ) : (
              <span className="font-medium text-slate-700 dark:text-slate-200">
                {chain.name}
              </span>
            )}
          </dd>
        </div>

        <div className="flex items-center justify-between gap-3">
          <dt className="text-slate-500 dark:text-slate-400">余额</dt>
          <dd>
            {isLoading ? (
              <span className="text-slate-400">加载中…</span>
            ) : isError ? (
              <span
                aria-live="polite"
                className="text-rose-700 dark:text-rose-300"
              >
                获取失败
              </span>
            ) : (
              <span className="font-mono text-slate-700 dark:text-slate-200">
                {balance
                  ? formatUnits(balance.value, balance.decimals)
                  : '0'}{' '}
                {balance?.symbol ?? 'ETH'}
              </span>
            )}
          </dd>
        </div>
      </dl>

      {isUnsupported && (
        <p
          aria-live="polite"
          className="mt-3 rounded-lg border border-amber-200 bg-amber-50 p-3 text-xs text-amber-800 dark:border-amber-900 dark:bg-amber-950 dark:text-amber-300"
        >
          当前链 ID {chainId} 不在本 demo 的配置内（仅支持 Ethereum Mainnet / Sepolia）。请在钱包里切回 Ethereum。
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
        账户信息
      </h2>
      <div className="flex gap-1">
        <TopicBadge id="web3-w1-q12" />
        <TopicBadge id="web3-w1-q08" />
      </div>
    </div>
  );
}

export default AccountCard;
