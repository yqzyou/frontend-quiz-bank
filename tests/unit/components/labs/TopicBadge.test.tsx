// @vitest-environment happy-dom
/**
 * TopicBadge 测试约束（控制器决议，code-quality review 折衷）：
 *
 * 1. **IIFE 模块级缓存**：`TopicBadge.tsx` 的 `ID_TO_SLUG` 是模块作用域 IIFE，
 *    首次 import 时同步执行 `loadAllQuestions()` 构建只读 Map。
 *    本测试文件**不 mock `loadAllQuestions`**（用真实 content 目录）。
 *    如未来需 mock，必须先把 IIFE 重构成惰性函数（lazy + cache + reset）。
 *
 * 2. **fixture 同步**：`web3-w1-q11` 必须与
 *    `src/content/questions/web3/w1-dapp-frontend/q11-wagmi-useaccount.mdx`
 *    的 `frontmatter.id` 保持一致。若该 mdx 被删除/改名，测试会断。
 */
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
