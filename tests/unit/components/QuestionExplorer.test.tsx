// @vitest-environment happy-dom
import { describe, it, expect, beforeEach } from 'vitest';
import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { QuestionExplorer, type ExplorerQuestion } from '@islands/QuestionExplorer';

function buildQuestion(overrides: Partial<ExplorerQuestion> = {}): ExplorerQuestion {
  return {
    slug: 'fe-w1-q01-react-closure',
    title: 'React 闭包陷阱',
    question: '为什么 setState 看到的是旧值？',
    category: 'frontend',
    sub_category: 'react-basics',
    week: 1,
    status: 'reviewed',
    difficulty: 'intermediate',
    type: 'choice',
    tags: ['react', 'hooks'],
    ...overrides,
  };
}

const sampleQuestions: ExplorerQuestion[] = [
  buildQuestion(),
  buildQuestion({
    slug: 'web3-w1-q01-eip6963',
    title: 'EIP-6963：window.ethereum 不够了',
    question: '钱包发现的 issue 是什么？',
    category: 'web3',
    sub_category: 'dapp-frontend',
    tags: ['eip6963', 'wallet'],
  }),
  buildQuestion({
    slug: 'remote-w1-q01-async',
    title: 'Async-first 异步优先',
    question: '远程团队为什么需要异步沟通？',
    category: 'remote',
    sub_category: 'async-collaboration',
    tags: ['async', 'culture'],
  }),
  buildQuestion({
    slug: 'frontend-w1-q06-stale-closure',
    title: 'Stale Closure 反模式',
    question: 'useEffect 里的过期闭包如何识别？',
    category: 'frontend',
    sub_category: 'react-basics',
    status: 'draft',
    week: 1,
    tags: ['react', 'use-effect'],
  }),
];

describe('<QuestionExplorer />', () => {
  beforeEach(() => {
    if (typeof window !== 'undefined') {
      window.history.replaceState(null, '', '/questions');
    }
  });

  it('renders all questions by default', () => {
    render(<QuestionExplorer questions={sampleQuestions} />);
    expect(screen.getByText(/显示/).textContent).toContain('4');
    expect(screen.getByText('React 闭包陷阱')).toBeInTheDocument();
    expect(screen.getByText('EIP-6963：window.ethereum 不够了')).toBeInTheDocument();
  });

  it('filters by keyword in title', async () => {
    const user = userEvent.setup();
    render(<QuestionExplorer questions={sampleQuestions} />);
    const input = screen.getByLabelText('搜索关键词');
    await user.type(input, '闭包');

    expect(screen.getByText('闭包')).toBeInTheDocument();
    expect(screen.queryByText('EIP-6963：window.ethereum 不够了')).not.toBeInTheDocument();
    expect(screen.queryByText('Async-first 异步优先')).not.toBeInTheDocument();
  });

  it('filters by tag', async () => {
    const user = userEvent.setup();
    render(<QuestionExplorer questions={sampleQuestions} />);
    await user.type(screen.getByLabelText('搜索关键词'), 'react');

    expect(screen.getByText('React 闭包陷阱')).toBeInTheDocument();
    expect(screen.getByText('Stale Closure 反模式')).toBeInTheDocument();
    expect(screen.queryByText('EIP-6963：window.ethereum 不够了')).not.toBeInTheDocument();
  });

  it('filters by category tab', async () => {
    const user = userEvent.setup();
    render(<QuestionExplorer questions={sampleQuestions} />);
    await user.click(screen.getByRole('button', { name: /Web3/ }));

    expect(screen.queryByText('React 闭包陷阱')).not.toBeInTheDocument();
    expect(screen.getByText('EIP-6963：window.ethereum 不够了')).toBeInTheDocument();
  });

  it('category tab shows per-category count', () => {
    render(<QuestionExplorer questions={sampleQuestions} />);
    const frontendTab = screen.getByRole('button', { name: /前端/ });
    expect(frontendTab.textContent).toMatch(/2/);
  });

  it('combines search + category filter', async () => {
    const user = userEvent.setup();
    render(<QuestionExplorer questions={sampleQuestions} />);
    await user.click(screen.getByRole('button', { name: /前端/ }));
    await user.type(screen.getByLabelText('搜索关键词'), '旧值');

    await waitFor(() => {
      expect(screen.getByText('React 闭包陷阱')).toBeInTheDocument();
      expect(screen.queryByText('Stale Closure 反模式')).not.toBeInTheDocument();
    });
  });

  it('filters by status select', async () => {
    const user = userEvent.setup();
    render(<QuestionExplorer questions={sampleQuestions} />);
    await user.selectOptions(screen.getByLabelText('按状态筛选'), 'draft');

    expect(screen.queryByText('React 闭包陷阱')).not.toBeInTheDocument();
    expect(screen.getByText('Stale Closure 反模式')).toBeInTheDocument();
  });

  it('shows empty state when no match', async () => {
    const user = userEvent.setup();
    render(<QuestionExplorer questions={sampleQuestions} />);
    await user.type(screen.getByLabelText('搜索关键词'), 'zzznomatch');

    expect(screen.getByText(/没找到匹配的题目/)).toBeInTheDocument();
    expect(screen.getByText('清空所有筛选')).toBeInTheDocument();
  });

  it('clear button resets all filters', async () => {
    const user = userEvent.setup();
    render(<QuestionExplorer questions={sampleQuestions} />);
    await user.type(screen.getByLabelText('搜索关键词'), 'react');
    expect(screen.queryByText('EIP-6963：window.ethereum 不够了')).not.toBeInTheDocument();

    await user.click(screen.getByRole('button', { name: '清空筛选' }));
    expect(screen.getByText('EIP-6963：window.ethereum 不够了')).toBeInTheDocument();
  });

  it('search clear ✕ button empties input', async () => {
    const user = userEvent.setup();
    render(<QuestionExplorer questions={sampleQuestions} />);
    const input = screen.getByLabelText('搜索关键词') as HTMLInputElement;
    await user.type(input, 'react');
    expect(input.value).toBe('react');

    await user.click(screen.getByRole('button', { name: '清空搜索' }));
    expect(input.value).toBe('');
  });

  it('syncs URL query params after filter change', async () => {
    const user = userEvent.setup();
    render(<QuestionExplorer questions={sampleQuestions} />);
    await user.click(screen.getByRole('button', { name: /前端/ }));

    expect(window.location.search).toContain('category=frontend');
  });
});
