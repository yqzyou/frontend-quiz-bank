// @vitest-environment happy-dom
import { describe, it, expect, beforeEach } from 'vitest';
import { render, screen } from '@testing-library/react';
import { Dashboard } from '@islands/Dashboard';
import { useProgressStore } from '@lib/progress-store';

describe('<Dashboard />', () => {
  beforeEach(() => {
    useProgressStore.getState().reset();
  });

  it('renders all zero stats on a fresh store', () => {
    render(<Dashboard />);
    expect(screen.getByText(/已答/)).toBeInTheDocument();
    expect(screen.getByText(/今日待复习/)).toBeInTheDocument();
    expect(screen.getByText(/已掌握/)).toBeInTheDocument();
    expect(screen.getByText(/学习中/)).toBeInTheDocument();
  });

  it('shows non-zero counts after recording activity', () => {
    useProgressStore.getState().recordAnswer('a', ['A'], true);
    useProgressStore.getState().recordAnswer('b', ['B'], false);
    useProgressStore.getState().recordRating('c', 'again', 0); // due immediately
    render(<Dashboard />);
    // answered tile value should be 2
    const answeredTile = screen.getByText('已答').closest('div')?.parentElement;
    expect(answeredTile?.querySelector('.text-2xl')?.textContent).toBe('2');
  });

  it('renders a CTA linking to /review', () => {
    render(<Dashboard />);
    const cta = screen.getByRole('link', { name: /开始复习/i });
    expect(cta).toHaveAttribute('href', '/review');
  });

  it('shows accuracy percentage derived from answered/correct', () => {
    useProgressStore.getState().recordAnswer('a', ['A'], true);
    useProgressStore.getState().recordAnswer('b', ['B'], false);
    render(<Dashboard />);
    // 正确率 tile value should be 50%
    const correctTile = screen.getByText('正确率').closest('div')?.parentElement;
    expect(correctTile?.querySelector('.text-2xl')?.textContent).toBe('50%');
  });

  it('handles divide-by-zero gracefully when no answers', () => {
    render(<Dashboard />);
    const correctTile = screen.getByText('正确率').closest('div')?.parentElement;
    expect(correctTile?.querySelector('.text-2xl')?.textContent).toBe('—');
  });

  it('shows bookmarks count', () => {
    useProgressStore.getState().toggleBookmark('a');
    useProgressStore.getState().toggleBookmark('b');
    render(<Dashboard />);
    const bookmarkTile = screen.getByText('收藏').closest('div')?.parentElement;
    expect(bookmarkTile?.querySelector('.text-2xl')?.textContent).toBe('2');
  });
});
