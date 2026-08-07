import { describe, it, expect } from 'vitest';
import { validateContentDir } from '../../scripts/validate.mjs';
import { resolve } from 'path';
import { fileURLToPath } from 'node:url';

const __dirname = fileURLToPath(new URL('.', import.meta.url));
const FIXTURES = resolve(__dirname, '../fixtures/content');
const DUP_FIXTURES = resolve(__dirname, '../fixtures/content-duplicates');
const INVALID_FIXTURES = resolve(__dirname, '../fixtures/content-invalid');

describe('validateContentDir', () => {
  it('returns no errors for a single valid file', async () => {
    const errors = await validateContentDir(`${FIXTURES}/frontend/w1-react-basics/q01-valid.mdx`);
    expect(errors).toEqual([]);
  });

  it('returns errors for duplicate ids', async () => {
    const errors = await validateContentDir([
      `${FIXTURES}/frontend/w1-react-basics/q01-valid.mdx`,
      `${DUP_FIXTURES}/q01-duplicate-id.mdx`,
    ]);
    expect(errors.some(e => e.includes('Duplicate id'))).toBe(true);
  });

  it('returns multiple errors for invalid frontmatter', async () => {
    const errors = await validateContentDir(`${INVALID_FIXTURES}/q11-tags-not-array.mdx`);
    expect(errors.some(e => e.includes('tags must be an array'))).toBe(true);
  });
});
