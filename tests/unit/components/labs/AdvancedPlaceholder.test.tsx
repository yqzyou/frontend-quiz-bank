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
