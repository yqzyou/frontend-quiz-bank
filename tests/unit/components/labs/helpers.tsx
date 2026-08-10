// @vitest-environment happy-dom
/**
 * WagmiProvider 测试 helper（Task 4 引入，T5/T6/T7 复用）
 *
 * 设计：
 * - 用 `mock` connector 注入一个 fake EIP-1193 provider，账户固定
 * - `multiInjectedProviderDiscovery: false` 防止 wagmi 扫描 window.ethereum
 * - `QueryClient` 关闭 retry，避免 mutation 错误时反复重试拖慢测试
 * - 返回 `{ ...utils, config, queryClient }`，让用例可断言 wagmi state
 *
 * 注意：此文件命名不是 `*.test.tsx`，所以 vitest 不会把它当测试文件，
 * 只是普通模块（被 ConnectCard/AccountCard/DisconnectCard 测试 import）。
 */
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
