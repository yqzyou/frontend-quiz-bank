// @vitest-environment happy-dom
import { describe, it, expect, beforeEach } from 'vitest';
import { screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { renderWithWagmi } from './helpers';
import { DisconnectCard } from '@islands/labs/DisconnectCard';
import { useConnect } from 'wagmi';

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
    // Node 22+ 守卫：原生 localStorage 遮蔽 happy-dom，clear 可能不存在
    if (typeof globalThis.localStorage?.clear === 'function') {
      localStorage.clear();
    }
  });

  it('is hidden when disconnected', () => {
    const { container } = renderWithWagmi(<DisconnectCard />);
    // 未连时整张卡用 null 返回实现隐藏
    expect(container.firstChild).toBeNull();
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
