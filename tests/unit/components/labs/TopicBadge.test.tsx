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
