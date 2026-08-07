# Frontend Quiz Bank — Project Context

## Tech Stack
- Astro 7 + React 19 (Islands) + Tailwind CSS 4 + TypeScript
- Path aliases: `@`, `@lib`, `@islands`, `@components` → `/src/...`
- Scripts: `pnpm dev`, `pnpm build`, `pnpm check`, `pnpm test`

## Critical Version Pin — TypeScript 6.x

TypeScript is pinned to `^6.0.3`. **Do NOT upgrade to TypeScript 7.x.**

TS 7 removed programmatic APIs that `@astrojs/language-server` (used by `astro check`) depends on. Upgrading to TS 7 will cause `astro check` to fail with: "Loaded TypeScript module (version 7.x) does not expose the programmatic API the `astro check` command depends on."

Until `@astrojs/language-server` ships TS-7 compatibility, stay on 6.x.

## Dev Workflow
- Edit MDX content in `src/content/questions/` (created in Task 5+)
- Run `pnpm dev` for local preview at http://localhost:4321
- Run `pnpm check` to typecheck `.astro` files
- Tests: configured starting Task 4 (Vitest)

## Frontmatter Schema (Tasks 5-7)
Questions use `status: reviewed | draft | needs-review` and `language: zh | en | bilingual` — see `src/content/config.ts` (Task 3).
