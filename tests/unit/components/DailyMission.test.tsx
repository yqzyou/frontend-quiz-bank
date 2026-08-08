// @vitest-environment happy-dom
import { describe, it, expect, beforeEach } from 'vitest';
import { render, screen } from '@testing-library/react';
import { DailyMission } from '@islands/DailyMission';
import { useProgressStore } from '@lib/progress-store';

describe('<DailyMission />', () => {
  beforeEach(() => {
    useProgressStore.getState().reset();
  });

  it('renders an empty state when candidates is empty', () => {
    render(<DailyMission allSlugs={[]} missionSize={3} now={1_700_000_000_000} />);
    expect(screen.getByText(/今日任务/)).toBeInTheDocument();
    expect(screen.getByText(/暂无题目/)).toBeInTheDocument();
  });

  it('renders up to missionSize question links', () => {
    render(
      <DailyMission
        allSlugs={['a', 'b', 'c', 'd', 'e']}
        missionSize={3}
        now={1_700_000_000_000}
      />,
    );
    const links = screen.getAllByRole('link');
    const questionLinks = links.filter((l) => l.getAttribute('href')?.startsWith('/questions/'));
    expect(questionLinks.length).toBe(3);
  });

  it('shows progress as completed / total', () => {
    useProgressStore.getState().ensureDailyMission(['a', 'b', 'c'], 3, 1_700_000_000_000);
    useProgressStore.getState().recordAnswer('a', ['A'], true, 1_700_000_000_000);
    render(<DailyMission allSlugs={['a', 'b', 'c']} missionSize={3} now={1_700_000_000_000} />);
    expect(screen.getByText('1 / 3')).toBeInTheDocument();
  });

  it('marks completed slugs with a check', () => {
    useProgressStore.getState().ensureDailyMission(['a', 'b', 'c'], 3, 1_700_000_000_000);
    useProgressStore.getState().recordAnswer('a', ['A'], true, 1_700_000_000_000);
    render(<DailyMission allSlugs={['a', 'b', 'c']} missionSize={3} now={1_700_000_000_000} />);
    const aLink = screen.getByText(/a/).closest('a');
    expect(aLink?.getAttribute('data-completed')).toBe('true');
  });

  it('does not regenerate mission on re-render same day', () => {
    const { rerender } = render(
      <DailyMission allSlugs={['a', 'b', 'c']} missionSize={3} now={1_700_000_000_000} />,
    );
    const first = screen.getByText(/今日任务/).closest('section')?.textContent;
    rerender(
      <DailyMission allSlugs={['a', 'b', 'c']} missionSize={3} now={1_700_000_000_000 + 60_000} />,
    );
    const second = screen.getByText(/今日任务/).closest('section')?.textContent;
    expect(second).toBe(first);
  });

  it('renders all candidates when fewer than missionSize', () => {
    render(
      <DailyMission allSlugs={['a', 'b']} missionSize={5} now={1_700_000_000_000} />,
    );
    const links = screen.getAllByRole('link');
    const questionLinks = links.filter((l) => l.getAttribute('href')?.startsWith('/questions/'));
    expect(questionLinks.length).toBe(2);
  });

  it('shows 100% completion banner when all done', () => {
    useProgressStore.getState().ensureDailyMission(['a', 'b'], 2, 1_700_000_000_000);
    useProgressStore.getState().recordAnswer('a', ['A'], true, 1_700_000_000_000);
    useProgressStore.getState().recordAnswer('b', ['B'], true, 1_700_000_000_000);
    render(<DailyMission allSlugs={['a', 'b']} missionSize={2} now={1_700_000_000_000} />);
    expect(screen.getByText(/全部完成|已完成今日任务|🎉|✨/)).toBeInTheDocument();
  });
});
