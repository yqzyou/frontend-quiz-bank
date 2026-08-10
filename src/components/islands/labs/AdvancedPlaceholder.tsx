import { TopicBadge } from './TopicBadge';

type AdvancedSection = 'read' | 'sign' | 'chain-switch' | 'siwe' | 'erc20';

interface AdvancedPlaceholderProps {
  section: AdvancedSection;
}

const SECTION_META: Record<
  AdvancedSection,
  { title: string; hint: string; relatedId: string }
> = {
  read: {
    title: '读链（PublicClient）',
    hint: '未来将演示 getBalance / getBlockNumber / ENS 反查',
    relatedId: 'web3-w1-q08',
  },
  sign: {
    title: '消息签名（不广播）',
    hint: '未来将演示 signMessage / signTypedData 与地址恢复',
    relatedId: 'web3-w1-q02',
  },
  'chain-switch': {
    title: '链切换 + 事件监听',
    hint: '未来将演示 useSwitchChain 与 chainChanged 事件',
    relatedId: 'web3-w1-q13',
  },
  siwe: {
    title: 'SIWE 登录',
    hint: '未来将演示完整 Sign-In with Ethereum 流程',
    relatedId: 'web3-w1-q06',
  },
  erc20: {
    title: 'ERC20 授权',
    hint: '未来将演示 readContract + writeContract 在测试网 ERC20 上',
    relatedId: 'web3-w1-q09',
  },
};

export function AdvancedPlaceholder({ section }: AdvancedPlaceholderProps) {
  const meta = SECTION_META[section];
  return (
    <section
      data-testid="advanced-placeholder"
      aria-disabled="true"
      className="rounded-2xl border border-dashed border-slate-300 bg-slate-50 p-5 opacity-60 dark:border-slate-700 dark:bg-slate-900/50"
    >
      <div className="mb-2 flex items-center justify-between">
        <h3 className="text-base font-semibold text-slate-700 dark:text-slate-300">
          {meta.title}
        </h3>
        <TopicBadge id={meta.relatedId} />
      </div>
      <p className="text-sm text-slate-500 dark:text-slate-400">{meta.hint}</p>
      <p className="mt-3 inline-flex items-center rounded-full bg-slate-200 px-3 py-1 text-xs text-slate-600 dark:bg-slate-800 dark:text-slate-300">
        🚧 敬请期待
      </p>
    </section>
  );
}

export default AdvancedPlaceholder;
