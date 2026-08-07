import fs from 'node:fs';
import path from 'node:path';
import matter from 'gray-matter';
import type { Frontmatter, ParsedQuestion, ChoiceOption, Category, Status } from './types';

const REQUIRED_FIELDS: (keyof Frontmatter)[] = [
  'id', 'title', 'category', 'sub_category', 'week', 'difficulty',
  'type', 'tags', 'source', 'status', 'language', 'last_updated',
];

const VALID_STATUS: Status[] = ['reviewed', 'draft', 'needs-review'];
const VALID_CATEGORIES: Category[] = ['frontend', 'web3', 'remote'];

function getContentRoot(): string {
  return process.env.CONTENT_ROOT || path.resolve(process.cwd(), 'content');
}

function parseOptions(body: string): { options: ChoiceOption[]; bodySansOptions: string } {
  const options: ChoiceOption[] = [];
  for (const line of body.split('\n')) {
    const m = line.match(/^([A-Z])\.\s+(.+)$/);
    if (!m) continue;
    const key = m[1];
    let text = m[2].trim();
    let correct = false;
    if (text.endsWith(' ✓')) {
      correct = true;
      text = text.slice(0, -2).trim();
    } else if (text.endsWith(' [correct]')) {
      correct = true;
      text = text.slice(0, -' [correct]'.length).trim();
    }
    options.push({ key, text, correct });
  }
  return { options, bodySansOptions: body };
}

function extractSection(body: string, header: string): string {
  const re = new RegExp(`(?:^|\\n)##\\s+${header}[ \\t]*\\r?\\n([\\s\\S]*?)(?=\\r?\\n##\\s|$)`);
  const m = body.match(re);
  return m ? m[1].trim() : '';
}

function validateFrontmatter(fm: Record<string, unknown>, filePath: string): Frontmatter {
  for (const field of REQUIRED_FIELDS) {
    if (!(field in fm) || fm[field] === undefined || fm[field] === null) {
      throw new Error(`[${filePath}] Missing required frontmatter field: ${field}`);
    }
  }
  if (!VALID_CATEGORIES.includes(fm.category as Category)) {
    throw new Error(`[${filePath}] Invalid category: ${fm.category}`);
  }
  if (!VALID_STATUS.includes(fm.status as Status)) {
    throw new Error(`[${filePath}] Invalid status: ${fm.status}`);
  }
  if (fm.status === 'reviewed' && !fm.reviewer) {
    throw new Error(`[${filePath}] status=reviewed requires reviewer field`);
  }
  return fm as unknown as Frontmatter;
}

export function parseQuestionFile(filePath: string): ParsedQuestion {
  const raw = fs.readFileSync(filePath, 'utf-8');
  const { data, content } = matter(raw);
  const frontmatter = validateFrontmatter(data, filePath);

  const question = extractSection(content, '题目');
  const explanation = extractSection(content, '解析');
  const referenceAnswer = extractSection(content, '参考答案') || undefined;
  const referencesBlock = extractSection(content, '参考');
  const references = referencesBlock
    ? referencesBlock.split('\n').map(l => l.trim()).filter(l => l.startsWith('-'))
    : undefined;

  let options: ChoiceOption[] = [];
  if (frontmatter.type === 'choice' || frontmatter.type === 'multi-choice') {
    const optSection = extractSection(content, '选项');
    if (!optSection) {
      throw new Error(`[${filePath}] choice/multi-choice question requires "## 选项" section`);
    }
    options = parseOptions(optSection).options;
    if (options.length < 2) {
      throw new Error(`[${filePath}] choice question requires at least 2 options`);
    }
    if (frontmatter.type === 'choice' && options.filter(o => o.correct).length !== 1) {
      throw new Error(`[${filePath}] choice question requires exactly 1 correct option`);
    }
    if (frontmatter.type === 'multi-choice' && options.filter(o => o.correct).length < 2) {
      throw new Error(`[${filePath}] multi-choice question requires at least 2 correct options`);
    }
  }

  const slug = filePath
    .replace(getContentRoot() + path.sep, '')
    .replace(/\.mdx?$/, '')
    .split(path.sep)
    .join('/');

  return {
    frontmatter,
    question,
    options,
    explanation,
    referenceAnswer,
    references,
    slug,
  };
}

function walk(dir: string, out: string[] = []): string[] {
  if (!fs.existsSync(dir)) return out;
  for (const entry of fs.readdirSync(dir, { withFileTypes: true })) {
    const full = path.join(dir, entry.name);
    if (entry.isDirectory()) {
      walk(full, out);
    } else if (/\.(mdx?|md)$/.test(entry.name)) {
      out.push(full);
    }
  }
  return out;
}

export function loadAllQuestions(filter?: { category?: Category; status?: Status }): ParsedQuestion[] {
  const root = getContentRoot();
  const files = walk(root);
  let questions = files.map(f => {
    try {
      return parseQuestionFile(f);
    } catch (err) {
      throw new Error(`Failed to parse ${f}: ${(err as Error).message}`);
    }
  });
  if (filter?.category) {
    questions = questions.filter(q => q.frontmatter.category === filter.category);
  }
  if (filter?.status) {
    questions = questions.filter(q => q.frontmatter.status === filter.status);
  }
  questions.sort((a, b) => {
    if (a.frontmatter.week !== b.frontmatter.week) {
      return a.frontmatter.week - b.frontmatter.week;
    }
    return a.frontmatter.id.localeCompare(b.frontmatter.id);
  });
  return questions;
}

export function loadQuestionBySlug(slug: string): ParsedQuestion | null {
  const all = loadAllQuestions();
  return all.find(q => q.slug === slug) || null;
}
