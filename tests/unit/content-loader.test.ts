import { describe, it, expect, beforeAll } from 'vitest';
import { loadAllQuestions, loadQuestionBySlug, parseQuestionFile } from '@lib/content-loader';
import { resolve } from 'path';

const FIXTURES = resolve(__dirname, '../fixtures/content');
const INVALID_FIXTURES = resolve(__dirname, '../fixtures/content-invalid');

describe('parseQuestionFile', () => {
  it('parses a valid choice question MDX', () => {
    const result = parseQuestionFile(`${FIXTURES}/frontend/w1-react-basics/q01-valid.mdx`);
    expect(result.frontmatter.id).toBe('fe-w1-q01');
    expect(result.frontmatter.category).toBe('frontend');
    expect(result.frontmatter.status).toBe('reviewed');
    expect(result.options).toHaveLength(4);
    expect(result.options[0]).toEqual({ key: 'A', text: 'A reusable UI primitive', correct: true });
    expect(result.explanation).toContain('Components are');
  });

  it('parses multi-choice question with [correct] marker', () => {
    const result = parseQuestionFile(`${FIXTURES}/frontend/w1-react-basics/q10-multi-valid.mdx`);
    expect(result.frontmatter.type).toBe('multi-choice');
    expect(result.options).toHaveLength(4);
    expect(result.options.filter(o => o.correct)).toHaveLength(2);
    expect(result.options[0]).toEqual({ key: 'A', text: 'useState', correct: true });
    expect(result.options[1]).toEqual({ key: 'B', text: 'useEffect', correct: true });
    expect(result.options[2]).toEqual({ key: 'C', text: 'useFetch', correct: false });
  });

  it('parses interview question with referenceAnswer and references', () => {
    const result = parseQuestionFile(`${FIXTURES}/frontend/w1-react-basics/q11-interview.mdx`);
    expect(result.frontmatter.type).toBe('interview');
    expect(result.options).toHaveLength(0);
    expect(result.referenceAnswer).toContain('reconciliation');
    expect(result.references).toBeDefined();
    expect(result.references?.length).toBe(2);
  });

  it('throws on missing required frontmatter field', () => {
    expect(() =>
      parseQuestionFile(`${INVALID_FIXTURES}/q02-missing-status.mdx`)
    ).toThrow(/status/);
  });

  it('throws on invalid category', () => {
    expect(() =>
      parseQuestionFile(`${INVALID_FIXTURES}/q03-invalid-category.mdx`)
    ).toThrow(/Invalid category/);
  });

  it('throws on invalid status', () => {
    expect(() =>
      parseQuestionFile(`${INVALID_FIXTURES}/q04-invalid-status.mdx`)
    ).toThrow(/Invalid status/);
  });

  it('throws when status=reviewed but no reviewer', () => {
    expect(() =>
      parseQuestionFile(`${INVALID_FIXTURES}/q05-reviewed-no-reviewer.mdx`)
    ).toThrow(/reviewer/);
  });

  it('throws when choice question has no options section', () => {
    expect(() =>
      parseQuestionFile(`${INVALID_FIXTURES}/q06-no-options-section.mdx`)
    ).toThrow(/"## 选项" section/);
  });

  it('throws when choice question has fewer than 2 options', () => {
    expect(() =>
      parseQuestionFile(`${INVALID_FIXTURES}/q07-too-few-options.mdx`)
    ).toThrow(/at least 2 options/);
  });

  it('throws when choice question has zero correct markers', () => {
    expect(() =>
      parseQuestionFile(`${INVALID_FIXTURES}/q08-choice-no-correct.mdx`)
    ).toThrow(/exactly 1 correct/);
  });

  it('throws when multi-choice question has only one correct', () => {
    expect(() =>
      parseQuestionFile(`${INVALID_FIXTURES}/q09-multi-too-few-correct.mdx`)
    ).toThrow(/multi-choice question requires at least 2 correct/);
  });

  it('throws when week is not a positive integer', () => {
    expect(() =>
      parseQuestionFile(`${INVALID_FIXTURES}/q10-bad-week.mdx`)
    ).toThrow(/week must be a positive integer/);
  });

  it('throws when tags is not an array', () => {
    expect(() =>
      parseQuestionFile(`${INVALID_FIXTURES}/q11-tags-not-array.mdx`)
    ).toThrow(/tags must be an array/);
  });

  it('throws when type is invalid', () => {
    expect(() =>
      parseQuestionFile(`${INVALID_FIXTURES}/q12-bad-type.mdx`)
    ).toThrow(/Invalid type/);
  });

  it('throws when difficulty is invalid', () => {
    expect(() =>
      parseQuestionFile(`${INVALID_FIXTURES}/q13-bad-difficulty.mdx`)
    ).toThrow(/Invalid difficulty/);
  });

  it('throws when language is invalid', () => {
    expect(() =>
      parseQuestionFile(`${INVALID_FIXTURES}/q14-bad-language.mdx`)
    ).toThrow(/Invalid language/);
  });
});

describe('loadAllQuestions', () => {
  beforeAll(() => {
    process.env.CONTENT_ROOT = FIXTURES;
  });

  it('returns all questions across categories', () => {
    const all = loadAllQuestions();
    expect(all.length).toBe(4);
    expect(all.some(q => q.frontmatter.category === 'frontend')).toBe(true);
    expect(all.some(q => q.frontmatter.category === 'web3')).toBe(true);
  });

  it('filters by category', () => {
    const web3 = loadAllQuestions({ category: 'web3' });
    expect(web3.length).toBe(1);
    expect(web3.every(q => q.frontmatter.category === 'web3')).toBe(true);
  });

  it('filters by status', () => {
    const reviewed = loadAllQuestions({ status: 'reviewed' });
    expect(reviewed.length).toBe(3);
    expect(reviewed.every(q => q.frontmatter.status === 'reviewed')).toBe(true);
  });

  it('sorts by week then id', () => {
    const all = loadAllQuestions();
    for (let i = 1; i < all.length; i++) {
      const prev = all[i - 1].frontmatter;
      const curr = all[i].frontmatter;
      expect(
        prev.week < curr.week ||
        (prev.week === curr.week && prev.id <= curr.id)
      ).toBe(true);
    }
  });

  it('returns empty array when content root does not exist', () => {
    process.env.CONTENT_ROOT = '/nonexistent/path/that/does/not/exist';
    const all = loadAllQuestions();
    expect(all).toEqual([]);
    process.env.CONTENT_ROOT = FIXTURES;
  });
});

describe('loadQuestionBySlug', () => {
  it('returns null for unknown slug', () => {
    process.env.CONTENT_ROOT = FIXTURES;
    expect(loadQuestionBySlug('does-not-exist')).toBeNull();
  });

  it('returns question for known slug', () => {
    process.env.CONTENT_ROOT = FIXTURES;
    const q = loadQuestionBySlug('frontend/w1-react-basics/q01-valid');
    expect(q?.frontmatter.id).toBe('fe-w1-q01');
  });
});
