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
