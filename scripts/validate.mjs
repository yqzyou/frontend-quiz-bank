#!/usr/bin/env node
// CI script: validates every MDX file under content/ and reports duplicate IDs.
// Self-contained — does not import the .ts content-loader so Node can run it directly.
import { readdirSync, existsSync } from 'node:fs';
import path from 'node:path';
import matter from 'gray-matter';
import { pathToFileURL } from 'node:url';

const REQUIRED_STRING_FIELDS = ['id', 'title', 'sub_category', 'last_updated'];
const REQUIRED_ENUM_FIELDS = {
  category: ['frontend', 'web3', 'remote'],
  status: ['reviewed', 'draft', 'needs-review'],
  difficulty: ['basic', 'intermediate', 'advanced'],
  type: ['choice', 'multi-choice', 'interview', 'code'],
  source: ['ai-generated', 'handwritten', 'community'],
  language: ['zh', 'en', 'bilingual'],
};

function collectContentFiles(root) {
  if (!existsSync(root)) return [];
  const out = [];
  function walk(dir) {
    for (const entry of readdirSync(dir, { withFileTypes: true })) {
      const full = path.join(dir, entry.name);
      if (entry.isDirectory()) walk(full);
      else if (/\.(mdx?|md)$/.test(entry.name)) out.push(full);
    }
  }
  walk(root);
  return out;
}

function normalizeDateLike(value) {
  if (value instanceof Date) {
    if (Number.isNaN(value.getTime())) return '';
    const y = value.getUTCFullYear();
    const m = String(value.getUTCMonth() + 1).padStart(2, '0');
    const d = String(value.getUTCDate()).padStart(2, '0');
    return `${y}-${m}-${d}`;
  }
  return typeof value === 'string' ? value : '';
}

function validateFrontmatter(fm, filePath) {
  const errors = [];
  for (const field of REQUIRED_STRING_FIELDS) {
    const value = field === 'last_updated' ? normalizeDateLike(fm[field]) : fm[field];
    if (typeof value !== 'string' || value.length === 0) {
      errors.push(`[${filePath}] ${field} must be a non-empty string`);
    }
  }
  if (!Number.isInteger(fm.week) || fm.week < 1) {
    errors.push(`[${filePath}] week must be a positive integer (got: ${JSON.stringify(fm.week)})`);
  }
  if (!Array.isArray(fm.tags) || !fm.tags.every(t => typeof t === 'string')) {
    errors.push(`[${filePath}] tags must be an array of strings`);
  }
  if (fm.related !== undefined && (!Array.isArray(fm.related) || !fm.related.every(t => typeof t === 'string'))) {
    errors.push(`[${filePath}] related must be an array of strings if present`);
  }
  for (const [field, allowed] of Object.entries(REQUIRED_ENUM_FIELDS)) {
    if (!allowed.includes(fm[field])) {
      errors.push(`[${filePath}] Invalid ${field}: ${JSON.stringify(fm[field])} (allowed: ${allowed.join('|')})`);
    }
  }
  if (fm.status === 'reviewed' && (!fm.reviewer || typeof fm.reviewer !== 'string')) {
    errors.push(`[${filePath}] status=reviewed requires non-empty reviewer field`);
  }
  return errors;
}

export async function validateContentDir(input) {
  let files;
  if (Array.isArray(input)) {
    files = input;
  } else if (typeof input === 'string') {
    files = [input];
  } else {
    const root = path.resolve(process.cwd(), 'content');
    files = collectContentFiles(root);
  }

  const errors = [];
  const ids = new Map();

  for (const file of files) {
    try {
      const raw = await readFile(file);
      const { data } = matter(raw);
      errors.push(...validateFrontmatter(data, file));
      if (ids.has(data.id)) {
        errors.push(`[${file}] Duplicate id "${data.id}" (also in ${ids.get(data.id)})`);
      } else {
        ids.set(data.id, file);
      }
    } catch (err) {
      errors.push(`[${file}] ${err.message}`);
    }
  }
  return errors;
}

async function readFile(file) {
  const { readFile: fsReadFile } = await import('node:fs/promises');
  return fsReadFile(file, 'utf-8');
}

const argv1 = process.argv[1];
const isMain = typeof argv1 === 'string' && import.meta.url === pathToFileURL(argv1).href;
if (isMain) {
  const errors = await validateContentDir();
  if (errors.length > 0) {
    console.error(`❌ ${errors.length} validation error(s):`);
    for (const e of errors) console.error('  ' + e);
    process.exit(1);
  }
  console.log('✅ All content valid.');
}
