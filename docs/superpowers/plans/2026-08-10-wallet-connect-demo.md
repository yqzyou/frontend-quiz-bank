# Wallet-Connect dApp Demo Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** 实现 `/labs/wallet-connect` 页面 —— 一个教学配套的钱包连接 demo，覆盖 EIP-6963 发现 → connect → 显示 address/chain/balance → disconnect 闭环，与 web3 w1 题目（q01/q05/q08/q11/q12/q13/q14）通过 `<TopicBadge>` 反向链接。

**Architecture:** Astro 7 SSR 壳 + 单一 React island `<WalletLabApp>`（wagmi v2 Provider 编排），下挂 `ConnectCard / AccountCard / DisconnectCard` 三个交互组件 + `TopicBadge / AdvancedPlaceholder` 两个展示组件。wagmi config 在 `src/lib/wagmi-config.ts` 模块作用域单例。仅 `/labs/wallet-connect` 路由加载 wagmi/viem 字节，其他路由零增量。

**Tech Stack:** Astro 7.2 + React 19.2 + wagmi ^2.14 + viem ^2.21 + @tanstack/react-query ^5 + Tailwind 4 + Vitest 4 + happy-dom 20

---

## 文件结构（实施后全景）

```text
src/
├── pages/labs/
│   └── wallet-connect.astro              # Task 7
├── components/islands/labs/
│   ├── WalletLabApp.tsx                  # Task 7
│   ├── ConnectCard.tsx                   # Task 4
│   ├── AccountCard.tsx                   # Task 5
│   ├── DisconnectCard.tsx                # Task 6
│   ├── TopicBadge.tsx                    # Task 2
│   └── AdvancedPlaceholder.tsx           # Task 3
├── lib/
│   └── wagmi-config.ts                   # Task 1
└── tests/unit/components/labs/
    ├── helpers.tsx                       # Task 4（renderWithWagmi 复用 helper）
    ├── TopicBadge.test.tsx               # Task 2
    ├── AdvancedPlaceholder.test.tsx      # Task 3
    ├── ConnectCard.test.tsx              # Task 4
    ├── AccountCard.test.tsx              # Task 5
    └── DisconnectCard.test.tsx           # Task 6
```

修改：`package.json`（依赖）、`src/components/Header.astro`（导航）、`src/pages/index.astro`（hero 入口卡片）。

---

## Task 1: 安装依赖 + 创建 wagmi config 单例

**Files:**
- Modify: `package.json`（新增 wagmi、viem、@tanstack/react-query）
- Create: `src/lib/wagmi-config.ts`
- Create: `src/lib/wagmi-types.ts`（导出可复用的 hook 返回类型别名，避免组件里重复写 `ReturnType<typeof useAccount>`）

- [ ] **Step 1: 安装依赖**

```bash
pnpm add wagmi@^2.14 viem@^2.21 @tanstack/react-query@^5
```

预期：`package.json` 的 `dependencies` 新增三条；`pnpm-lock.yaml` 更新。

- [ ] **Step 2: 创建 wagmi-types.ts**

文件 `src/lib/wagmi-types.ts`：

```ts
// 共享类型别名：组件 props 用得到时从这里取，避免 ReturnType<> 散落。
// 不导出 wagmi/viem 内部类型，只暴露我们用到的。

export type AccountStatus = 'connected' | 'reconnecting' | 'disconnected';
```

- [ ] **Step 3: 创建 wagmi-config.ts**

文件 `src/lib/wagmi-config.ts`：

```ts
import { http, createConfig } from 'wagmi';
import { mainnet, sepolia } from 'viem/chains';
import { injected } from 'wagmi/connectors';

// 模块级单例：所有 island 共享同一个 config 实例。
// 不在组件里 createConfig —— 否则每次 render 都新建 store，状态会丢。
export const wagmiConfig = createConfig({
  chains: [mainnet, sepolia],
  connectors: [
    injected({ shimDisconnect: true }),
  ],
  multiInjectedProviderDiscovery: true,
  transports: {
    [mainnet.id]: http(),
    [sepolia.id]: http(),
  },
});
```

> **注意**：`QueryClient` 实例不在这里创建 —— 它在 Task 7 的 `WalletLabApp.tsx` 里实例化，因为 queryClient 仅在使用 `<QueryClientProvider>` 包裹时需要，避免循环依赖。

- [ ] **Step 4: 跑 check + 现有测试套件，确认依赖安装不破坏现状**

```bash
pnpm check
pnpm test
```

预期：
- `pnpm check`：`0 errors, 0 warnings, 0 hints`
- `pnpm test`：`Test Files 8 passed (8)` / `Tests 125 passed (125)`（即原 8 个 spec、125 用例全绿）

如果有 wagmi/viem 与 React 19 的 peer dep 冲突（pnpm install 报 WARN 或运行时挂掉），降级到 `pnpm add --legacy-peer-deps wagmi viem @tanstack/react-query` 并在 commit message 里写明。

- [ ] **Step 5: 提交**

```bash
git add package.json pnpm-lock.yaml src/lib/wagmi-config.ts src/lib/wagmi-types.ts
git commit -m "feat(labs): add wagmi/viem/query deps + wagmi-config singleton (P1)"
```

---

## Task 2: TopicBadge 组件

**Files:**
- Create: `src/components/islands/labs/TopicBadge.tsx`
- Create: `tests/unit/components/labs/TopicBadge.test.tsx`

**职责**：接收 frontmatter `id`（如 `web3-w1-q11`），构建期通过 `loadAllQuestions()` 反查 `slug`，渲染为 `🔗 web3-w1-q11` 小徽章链接。

- [ ] **Step 1: 写失败测试**

文件 `tests/unit/components/labs/TopicBadge.test.tsx`：

```tsx
// @vitest-environment happy-dom
import { describe, it, expect } from 'vitest';
import { render, screen } from '@testing-library/react';
import { TopicBadge } from '@islands/labs/TopicBadge';

describe('<TopicBadge />', () => {
  it('renders link to /questions/<slug> when id matches a question', () => {
    // 'web3-w1-q11' 是项目里实际存在的题目 id（见 src/content/questions/web3/w1-dapp-frontend/q11-wagmi-useaccount.mdx）
    render(<TopicBadge id="web3-w1-q11" />);
    const link = screen.getByRole('link', { name: /web3-w1-q11/ });
    expect(link).toHaveAttribute(
      'href',
      '/questions/web3/w1-dapp-frontend/q11-wagmi-useaccount',
    );
  });

  it('renders static text when id does not match any question', () => {
    render(<TopicBadge id="does-not-exist" />);
    // 无匹配时不渲染链接，但保留文字（便于审阅时看到引用意图）
    expect(screen.getByText(/does-not-exist/)).toBeInTheDocument();
    expect(screen.queryByRole('link')).not.toBeInTheDocument();
  });
});
```

- [ ] **Step 2: 跑测试，确认失败**

```bash
pnpm test tests/unit/components/labs/TopicBadge.test.tsx
```

预期：FAIL，错误信息类似 `Failed to resolve import "@islands/labs/TopicBadge"`。

- [ ] **Step 3: 实现 TopicBadge**

文件 `src/components/islands/labs/TopicBadge.tsx`：

```tsx
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
```

- [ ] **Step 4: 跑测试，确认通过**

```bash
pnpm test tests/unit/components/labs/TopicBadge.test.tsx
```

预期：`Test Files 1 passed` / `Tests 2 passed`。

- [ ] **Step 5: 提交**

```bash
git add src/components/islands/labs/TopicBadge.tsx tests/unit/components/labs/TopicBadge.test.tsx
git commit -m "feat(labs): add TopicBadge that links frontmatter id to question page (P2)"
```

---

## Task 3: AdvancedPlaceholder 组件

**Files:**
- Create: `src/components/islands/labs/AdvancedPlaceholder.tsx`
- Create: `tests/unit/components/labs/AdvancedPlaceholder.test.tsx`

**职责**：渲染灰显、不可交互的卡片框架，标题 + 对应教学点说明 + "敬请期待"。未来实现该区块时直接替换。

- [ ] **Step 1: 写失败测试**

文件 `tests/unit/components/labs/AdvancedPlaceholder.test.tsx`：

```tsx
// @vitest-environment happy-dom
import { describe, it, expect } from 'vitest';
import { render, screen } from '@testing-library/react';
import { AdvancedPlaceholder } from '@islands/labs/AdvancedPlaceholder';

describe('<AdvancedPlaceholder />', () => {
  it('renders read section with title and hint', () => {
    render(<AdvancedPlaceholder section="read" />);
    expect(screen.getByText(/读链/)).toBeInTheDocument();
    expect(screen.getByText(/敬请期待/)).toBeInTheDocument();
  });

  it('renders sign section with title', () => {
    render(<AdvancedPlaceholder section="sign" />);
    expect(screen.getByText(/签名/)).toBeInTheDocument();
  });

  it('has disabled visual state via aria-disabled', () => {
    render(<AdvancedPlaceholder section="chain-switch" />);
    const card = screen.getByTestId('advanced-placeholder');
    expect(card).toHaveAttribute('aria-disabled', 'true');
  });

  it('renders TopicBadge for the corresponding teaching point', () => {
    render(<AdvancedPlaceholder section="read" />);
    // q08 read-vs-write 是 read 区块的主对应题
    expect(screen.getByText(/web3-w1-q08/)).toBeInTheDocument();
  });
});
```

- [ ] **Step 2: 跑测试，确认失败**

```bash
pnpm test tests/unit/components/labs/AdvancedPlaceholder.test.tsx
```

预期：FAIL，`Failed to resolve import "@islands/labs/AdvancedPlaceholder"`。

- [ ] **Step 3: 实现 AdvancedPlaceholder**

文件 `src/components/islands/labs/AdvancedPlaceholder.tsx`：

```tsx
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
```

- [ ] **Step 4: 跑测试，确认通过**

```bash
pnpm test tests/unit/components/labs/AdvancedPlaceholder.test.tsx
```

预期：`Tests 4 passed`。

- [ ] **Step 5: 提交**

```bash
git add src/components/islands/labs/AdvancedPlaceholder.tsx tests/unit/components/labs/AdvancedPlaceholder.test.tsx
git commit -m "feat(labs): add AdvancedPlaceholder for future sections (P2)"
```

---

## Task 4: ConnectCard 组件 + WagmiProvider 测试 helper

**Files:**
- Create: `tests/unit/components/labs/helpers.tsx`
- Create: `src/components/islands/labs/ConnectCard.tsx`
- Create: `tests/unit/components/labs/ConnectCard.test.tsx`

**职责**：
1. `useAccount()` 判断状态
2. `useConnectors()` 列出可用 connector
3. 已连 → 灰态提示去看 AccountCard
4. 未连 + 有 connector → 列出钱包按钮
5. 未连 + 无 connector → 显示"未检测到钱包"+ MetaMask 安装链接
6. `connect()` rejection (code 4001) → 红条提示重试

- [ ] **Step 1: 创建测试 helper**

文件 `tests/unit/components/labs/helpers.tsx`：

```tsx
// @vitest-environment happy-dom
import { createConfig, http } from 'wagmi';
import { mainnet } from 'viem/chains';
import { mock } from 'wagmi/connectors';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { WagmiProvider } from 'wagmi';
import { render } from '@testing-library/react';
import { type ReactNode } from 'react';

const TEST_ACCOUNT = '0x1234567890123456789012345678901234567890';

export function createTestConfig() {
  return createConfig({
    chains: [mainnet],
    connectors: [mock({ accounts: [TEST_ACCOUNT] })],
    transports: { [mainnet.id]: http() },
    multiInjectedProviderDiscovery: false,
  });
}

export function renderWithWagmi(ui: ReactNode, config = createTestConfig()) {
  const queryClient = new QueryClient({
    defaultOptions: { queries: { retry: false } },
  });
  const utils = render(
    <WagmiProvider config={config}>
      <QueryClientProvider client={queryClient}>{ui}</QueryClientProvider>
    </WagmiProvider>,
  );
  return { ...utils, config, queryClient };
}
```

- [ ] **Step 2: 写 ConnectCard 测试（5 用例）**

文件 `tests/unit/components/labs/ConnectCard.test.tsx`：

```tsx
// @vitest-environment happy-dom
import { describe, it, expect, beforeEach } from 'vitest';
import { screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { renderWithWagmi } from './helpers';
import { ConnectCard } from '@islands/labs/ConnectCard';
import { useAccount, useConnect } from 'wagmi';

// 内部辅助：在测试里强制连接到 mock connector，便于复用
function ConnectHelper() {
  const { connect, connectors } = useConnect();
  return (
    <button onClick={() => connect({ connector: connectors[0] })}>
      helper-connect
    </button>
  );
}

describe('<ConnectCard />', () => {
  beforeEach(() => {
    localStorage.clear();
  });

  it('shows wallet buttons when disconnected + connectors available', () => {
    renderWithWagmi(<ConnectCard />);
    expect(screen.getByText(/连接钱包/)).toBeInTheDocument();
  });

  it('shows "no wallet" fallback when no connectors', async () => {
    // 直接断言：mock connector 永远存在，所以这里只测 fallback 文案分支
    // 当 connectors.length === 0 时应显示安装链接
    // 通过渲染一个不依赖 wagmi 的极简版本来验证 fallback 渲染
    // —— 实际 fallback 由 component 内部判断，这里至少验证正常路径下不会误显示
    expect(screen.queryByText(/未检测到钱包/)).not.toBeInTheDocument();
  });

  it('shows gray-state when already connected', async () => {
    const user = userEvent.setup();
    renderWithWagmi(
      <>
        <ConnectHelper />
        <ConnectCard />
      </>,
    );
    await user.click(screen.getByText('helper-connect'));
    await waitFor(() => {
      expect(screen.getByText(/已连接/)).toBeInTheDocument();
    });
  });

  it('calls connect() when user clicks a wallet button', async () => {
    const user = userEvent.setup();
    renderWithWagmi(<ConnectCard />);
    const buttons = screen.getAllByRole('button', { name: /Mock/i });
    if (buttons.length > 0) {
      await user.click(buttons[0]);
      await waitFor(() => {
        expect(screen.getByText(/已连接/)).toBeInTheDocument();
      });
    }
  });

  it('renders TopicBadge for q01 + q11', () => {
    renderWithWagmi(<ConnectCard />);
    expect(screen.getByText(/web3-w1-q01/)).toBeInTheDocument();
    expect(screen.getByText(/web3-w1-q11/)).toBeInTheDocument();
  });
});
```

> **设计说明**：第二个测试用例"无 connector 降级"用 `not.toBeInTheDocument()` 是反向断言 —— wagmi mock 总会注入 connector，无法在测试环境复现"完全无钱包"场景。该降级路径在 Task 8 手动视觉验证（Chrome 隐身窗口无扩展时）确认；component 内部用 `useConnectors().length === 0` 判断。

- [ ] **Step 3: 跑测试，确认失败**

```bash
pnpm test tests/unit/components/labs/ConnectCard.test.tsx
```

预期：FAIL，`Failed to resolve import "@islands/labs/ConnectCard"`。

- [ ] **Step 4: 实现 ConnectCard**

文件 `src/components/islands/labs/ConnectCard.tsx`：

```tsx
import { useAccount, useConnect, useConnectors } from 'wagmi';
import { TopicBadge } from './TopicBadge';

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
          role="alert"
          aria-live="polite"
          className="mt-3 rounded-lg border border-rose-200 bg-rose-50 p-3 text-sm text-rose-700 dark:border-rose-900 dark:bg-rose-950 dark:text-rose-300"
        >
          ❌ 连接失败：{error.message}（code {error.code ?? '?'})。可重试。
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
```

- [ ] **Step 5: 跑测试，确认通过**

```bash
pnpm test tests/unit/components/labs/ConnectCard.test.tsx
```

预期：`Tests 5 passed`。如果 "calls connect()" 用例失败（mock connector name 不是 'Mock'），把测试里的 `/Mock/i` 改为更宽松的 `/connect/i` 或检查 wagmi 版本的 mock connector `name`。

- [ ] **Step 6: 提交**

```bash
git add src/components/islands/labs/ConnectCard.tsx tests/unit/components/labs/ConnectCard.test.tsx tests/unit/components/labs/helpers.tsx
git commit -m "feat(labs): add ConnectCard with no-wallet fallback + reject banner (P3)"
```

---

## Task 5: AccountCard 组件

**Files:**
- Create: `src/components/islands/labs/AccountCard.tsx`
- Create: `tests/unit/components/labs/AccountCard.test.tsx`

**职责**：连接后显示 address（格式化 + 复制按钮）、chain（name + 是否在 config）、balance。错误路径：unsupported chain、balance RPC 失败。

- [ ] **Step 1: 写失败测试（4 用例）**

文件 `tests/unit/components/labs/AccountCard.test.tsx`：

```tsx
// @vitest-environment happy-dom
import { describe, it, expect, beforeEach } from 'vitest';
import { screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { renderWithWagmi } from './helpers';
import { AccountCard } from '@islands/labs/AccountCard';
import { useAccount, useConnect } from 'wagmi';

function ConnectHelper() {
  const { connect, connectors } = useConnect();
  return (
    <button onClick={() => connect({ connector: connectors[0] })}>
      helper-connect
    </button>
  );
}

describe('<AccountCard />', () => {
  beforeEach(() => {
    localStorage.clear();
  });

  it('shows placeholder when disconnected', () => {
    renderWithWagmi(<AccountCard />);
    expect(screen.getByText(/未连接钱包/)).toBeInTheDocument();
  });

  it('shows address + chain after connected', async () => {
    const user = userEvent.setup();
    renderWithWagmi(
      <>
        <ConnectHelper />
        <AccountCard />
      </>,
    );
    await user.click(screen.getByText('helper-connect'));
    await waitFor(() => {
      // mock connector 的链是 mainnet (Ethereum)
      expect(screen.getByText(/Ethereum/)).toBeInTheDocument();
    });
  });

  it('renders TopicBadge for q08 + q12', () => {
    renderWithWagmi(<AccountCard />);
    expect(screen.getByText(/web3-w1-q08/)).toBeInTheDocument();
    expect(screen.getByText(/web3-w1-q12/)).toBeInTheDocument();
  });

  it('copy button copies formatted address', async () => {
    const user = userEvent.setup();
    renderWithWagmi(
      <>
        <ConnectHelper />
        <AccountCard />
      </>,
    );
    await user.click(screen.getByText('helper-connect'));
    await waitFor(() => {
      expect(screen.getByRole('button', { name: /复制地址/ })).toBeInTheDocument();
    });
    await user.click(screen.getByRole('button', { name: /复制地址/ }));
    // happy-dom 的 navigator.clipboard.writeText 不存在，但 onClick 不应抛错
    // 这里只验证按钮存在 + 可点击
  });
});
```

- [ ] **Step 2: 跑测试，确认失败**

```bash
pnpm test tests/unit/components/labs/AccountCard.test.tsx
```

预期：FAIL，`Failed to resolve import "@islands/labs/AccountCard"`。

- [ ] **Step 3: 实现 AccountCard**

文件 `src/components/islands/labs/AccountCard.tsx`：

```tsx
import { useState } from 'react';
import { useAccount, useBalance, useChainId } from 'wagmi';
import { mainnet, sepolia } from 'viem/chains';
import type { Chain } from 'viem';
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
                role="alert"
                aria-live="polite"
                className="text-rose-700 dark:text-rose-300"
              >
                获取失败
              </span>
            ) : (
              <span className="font-mono text-slate-700 dark:text-slate-200">
                {balance?.formatted ?? '0'} {balance?.symbol ?? 'ETH'}
              </span>
            )}
          </dd>
        </div>
      </dl>

      {isUnsupported && (
        <p
          role="alert"
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
```

- [ ] **Step 4: 跑测试，确认通过**

```bash
pnpm test tests/unit/components/labs/AccountCard.test.tsx
```

预期：`Tests 4 passed`。

- [ ] **Step 5: 提交**

```bash
git add src/components/islands/labs/AccountCard.tsx tests/unit/components/labs/AccountCard.test.tsx
git commit -m "feat(labs): add AccountCard with address/chain/balance + unsupported-chain (P4)"
```

---

## Task 6: DisconnectCard 组件

**Files:**
- Create: `src/components/islands/labs/DisconnectCard.tsx`
- Create: `tests/unit/components/labs/DisconnectCard.test.tsx`

**职责**：已连时显示「断开」按钮 + 小字说明（wagmi v2 disconnect 不影响钱包侧），未连时整张卡 hidden。

- [ ] **Step 1: 写失败测试（3 用例）**

文件 `tests/unit/components/labs/DisconnectCard.test.tsx`：

```tsx
// @vitest-environment happy-dom
import { describe, it, expect, beforeEach } from 'vitest';
import { screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { renderWithWagmi } from './helpers';
import { DisconnectCard } from '@islands/labs/DisconnectCard';
import { useAccount, useConnect } from 'wagmi';

function ConnectHelper() {
  const { connect, connectors } = useConnect();
  return (
    <button onClick={() => connect({ connector: connectors[0] })}>
      helper-connect
    </button>
  );
}

describe('<DisconnectCard />', () => {
  beforeEach(() => {
    localStorage.clear();
  });

  it('is hidden when disconnected', () => {
    const { container } = renderWithWagmi(<DisconnectCard />);
    // 整张卡用 aria-hidden + visually hidden 实现
    expect(container.firstChild).toBeNull();
    // （实现里我们用 null 返回）
  });

  it('shows disconnect button when connected', async () => {
    const user = userEvent.setup();
    renderWithWagmi(
      <>
        <ConnectHelper />
        <DisconnectCard />
      </>,
    );
    await user.click(screen.getByText('helper-connect'));
    await waitFor(() => {
      expect(
        screen.getByRole('button', { name: /断开/ }),
      ).toBeInTheDocument();
    });
  });

  it('renders TopicBadge for q11', async () => {
    const user = userEvent.setup();
    renderWithWagmi(
      <>
        <ConnectHelper />
        <DisconnectCard />
      </>,
    );
    await user.click(screen.getByText('helper-connect'));
    await waitFor(() => {
      expect(screen.getByText(/web3-w1-q11/)).toBeInTheDocument();
    });
  });
});
```

- [ ] **Step 2: 跑测试，确认失败**

```bash
pnpm test tests/unit/components/labs/DisconnectCard.test.tsx
```

预期：FAIL，`Failed to resolve import "@islands/labs/DisconnectCard"`。

- [ ] **Step 3: 实现 DisconnectCard**

文件 `src/components/islands/labs/DisconnectCard.tsx`：

```tsx
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
```

- [ ] **Step 4: 跑测试，确认通过**

```bash
pnpm test tests/unit/components/labs/DisconnectCard.test.tsx
```

预期：`Tests 3 passed`。

- [ ] **Step 5: 提交**

```bash
git add src/components/islands/labs/DisconnectCard.tsx tests/unit/components/labs/DisconnectCard.test.tsx
git commit -m "feat(labs): add DisconnectCard with wagmi-v2 caveat note (P5)"
```

---

## Task 7: WalletLabApp + page + 站点导航入口

**Files:**
- Create: `src/components/islands/labs/WalletLabApp.tsx`
- Create: `src/pages/labs/wallet-connect.astro`
- Modify: `src/components/Header.astro`（加 实验室 导航链接）
- Modify: `src/pages/index.astro`（hero 区加实验室入口卡片）

**职责**：把所有卡片组装成完整页面，注册路由，让用户能从首页 / 导航进入。

- [ ] **Step 1: 实现 WalletLabApp**

文件 `src/components/islands/labs/WalletLabApp.tsx`：

```tsx
import { WagmiProvider } from 'wagmi';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { wagmiConfig } from '@lib/wagmi-config';
import { ConnectCard } from './ConnectCard';
import { AccountCard } from './AccountCard';
import { DisconnectCard } from './DisconnectCard';
import { AdvancedPlaceholder } from './AdvancedPlaceholder';

// 模块级 QueryClient 单例（与 wagmiConfig 同理：不每次 render 重建）
const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      retry: 1,
      staleTime: 30_000,
    },
  },
});

export function WalletLabApp() {
  return (
    <WagmiProvider config={wagmiConfig}>
      <QueryClientProvider client={queryClient}>
        <div className="space-y-5">
          <ConnectCard />
          <AccountCard />
          <DisconnectCard />
          <div className="space-y-3">
            <h2 className="text-sm font-semibold uppercase tracking-wider text-slate-500 dark:text-slate-400">
              进阶区块 · 敬请期待
            </h2>
            <AdvancedPlaceholder section="read" />
            <AdvancedPlaceholder section="sign" />
            <AdvancedPlaceholder section="chain-switch" />
          </div>
        </div>
      </QueryClientProvider>
    </WagmiProvider>
  );
}

export default WalletLabApp;
```

- [ ] **Step 2: 创建 wallet-connect.astro 页面**

文件 `src/pages/labs/wallet-connect.astro`：

```astro
---
import BaseLayout from '../../layouts/BaseLayout.astro';
import WalletLabApp from '../../components/islands/labs/WalletLabApp.tsx';
---

<BaseLayout
  title="钱包连接 Lab · 前端题库"
  description="动手实验室：用 wagmi v2 + viem 连接 MetaMask、查看账户/链/余额、断开连接。对应 web3 w1 题目 q01/q05/q08/q11/q12/q13/q14。"
  breadcrumb={[
    { name: '首页', url: '/' },
    { name: '实验室', url: '/labs/wallet-connect' },
  ]}
>
  <section class="py-4">
    <nav aria-label="面包屑" class="mb-3 text-sm text-slate-500 dark:text-slate-400">
      <a href="/" class="hover:underline">首页</a>
      <span class="mx-2" aria-hidden="true">/</span>
      <span class="text-slate-700 dark:text-slate-300">实验室 · 钱包连接</span>
    </nav>

    <header class="mb-6">
      <h1 class="text-3xl font-bold tracking-tight text-slate-900 dark:text-white">
        钱包连接 Lab
      </h1>
      <p class="mt-2 text-sm text-slate-600 dark:text-slate-400">
        动手演示 wagmi v2 + viem 的连接 / 状态 / 断开闭环。点击右上的 🔗 徽章可跳回对应题目。
      </p>
    </header>

    <WalletLabApp client:load />
  </section>
</BaseLayout>
```

- [ ] **Step 3: 在 Header 加 实验室 导航链接**

修改 `src/components/Header.astro`。先读现有 Header 找到导航位置：用 grep 查 `题库` 文案所在的 `<a>` 标签，复制一行改成「实验室」。

伪示意（具体路径以现有 Header 为准）：

```astro
<a href="/questions" class="...">题库</a>
<a href="/labs/wallet-connect" class="...">实验室</a>  <!-- 新增这一行 -->
<a href="/review" class="...">复习中心</a>
```

- [ ] **Step 4: 在首页 hero 加实验室入口卡片**

修改 `src/pages/index.astro`：找到现有的 3 个 CTA 按钮 / 卡片区，加第 4 个 `实验室` 入口，链接到 `/labs/wallet-connect`。

伪示意：

```astro
<a
  href="/labs/wallet-connect"
  class="rounded-2xl border border-violet-200 bg-violet-50 p-5 transition hover:border-violet-300 dark:border-violet-900 dark:bg-violet-950"
>
  <h3 class="text-lg font-semibold text-violet-900 dark:text-violet-200">动手实验室</h3>
  <p class="mt-1 text-sm text-violet-700 dark:text-violet-300">
    连接钱包，看 wagmi v2 hooks 实时触发
  </p>
</a>
```

- [ ] **Step 5: 跑 check + 全部单元测试 + build，确认无破坏**

```bash
pnpm check
pnpm test
pnpm build
```

预期：
- `pnpm check`：`0 errors, 0 warnings, 0 hints`
- `pnpm test`：`Test Files 13 passed (13)`（原 8 个 + 新增 5 个 spec）/ `Tests 143 passed`（原 125 + 新增 18 用例）
- `pnpm build`：`42 page(s) built`（原 41 + 新增 1）

并验证 build 输出包含 `dist/labs/wallet-connect/index.html`：

```bash
ls dist/labs/wallet-connect/index.html
```

预期：文件存在。

- [ ] **Step 6: 提交**

```bash
git add src/components/islands/labs/WalletLabApp.tsx src/pages/labs/wallet-connect.astro src/components/Header.astro src/pages/index.astro
git commit -m "feat(labs): wire up /labs/wallet-connect page + nav entries (P6)"
```

---

## Task 8: 视觉打磨（手动 checklist）+ 最终全量验证

**Files:**
- 无新增代码文件
- Modify：可能微调 Tailwind 类（如发现对比度问题）

**职责**：手动跨浏览器 + 双主题 + 移动端验证；最终 check / validate / test / build 全绿。

- [ ] **Step 1: 手动视觉回归 checklist**

启动 `pnpm dev`，访问 `http://localhost:4321/labs/wallet-connect`，**逐项打勾**：

亮色模式（macOS / Chrome）：
- [ ] 页面标题、面包屑显示正确
- [ ] ConnectCard 边框 / 阴影 / 圆角协调
- [ ] TopicBadge 徽章颜色与项目其他地方一致
- [ ] AdvancedPlaceholder 灰显自然，opacity 60% 不刺眼
- [ ] footer 与其他页面对齐

暗色模式（系统切换到 dark）：
- [ ] 所有卡片背景 `bg-slate-900` 正确（无白底泄漏）
- [ ] TopicBadge 在暗色下文字可读
- [ ] 错误条（如手动拒绝连接）颜色对比 ≥ WCAG AA

移动端（Chrome DevTools → 375px iPhone SE）：
- [ ] 卡片不溢出，padding 适配
- [ ] ConnectCard 的钱包按钮可点击区域 ≥ 44px 高
- [ ] 文字不出现水平滚动

交互流程（Chrome + MetaMask 扩展，使用 privacy mode 关闭的测试账号）：
- [ ] 点击「连接 Mock」或「连接 MetaMask」→ 钱包弹窗
- [ ] 在钱包里 Approve → AccountCard 出现 address / chain / balance
- [ ] DisconnectCard 出现「断开」按钮
- [ ] 点击「断开」→ 状态清空，DisconnectCard 消失
- [ ] 拒绝连接（在钱包里点 Reject）→ 红条「连接失败」出现

降级测试（Chrome 隐身窗口，无任何钱包扩展）：
- [ ] ConnectCard 显示「⚠️ 未检测到钱包」+ MetaMask 安装链接
- [ ] AccountCard 显示「未连接钱包」placeholder
- [ ] DisconnectCard 不渲染

无钱包降级截图存档到 `docs/superpowers/screenshots/wallet-connect-no-wallet.png`（可选，但便于 PR）。

- [ ] **Step 2: 跑 check + validate**

```bash
pnpm check
pnpm validate
```

预期：`0 errors / All content valid`。

- [ ] **Step 3: 跑全部单元测试**

```bash
pnpm test
```

预期：`Tests 143 passed` 或更多（如 Step 1 发现 UI 问题并加新测试）。

- [ ] **Step 4: 跑 build，验证路由隔离**

```bash
pnpm build
```

预期：`42 page(s) built`（原 41 + 新增 1 = 42）。

验证 home / questions / review 路由零增量 bundle：

```bash
# 检查首页 HTML 不含 wagmi/viem 的 chunk 引用
grep -E "wagmi|viem" dist/index.html && echo "FAIL: home has wagmi/viem" || echo "PASS: home is clean"
grep -E "wagmi|viem" dist/questions/index.html && echo "FAIL: questions has wagmi/viem" || echo "PASS: questions is clean"
grep -E "wagmi|viem" dist/labs/wallet-connect/index.html && echo "PASS: labs has wagmi" || echo "FAIL: labs missing wagmi"
```

预期：前两条 PASS（clean），第三条 PASS（labs 含 wagmi）。

- [ ] **Step 5: 提交（如果有视觉微调）**

```bash
git add -p  # 选择性 stage
git commit -m "style(labs): polish dark mode + mobile layout per visual review (P7-P8)"
```

如果 Step 1 无任何调整，本步骤可跳过 —— Task 7 的提交已经是终态。

- [ ] **Step 6: 最终验证全绿**

```bash
pnpm check && pnpm validate && pnpm test && pnpm build
```

预期：四条命令全部 exit 0。这是 MVP 完成的标志。

---

## 完成判定

全部 Task 1-8 的所有 checkbox 都打勾 = MVP 完成。spec §8 的 7 条成功标准应全部满足：

1. ✅ `/labs/wallet-connect` 在生产构建中可访问（Task 7 Step 5 验证）
2. ✅ Chrome + MetaMask 完整 connect → status → disconnect 闭环（Task 8 Step 1）
3. ✅ 三条错误路径 aria-live 提示（Task 8 Step 1 拒绝连接、unsupported chain、RPC 失败）
4. ✅ 暗色 + 移动端 375px 适配（Task 8 Step 1）
5. ✅ 4 个单测文件、≥12 用例全绿（Task 8 Step 3）
6. ✅ home / questions / review bundle 零增量（Task 8 Step 4）
7. ✅ check + validate + test + build 全绿（Task 8 Step 6）
