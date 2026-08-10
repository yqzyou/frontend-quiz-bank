# Wallet-Connect dApp Demo — 设计规格文档

> **状态**：2026-08-10 由用户逐段确认（§1–§5 已逐节通过）
> **范围**：先做 MVP；进阶区块以占位符形式预留
> **实施阶段**：8 个 commit（P1–P8）

---

## 1. 背景与动机

frontend-quiz-bank 项目当前在 `src/content/questions/web3/w1-dapp-frontend/` 下有 15 道 web3 dApp 前端题目，覆盖 EIP-6963、签名、gas、call vs send、ethers vs viem、SIWE、personal vs typed、read vs write、ERC20 allowance、EIP-1559、wagmi useAccount、public vs wallet client、chain switch、error handling、event listening。

其中三道（q05、q11、q12）**明确推荐** 技术栈 `viem + wagmi v2`，并演示了 `useAccount` / `useConnect` / `useDisconnect` hooks。但项目目前**没有任何交互式 demo** 让学习者实际点击这些 hook。

本 spec 定义一个 MVP demo，桥接"读题"→"点钱包"→"实时看 wagmi v2 hook 触发"的体验，并为未来扩展到进阶主题（读链、签名、SIWE、ERC20）留出清晰路径。

## 2. 目标与非目标

### MVP 目标

- **G1**：新增页面 `/labs/wallet-connect`，仅在该路由加载 wagmi v2 + viem。
- **G2**：学习者能完成闭环：发现 EIP-6963 钱包 → 点击连接 → 在钱包里授权 → 看到 address + chain + balance → 点击断开 → 状态清空。
- **G3：教学配套**：每个交互块都带 `<TopicBadge>` 徽章，链接回对应题目。
- **G4：友好降级**：未安装钱包的学习者也能理解当前发生了什么（教学场景刚需）。
- **G5：暗色模式 + 移动端** 与站点其他页面表现一致。
- **G6：零 bundle 影响**：访问 `/`、`/questions`、`/review` 时**完全不下载** wagmi/viem 字节。

### 非目标（MVP 范围外，YAGNI）

- ❌ 写链操作（`sendTransaction`、ERC20 `transfer`/`approve`）—— 涉及真钱风险，本阶段无教学价值。
- ❌ WalletConnect v2 / 多连接器 —— 需要 cloud `projectId`，违反"零 secret"原则。
- ❌ SIWE 认证 —— 需要后端，超出范围。
- ❌ E2E 测试 —— Playwright 不能驱动真钱包扩展；`dappeteer` 太重。Mock connector 单测已覆盖同样的行为面。
- ❌ 连接 UI 套件（RainbowKit / ConnectKit / Web3Modal）—— 黑盒，与 q01/q11 "从原语教起"的取向矛盾。
- ❌ 移动端深链、i18n（仅中文）。

### 未来扩展（占位）

以下功能在 MVP 阶段以 `<AdvancedPlaceholder>` 灰显卡片占位，未来直接替换为真实组件：

- **读链** → 在任意地址上调 `useBalance`、`getBlockNumber`、ENS 反查（q08、q12）
- **签名** → `signMessage` / `signTypedData`，展示恢复出的地址（q02、q06、q07）
- **链切换** → `useSwitchChain`，监听 `chainChanged` 事件（q13、q15）
- **SIWE** → 完整登录流程（q06）
- **ERC20 授权** → 测试网 ERC20 上调 `readContract` + `writeContract`（q09）

## 3. 架构

### 3.1 路由

- **路径**：`/labs/wallet-connect`（文件：`src/pages/labs/wallet-connect.astro`）
- **为什么用 `/labs/` 前缀**：呼应"实验室"语义，未来可加 `/labs/siwe`、`/labs/erc20-allowance` 等独立 demo 而无需重构路由。
- **导航入口**：在 `Header.astro` 主导航加 `实验室` 链接；在 `index.astro` hero 加「动手实验室」入口卡片。
- **sitemap**：`@astrojs/sitemap` 自动收录，无需配置。

### 3.2 文件结构（新增 + 修改）

```text
src/
├── pages/labs/
│   └── wallet-connect.astro              # 新增：SSR 壳，渲染 <WalletLabApp client:load />
├── components/islands/labs/
│   ├── WalletLabApp.tsx                  # 新增：Provider 编排 + 子组件组合
│   ├── ConnectCard.tsx                   # 新增：连接 + EIP-6963 检测 + 无钱包降级
│   ├── AccountCard.tsx                   # 新增：地址 / 链 / 余额 显示
│   ├── DisconnectCard.tsx                # 新增：断开 + 状态清理
│   ├── TopicBadge.tsx                    # 新增：「🔗 web3-w1-q11」徽章
│   └── AdvancedPlaceholder.tsx           # 新增：进阶区块灰显占位
├── lib/
│   └── wagmi-config.ts                   # 新增：createConfig（单例）
└── tests/unit/components/labs/
    ├── ConnectCard.test.tsx              # 新增：5 个用例
    ├── AccountCard.test.tsx              # 新增：4 个用例
    ├── DisconnectCard.test.tsx           # 新增：3 个用例
    └── TopicBadge.test.tsx               # 新增：1 个用例
```

修改的文件：
- `src/components/Header.astro` —— 加 实验室 导航链接
- `src/pages/index.astro` —— hero 区加实验室入口卡片
- `package.json` —— 加 `wagmi`、`viem`、`@tanstack/react-query` 依赖

### 3.3 数据流

```
MetaMask（或任何 EIP-1193 钱包）
   ↓ EIP-1193 + EIP-6963
injected() connector（单例）
   ↓
wagmi createConfig（单例，位于 src/lib/wagmi-config.ts）
   ↓ store（account / chain / status / balance）
<WagmiProvider>（位于 WalletLabApp.tsx 顶层）
<QueryClientProvider>（wagmi peer dep）
   ↓ React Context
<ConnectCard />  <AccountCard />  <DisconnectCard />
   ↓ useAccount() / useBalance() / useChainId() / useConnect() / useDisconnect()
UI
```

**关键**：`wagmiConfig` 在 `src/lib/wagmi-config.ts` 模块作用域**只创建一次**。组件 import 单例，禁止每次 render 重建。

### 3.4 Bundle 影响

| 依赖 | gzip 估算 | 是否必需 |
| --- | --- | --- |
| `wagmi` ^2.14 | ~25kb | 是 |
| `viem` ^2.21 | ~35kb（tree-shake 后） | 是 |
| `@tanstack/react-query` ^5 | ~12kb（wagmi peer dep） | 是 |
| **合计** | **~72kb gzip** | 仅在 `/labs/wallet-connect` 路由加载 |

Astro 的 per-route island 打包保证：访问 `/`、`/questions`、`/review` 时**完全不下载** wagmi/viem 字节。

## 4. 组件规格

### 4.1 `<WalletLabApp />`（约 50 行）

**职责**：包裹 Provider，渲染三个交互卡片 + 进阶占位。

**伪签名**：
```tsx
interface WalletLabAppProps {}  // 无 props，config 是模块级单例

export function WalletLabApp(): JSX.Element
```

**渲染结构**：
```tsx
<WagmiProvider config={wagmiConfig}>
  <QueryClientProvider client={queryClient}>
    <ConnectCard />
    <AccountCard />
    <DisconnectCard />
    <AdvancedPlaceholder section="read" />
    <AdvancedPlaceholder section="sign" />
    <AdvancedPlaceholder section="chain-switch" />
  </QueryClientProvider>
</WagmiProvider>
```

### 4.2 `<ConnectCard />`（约 80 行，含无钱包降级）

**职责**：
1. `useConnect()` → 拿 connectors + connect mutation
2. `useAccount()` → 状态判断
3. `useConnectors()` → 列出 EIP-6963 发现的可用的连接器
4. **状态分支**：
   - 已连接 → 卡片显示"已连接"灰态，提示去看 AccountCard
   - 未连接 + 检测到 connector → 列出钱包按钮
   - 未连接 + 无 connector → 显示"未检测到钱包"+ MetaMask 安装链接（教学降级）
5. **错误处理**：
   - `connect()` 被拒（code 4001）→ 红条："用户拒绝，可重试"
   - Connector 已连接 → 静默（wagmi 自动去重）

**TopicBadge**：`web3-w1-q01`（EIP-6963）+ `web3-w1-q11`（useAccount/useConnect）

### 4.3 `<AccountCard />`（约 90 行）

**职责**：
1. `useAccount()` → `address`、`chain`、`status`
2. `useBalance({ address })` → `data: { formatted, symbol }`、`isLoading`、`isError`
3. 地址格式化：`0x1234...5678`（前 6 / 后 4 字符），复制按钮
4. 链显示：`chain.name` + 原生代币符号
5. **状态分支**：
   - 未连接 → placeholder 灰态
   - 已连接 + 配置内链 → 全量显示
   - 已连接 + 不支持的链（如 BSC、Polygon 未在 config 内）→ 黄条："链 ID X 未配置，请切回 Ethereum"
6. **错误处理**：
   - 余额 RPC 失败 → 重试 1 次后红条："余额获取失败"

**TopicBadge**：`web3-w1-q12`（public-vs-wallet-client）+ `web3-w1-q08`（read-vs-write）

### 4.4 `<DisconnectCard />`（约 40 行）

**职责**：调 `useDisconnect()`，已连时显示按钮，未连时整张卡 hidden。

**TopicBadge**：`web3-w1-q11`

**UX 细节**：wagmi v2 的 `disconnect()` 只清 wagmi 自身状态，**不会**让 MetaMask 弹"断开站点"。卡里需要小字说明这一点，避免学习者困惑。

### 4.5 `<TopicBadge slug="web3-w1-q11" />`（约 15 行）

**伪签名**：
```tsx
interface TopicBadgeProps {
  slug: string;  // 例 'web3-w1-q11'
}

export function TopicBadge({ slug }: TopicBadgeProps): JSX.Element
```

**行为**：通过构建期从 `loadAllQuestions()` 反查 slug → URL，模块作用域缓存。渲染为小号 `🔗 web3-w1-q11` 链接，指向 `/questions/web3/<...>/<slug>`。

### 4.6 `<AdvancedPlaceholder section="read" />`（约 30 行）

**伪签名**：
```tsx
type AdvancedSection = 'read' | 'sign' | 'chain-switch' | 'siwe' | 'erc20';

interface AdvancedPlaceholderProps {
  section: AdvancedSection;
}

export function AdvancedPlaceholder({ section }: AdvancedPlaceholderProps): JSX.Element
```

**行为**：渲染一个灰显、不可交互的卡片框架，包含标题 + "未来将演示 X，对应 web3-w1-qYY"+ "敬请期待"。未来实现该区块时，把这个组件替换为真实组件即可，**布局零修改**。

## 5. 错误处理矩阵

| 场景 | 触发 | 行为 | 对应教学点 |
| --- | --- | --- | --- |
| **未装钱包** | EIP-6963 announce 为空 | ConnectCard 显示"未检测到钱包"+ MetaMask 安装链接 | q01 EIP-6963 |
| **用户拒绝连接** | `connect()` reject code 4001 | 红条："用户拒绝，可重试" | q14 error-handling |
| **链未配置** | useAccount 返回的 `chain` 不在 config 内 | 黄条："链 ID X 未配置，请切回 Ethereum" | q13 chain-switch |
| **余额 RPC 失败** | useBalance `isError` | 重试 1 次后红条 | q08 read-vs-write |
| **断开后状态残留** | wagmi v2 已正确清理 | 不特殊处理（相信库） | — |
| **网络断开** | RPC 不可达 | useBalance 自动重试；>10s 显示红条 | q14 |

**原则**：所有错误用 `aria-live="polite"` 红条/黄条展示，**不用 toast**。教学场景需要可复制粘贴的错误文本，方便学习者提问。

## 6. 测试策略

### 6.1 单元测试（Vitest + Testing Library + happy-dom）

| 文件 | 组件 | 用例 |
| --- | --- | --- |
| `ConnectCard.test.tsx` | ConnectCard | 1) 未连 + 有 connector → 显示钱包按钮。2) 未连 + 无 connector → 显示降级。3) 已连 → 显示灰态。4) 点击连接 → 调用 mock `connector.connect`。5) 拒绝 → 红条。 |
| `AccountCard.test.tsx` | AccountCard | 1) 未连 → placeholder。2) 已连 → 显示地址/链/余额。3) 余额 loading → spinner。4) 不支持的链 → 黄条。 |
| `DisconnectCard.test.tsx` | DisconnectCard | 1) 未连 → hidden。2) 已连 → 显示按钮。3) 点击 → 调用 `disconnect()`。 |
| `TopicBadge.test.tsx` | TopicBadge | 1) 传 slug → 渲染指向正确 URL 的链接。 |

**Mock 策略**：用 wagmi v2 官方的 `mock` connector（不需要真钱包）：

```ts
import { createConfig, http } from 'wagmi';
import { mainnet } from 'viem/chains';
import { mock } from 'wagmi/connectors';

const testConfig = createConfig({
  chains: [mainnet],
  connectors: [mock({ accounts: ['0x...'] })],
  transports: { [mainnet.id]: http() },
});
```

### 6.2 E2E（暂不做 —— YAGNI）

Playwright 不能驱动真钱包扩展；`dappeteer` / `playwright-metamask` 引入巨大复杂度，覆盖增益边际。Mock connector 单测已覆盖同样的 hook 行为面。

### 6.3 手动视觉回归

每个阶段合并前，手动验证：
- Chrome + MetaMask 扩展：完整 connect / disconnect 流程
- Safari + MetaMask 扩展：跨浏览器
- 移动端 375px 宽度：布局不溢出
- 暗色模式：所有卡片双主题
- 亮色模式：所有卡片

## 7. 实施阶段

每个阶段 = 一个 commit。P1+P2 可并行（无依赖）。P3+P4+P5 可并行（兄弟卡片之间无依赖）。

| 阶段 | 内容 | 验证 |
| --- | --- | --- |
| **P1** | `pnpm add wagmi viem @tanstack/react-query`；创建 `src/lib/wagmi-config.ts`；更新 `package.json`；尚不改源码 | `pnpm check` 通过 |
| **P2** | 实现 `TopicBadge` + `AdvancedPlaceholder`（无 wagmi 依赖）+ 单测 | 单测绿 |
| **P3** | 实现 `ConnectCard`（含无钱包降级、拒绝红条）+ 单测（5 用例） | 单测绿 |
| **P4** | 实现 `AccountCard`（含 unsupported chain、余额 RPC 失败）+ 单测（4 用例） | 单测绿 |
| **P5** | 实现 `DisconnectCard` + 单测（3 用例） | 单测绿 |
| **P6** | 实现 `WalletLabApp`（Provider 编排）；创建 `src/pages/labs/wallet-connect.astro`；加 Header 导航 + index.astro 入口卡片 | `pnpm build` 产出 `/labs/wallet-connect/index.html` |
| **P7** | 暗色模式视觉打磨 + 手动跨浏览器测试（Chrome/Safari + MetaMask 扩展）；存截图 | 截图归档 |
| **P8** | 最终：`pnpm check && pnpm validate && pnpm test && pnpm build` 全绿；提交 | 全流水线绿 |

## 8. 成功标准

MVP 视为完成，**必须**全部满足：

1. ✅ `/labs/wallet-connect` 在生产构建中可访问
2. ✅ Chrome + MetaMask 扩展能完成：发现钱包 → 点击连接 → 授权 → 看到 address + chain + balance → 点击断开 → 状态清空
3. ✅ 三条错误路径显示清晰的 `aria-live` 提示：拒绝连接、不支持的链、余额 RPC 失败
4. ✅ 暗色模式 + 移动端 375px 双主题适配
5. ✅ 单测：4 个组件文件、≥12 用例、全绿
6. ✅ `/`、`/questions`、`/review` 的 bundle 增量 = 0 字节（per-route 隔离已验证）
7. ✅ `pnpm check && pnpm validate && pnpm test && pnpm build` 全绿

## 9. 风险与缓解

| 风险 | 概率 | 影响 | 缓解 |
| --- | --- | --- | --- |
| wagmi v2 + React 19 peer dep 冲突 | 中 | 高 | P1：`pnpm add` 后先跑现有测试套件。如有冲突，用 `--legacy-peer-deps` 或锁 wagmi 版本 |
| Astro `client:load` + `<WagmiProvider>` context 边界 | 低 | 中 | 单一 `<WalletLabApp>` island 包裹所有内容；不拆细粒度 island |
| Bundle 泄漏到 home / questions 路由 | 低 | 中 | 验证 `pnpm build` 输出 —— home chunk 必须不含 wagmi/viem |
| MetaMask 扩展 privacy mode 检测不到钱包 | 低 | 低 | ConnectCard 降级文案："请在 MetaMask 设置里打开站点访问" |

## 10. 范围外的未来工作

- WalletConnect v2 移动端扫码（当学习者需求足够大时，再投入 `projectId` 设置成本）
- SIWE 认证区（需后端，独立 spec）
- ERC20 读/写实验室（独立 spec，需决定测试网代币水龙头方案）
- UI 中切换"mock vs 真"钱包（目前 mock 仅用于测试；可暴露为"无钱包 demo 模式"）
- 每组件 Storybook（对当前范围过度）

---

> **说明**：本文档与 `2026-08-10-wallet-connect-demo-design.md`（英文版）内容等价，技术决策一致。如有歧义，以中文版为准（项目主语言中文）。
