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
