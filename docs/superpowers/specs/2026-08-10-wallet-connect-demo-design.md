# Wallet-Connect dApp Demo — Design Spec

> **Status**: Approved by user on 2026-08-10 (sections §1–§5 walked through one-by-one)
> **Scope**: MVP first; advanced sections placeholdered for future expansion
> **Implementation phases**: 8 commits (P1–P8)

---

## 1. Background & Motivation

The frontend-quiz-bank project currently has 15 web3 dApp-frontend questions in `src/content/questions/web3/w1-dapp-frontend/`, covering EIP-6963, signing, gas, call-vs-send, ethers-vs-viem, SIWE, personal-vs-typed, read-vs-write, ERC20 allowance, EIP-1559, wagmi useAccount, public-vs-wallet-client, chain-switch, error-handling, and event-listening.

Three of these (q05, q11, q12) **explicitly recommend** the stack `viem + wagmi v2` and demonstrate `useAccount` / `useConnect` / `useDisconnect` hooks. There is currently **no interactive demo** in the project that lets learners actually click through these hooks.

This spec defines an MVP demo that bridges "read the question" → "click the wallet" → "see wagmi v2 hooks fire in real time", with a clear path to extend toward advanced topics (read chain, sign, SIWE, ERC20).

## 2. Goals & Non-Goals

### Goals (MVP)

- **G1**: New page `/labs/wallet-connect` that loads wagmi v2 + viem only on this route.
- **G2**: Learner can complete the loop: discover EIP-6963 wallets → click connect → approve in wallet → see address + chain + balance → click disconnect → state cleared.
- **G3: Teaching-paired**: every interactive block carries a `<TopicBadge>` linking back to the relevant question(s).
- **G4: Graceful degradation** for learners without a wallet installed (teaching scenario).
- **G5: Dark mode + mobile** parity with the rest of the site.
- **G6: Zero bundle impact** on `/`, `/questions`, `/review` — wagmi/viem only hydrate on `/labs/wallet-connect`.

### Non-Goals (MVP, YAGNI)

- ❌ Write operations (`sendTransaction`, ERC20 `transfer`/`approve`) — real-money risk, no pedagogical value at this stage.
- ❌ WalletConnect v2 / multi-connector setup — needs cloud `projectId`, breaks zero-secret principle.
- ❌ SIWE authentication — needs backend, out of scope.
- ❌ E2E tests — Playwright cannot drive a real wallet extension; `dappeteer` is heavyweight. Mock-connector unit tests cover the same behavioral surface.
- ❌ Connection UI kits (RainbowKit / ConnectKit / Web3Modal) — black-box, contradicts "teach from primitives" stance of q01/q11.
- ❌ Mobile deep-linking, i18n (Chinese only).

### Future Expansion (Placeholdered)

These will appear as grayed-out `<AdvancedPlaceholder>` cards in MVP, then get replaced:

- **Read chain** → `useBalance` on arbitrary address, `getBlockNumber`, ENS lookup (q08, q12)
- **Sign message** → `signMessage` / `signTypedData`, show recovered address (q02, q06, q07)
- **Chain switch** → `useSwitchChain`, event listening for `chainChanged` (q13, q15)
- **SIWE** → full login flow (q06)
- **ERC20 allowance** → `readContract` + `writeContract` on a testnet ERC20 (q09)

## 3. Architecture

### 3.1 Routing

- **Path**: `/labs/wallet-connect` (file: `src/pages/labs/wallet-connect.astro`)
- **Why `/labs/` prefix**: signals "lab" semantics, leaves room for `/labs/siwe`, `/labs/erc20-allowance`, etc. without future routing refactor.
- **Navigation**: add a `实验室` link to `Header.astro` main nav; add a "动手实验室" entry card to `index.astro` hero.
- **Sitemap**: automatically picked up by `@astrojs/sitemap` (no config change).

### 3.2 File Structure (new + modified)

```text
src/
├── pages/labs/
│   └── wallet-connect.astro              # NEW: SSR shell, renders <WalletLabApp client:load />
├── components/islands/labs/
│   ├── WalletLabApp.tsx                  # NEW: provider + sub-component orchestration
│   ├── ConnectCard.tsx                   # NEW: connect + EIP-6963 detection + no-wallet fallback
│   ├── AccountCard.tsx                   # NEW: address / chain / balance display
│   ├── DisconnectCard.tsx                # NEW: disconnect + cleanup
│   ├── TopicBadge.tsx                    # NEW: "🔗 web3-w1-q11" link badge
│   └── AdvancedPlaceholder.tsx           # NEW: grayed-out placeholder for future sections
├── lib/
│   └── wagmi-config.ts                   # NEW: createConfig (single instance)
└── tests/unit/components/labs/
    ├── ConnectCard.test.tsx              # NEW: 5 cases
    ├── AccountCard.test.tsx              # NEW: 4 cases
    ├── DisconnectCard.test.tsx           # NEW: 3 cases
    └── TopicBadge.test.tsx               # NEW: 1 case
```

Modified files:
- `src/components/Header.astro` — add 实验室 nav link
- `src/pages/index.astro` — add labs entry card to hero
- `package.json` — add `wagmi`, `viem`, `@tanstack/react-query` dependencies

### 3.3 Data Flow

```
MetaMask (or any EIP-1193 wallet)
   ↓ EIP-1193 + EIP-6963
injected() connector (single instance)
   ↓
wagmi createConfig (single instance, src/lib/wagmi-config.ts)
   ↓ store (account / chain / status / balance)
<WagmiProvider> (top of WalletLabApp.tsx)
<QueryClientProvider> (wagmi peer dep)
   ↓ React Context
<ConnectCard />  <AccountCard />  <DisconnectCard />
   ↓ useAccount() / useBalance() / useChainId() / useConnect() / useDisconnect()
UI
```

**Critical**: `wagmiConfig` is created once at module scope in `src/lib/wagmi-config.ts`. Components import the singleton; no per-render recreation.

### 3.4 Bundle Impact

| Dependency | gzip estimate | Required |
| --- | --- | --- |
| `wagmi` ^2.14 | ~25kb | yes |
| `viem` ^2.21 | ~35kb (tree-shaken) | yes |
| `@tanstack/react-query` ^5 | ~12kb (wagmi peer dep) | yes |
| **Total** | **~72kb gzip** | only loaded on `/labs/wallet-connect` |

Astro's per-route island bundling guarantees: visiting `/`, `/questions`, `/review` downloads **zero** bytes of wagmi/viem.

## 4. Component Specs

### 4.1 `<WalletLabApp />` (~50 lines)

**Responsibility**: wrap providers, render three interactive cards + advanced placeholders.

**Pseudo-signature**:
```tsx
interface WalletLabAppProps {}  // no props, config is module-level singleton

export function WalletLabApp(): JSX.Element
```

**Renders**:
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

### 4.2 `<ConnectCard />` (~80 lines, with no-wallet fallback)

**Responsibility**:
1. `useConnect()` → connectors + connect mutation
2. `useAccount()` → status check
3. `useConnectors()` → list of available EIP-6963-discovered connectors
4. **States**:
   - Connected → card shows "已连接" gray-state, hint to look at AccountCard
   - Disconnected + connectors detected → list wallet buttons
   - Disconnected + no connectors → "未检测到钱包" + MetaMask install link (teaching fallback)
5. **Errors**:
   - `connect()` rejection (code 4001) → red banner: "用户拒绝，可重试"
   - Connector already connected → silent (wagmi dedupes)

**TopicBadge**: `web3-w1-q01` (EIP-6963) + `web3-w1-q11` (useAccount/useConnect)

### 4.3 `<AccountCard />` (~90 lines)

**Responsibility**:
1. `useAccount()` → `address`, `chain`, `status`
2. `useBalance({ address })` → `data: { formatted, symbol }`, `isLoading`, `isError`
3. Address formatting: `0x1234...5678` (first 6 / last 4 chars), copy-to-clipboard button
4. Chain display: `chain.name` + native currency symbol
5. **States**:
   - Disconnected → placeholder gray-state
   - Connected + supported chain → show all
   - Connected + unsupported chain (e.g., BSC, Polygon if not in config) → yellow banner: "链 ID X 未配置，请切回 Ethereum"
6. **Errors**:
   - balance RPC failure → retry once, then red banner: "余额获取失败"

**TopicBadge**: `web3-w1-q12` (public-vs-wallet-client) + `web3-w1-q08` (read-vs-write)

### 4.4 `<DisconnectCard />` (~40 lines)

**Responsibility**: `useDisconnect()`, show button when connected, hide card entirely when disconnected.

**TopicBadge**: `web3-w1-q11`

**Subtle UX note**: wagmi v2's `disconnect()` only clears wagmi state — it does NOT trigger MetaMask's "disconnect site" UI. Card includes small print explaining this, so learners don't get confused.

### 4.5 `<TopicBadge slug="web3-w1-q11" />` (~15 lines)

**Pseudo-signature**:
```tsx
interface TopicBadgeProps {
  slug: string;  // e.g. 'web3-w1-q11'
}

export function TopicBadge({ slug }: TopicBadgeProps): JSX.Element
```

**Behavior**: slug → URL resolution via build-time reverse lookup from `loadAllQuestions()`, cached at module scope. Renders as a small `🔗 web3-w1-q11` link to `/questions/web3/<...>/<slug>`.

### 4.6 `<AdvancedPlaceholder section="read" />` (~30 lines)

**Pseudo-signature**:
```tsx
type AdvancedSection = 'read' | 'sign' | 'chain-switch' | 'siwe' | 'erc20';

interface AdvancedPlaceholderProps {
  section: AdvancedSection;
}

export function AdvancedPlaceholder({ section }: AdvancedPlaceholderProps): JSX.Element
```

**Behavior**: renders a grayed-out, non-interactive card frame with title + "未来将演示 X，对应 web3-w1-qYY" + "敬请期待". When the future implements that section, swap this component for the real one — no layout work needed.

## 5. Error Handling Matrix

| Scenario | Trigger | Behavior | Teaching link |
| --- | --- | --- | --- |
| **No wallet installed** | EIP-6963 announce empty | ConnectCard shows "未检测到钱包" + MetaMask install link | q01 EIP-6963 |
| **User rejects connect** | `connect()` reject code 4001 | Red banner: "用户拒绝，可重试" | q14 error-handling |
| **Unsupported chain** | useAccount `chain` not in config | Yellow banner: "链 ID X 未配置，请切回 Ethereum" | q13 chain-switch |
| **Balance RPC failure** | useBalance `isError` | Retry once, then red banner | q08 read-vs-write |
| **Disconnect state residue** | wagmi v2 already cleans up correctly | No special handling (trust the library) | — |
| **Network offline** | RPC unreachable | useBalance auto-retries; >10s shows red banner | q14 |

**Principle**: all errors render as `aria-live="polite"` banners (red/yellow), never toasts. Teaching scenarios need copy-pasteable error text for learners to ask questions.

## 6. Testing Strategy

### 6.1 Unit Tests (Vitest + Testing Library + happy-dom)

| File | Component | Cases |
| --- | --- | --- |
| `ConnectCard.test.tsx` | ConnectCard | 1) Disconnected + connectors → wallet buttons. 2) Disconnected + no connectors → fallback. 3) Connected → gray-state. 4) Click connect → mock `connector.connect` called. 5) Reject → red banner. |
| `AccountCard.test.tsx` | AccountCard | 1) Disconnected → placeholder. 2) Connected → address/chain/balance. 3) Balance loading → spinner. 4) Unsupported chain → yellow banner. |
| `DisconnectCard.test.tsx` | DisconnectCard | 1) Disconnected → hidden. 2) Connected → button. 3) Click → `disconnect()` called. |
| `TopicBadge.test.tsx` | TopicBadge | 1) Pass slug → renders link to correct URL. |

**Mock strategy**: wagmi v2 official `mock` connector (no real wallet needed):

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

### 6.2 E2E (Skipped — YAGNI)

Playwright cannot drive a real wallet extension. `dappeteer`/`playwright-metamask` introduce large complexity for marginal coverage gain. Mock-connector unit tests cover the same hook-behavior surface.

### 6.3 Manual Visual Regression

Before merging each phase, manually verify on:
- Chrome + MetaMask extension: full connect / disconnect loop
- Safari + MetaMask extension: cross-browser
- Mobile width 375px: layout doesn't overflow
- Dark mode: all cards double-theme
- Light mode: all cards

## 7. Implementation Phases

Each phase = one commit. P1+P2 parallelizable (no deps). P3+P4+P5 parallelizable (no deps between sibling cards).

| Phase | Content | Verify |
| --- | --- | --- |
| **P1** | `pnpm add wagmi viem @tanstack/react-query`; create `src/lib/wagmi-config.ts`; update `package.json`; no source changes yet | `pnpm check` passes |
| **P2** | Implement `TopicBadge` + `AdvancedPlaceholder` (no wagmi deps); unit tests | unit tests green |
| **P3** | Implement `ConnectCard` (incl. no-wallet fallback, reject banner); unit tests (5 cases) | unit tests green |
| **P4** | Implement `AccountCard` (incl. unsupported chain, balance RPC failure); unit tests (4 cases) | unit tests green |
| **P5** | Implement `DisconnectCard`; unit tests (3 cases) | unit tests green |
| **P6** | Implement `WalletLabApp` (provider orchestration); create `src/pages/labs/wallet-connect.astro`; add Header nav link + index.astro entry card | `pnpm build` produces `/labs/wallet-connect/index.html` |
| **P7** | Dark mode visual polish + manual cross-browser test (Chrome/Safari + MetaMask extension); save screenshots | screenshots archived |
| **P8** | Final: `pnpm check && pnpm validate && pnpm test && pnpm build` all green; commit | full pipeline green |

## 8. Success Criteria

MVP is considered complete iff all of:

1. ✅ `/labs/wallet-connect` accessible in production build
2. ✅ Chrome + MetaMask extension can: discover wallet → click connect → approve → see address + chain + balance → click disconnect → state cleared
3. ✅ Three error paths show clear `aria-live` banners: reject connect, unsupported chain, balance RPC failure
4. ✅ Dark mode + mobile 375px parity
5. ✅ Unit tests: 4 component files, ≥12 cases, all green
6. ✅ Bundle delta on `/`, `/questions`, `/review` = 0 bytes (per-route isolation verified)
7. ✅ `pnpm check && pnpm validate && pnpm test && pnpm build` all green

## 9. Risks & Mitigations

| Risk | Probability | Impact | Mitigation |
| --- | --- | --- | --- |
| wagmi v2 + React 19 peer dep conflict | medium | high | P1: after `pnpm add`, run existing test suite first. If conflict, try `--legacy-peer-deps` or pin wagmi version |
| Astro `client:load` + `<WagmiProvider>` context boundary | low | medium | Single `<WalletLabApp>` island wraps everything; do not split into multiple islands |
| Bundle leak to home / questions routes | low | medium | Verify `pnpm build` output — home chunk must NOT contain wagmi/viem |
| MetaMask extension privacy mode hides wallet | low | low | ConnectCard fallback copy: "请在 MetaMask 设置里打开站点访问" |

## 10. Out-of-Scope Future Work

- WalletConnect v2 mobile scanning (when learner demand justifies `projectId` setup)
- SIWE authenticated area (needs backend, separate spec)
- ERC20 read/write lab (separate spec, needs testnet token faucet decision)
- Mock-vs-real wallet toggle in UI (currently mock only in tests; could expose for "no-wallet demo mode")
- Per-component Storybook (overkill for this scope)
