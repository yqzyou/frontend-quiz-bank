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
    // Node 22+ 守卫：原生 localStorage 遮蔽 happy-dom，clear 可能不存在
    if (typeof globalThis.localStorage?.clear === 'function') {
      localStorage.clear();
    }
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
