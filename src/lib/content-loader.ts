import fs from 'node:fs';
import path from 'node:path';
import matter from 'gray-matter';
import type {
  Frontmatter,
  ParsedQuestion,
  ChoiceOption,
  Category,
  Status,
  Difficulty,
  QuestionType,
  Source,
  Language,
} from './types';

const REQUIRED_FIELDS: (keyof Frontmatter)[] = [
  'id', 'title', 'category', 'sub_category', 'week', 'difficulty',
  'type', 'tags', 'source', 'status', 'language', 'last_updated',
];

const VALID_STATUS = ['reviewed', 'draft', 'needs-review'] as const;
const VALID_CATEGORIES = ['frontend', 'web3', 'remote'] as const;
const VALID_DIFFICULTY = ['basic', 'intermediate', 'advanced'] as const;
const VALID_TYPE = ['choice', 'multi-choice', 'interview', 'code'] as const;
const VALID_SOURCE = ['ai-generated', 'handwritten', 'community'] as const;
const VALID_LANGUAGE = ['zh', 'en', 'bilingual'] as const;

function getContentRoot(): string {
  return process.env.CONTENT_ROOT || path.resolve(process.cwd(), 'content');
}

function parseOptions(body: string): ChoiceOption[] {
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
  return options;
}

function extractSection(body: string, header: string): string {
  // Match `## {header}` at start-of-line, capture until next `## ` at line start or EOF.
  // Anchors use \n explicitly (no multiline flag) to avoid `$` matching any line ending.
  const re = new RegExp(`(?:^|\\n)##\\s+${header}[ \\t]*\\r?\\n([\\s\\S]*?)(?=\\r?\\n##\\s|$)`);
  const m = body.match(re);
  return m ? m[1].trim() : '';
}

function isStringArray(value: unknown): value is string[] {
  return Array.isArray(value) && value.every(v => typeof v === 'string');
}

function normalizeDateString(value: unknown): string | null {
  if (typeof value === 'string') return value;
  if (value instanceof Date) return value.toISOString().slice(0, 10);
  return null;
}

function validateFrontmatter(fm: Record<string, unknown>, filePath: string): Frontmatter {
  for (const field of REQUIRED_FIELDS) {
    if (!(field in fm) || fm[field] === undefined || fm[field] === null) {
      throw new Error(`[${filePath}] Missing required frontmatter field: ${field}`);
    }
  }

  if (typeof fm.title !== 'string' || fm.title.length === 0) {
    throw new Error(`[${filePath}] title must be a non-empty string`);
  }
  if (typeof fm.id !== 'string' || fm.id.length === 0) {
    throw new Error(`[${filePath}] id must be a non-empty string`);
  }
  if (typeof fm.sub_category !== 'string' || fm.sub_category.length === 0) {
    throw new Error(`[${filePath}] sub_category must be a non-empty string`);
  }
  if (!Number.isInteger(fm.week) || (fm.week as number) < 1) {
    throw new Error(`[${filePath}] week must be a positive integer (got: ${JSON.stringify(fm.week)})`);
  }
  const lastUpdated = normalizeDateString(fm.last_updated);
  if (!lastUpdated) {
    throw new Error(`[${filePath}] last_updated must be a date string or Date (got: ${typeof fm.last_updated})`);
  }
  fm.last_updated = lastUpdated;

  if (!VALID_CATEGORIES.includes(fm.category as Category)) {
    throw new Error(`[${filePath}] Invalid category: ${JSON.stringify(fm.category)}`);
  }
  if (!VALID_STATUS.includes(fm.status as Status)) {
    throw new Error(`[${filePath}] Invalid status: ${JSON.stringify(fm.status)}`);
  }
  if (!VALID_DIFFICULTY.includes(fm.difficulty as Difficulty)) {
    throw new Error(`[${filePath}] Invalid difficulty: ${JSON.stringify(fm.difficulty)}`);
  }
  if (!VALID_TYPE.includes(fm.type as QuestionType)) {
    throw new Error(`[${filePath}] Invalid type: ${JSON.stringify(fm.type)}`);
  }
  if (!VALID_SOURCE.includes(fm.source as Source)) {
    throw new Error(`[${filePath}] Invalid source: ${JSON.stringify(fm.source)}`);
  }
  if (!VALID_LANGUAGE.includes(fm.language as Language)) {
    throw new Error(`[${filePath}] Invalid language: ${JSON.stringify(fm.language)}`);
  }

  if (!isStringArray(fm.tags)) {
    throw new Error(`[${filePath}] tags must be an array of strings (got: ${JSON.stringify(fm.tags)})`);
  }
  if (fm.related !== undefined && !isStringArray(fm.related)) {
    throw new Error(`[${filePath}] related must be an array of strings if present`);
  }

  if (fm.status === 'reviewed' && (!fm.reviewer || typeof fm.reviewer !== 'string')) {
    throw new Error(`[${filePath}] status=reviewed requires non-empty reviewer field`);
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
    options = parseOptions(optSection);
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
