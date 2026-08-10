# 前端题库 · Frontend Quiz Bank

> 面向「前端转 Web3 / 远程协作」程序员的开源题库。SM-2 间隔复习 · 每日任务 · 即时搜索 · 离线进度。

[![CI](https://github.com/yasser/frontend-quiz-bank/actions/workflows/ci.yml/badge.svg)](https://github.com/yasser/frontend-quiz-bank/actions/workflows/ci.yml)
[![License: MIT](https://img.shields.io/badge/License-MIT-indigo.svg)](./LICENSE)
[![Astro](https://img.shields.io/badge/Astro-7-FF5D01?logo=astro&logoColor=white)](https://astro.build)
[![React](https://img.shields.io/badge/React-19-149ECA?logo=react&logoColor=white)](https://react.dev)
[![TypeScript](https://img.shields.io/badge/TypeScript-6-3178C6?logo=typescript&logoColor=white)](https://www.typescriptlang.org)

---

## 为什么做这个

市面上的前端面试题库要么停在「八股背诵」，要么只覆盖传统方向。这个项目聚焦三个真问题：

1. **前端 → Web3**：钱包发现（EIP-6963）、链上数据、合约交互、签名与授权
2. **前端 → 远程协作**：异步沟通、文档优先、跨时区 handoff、自驱式工作
3. **可持续的记忆**：SM-2 间隔复习算法，让题目真正"留下"

每道题写明考点、解析、参考链接，并按周次组织（W1 / W2 / …）方便配合学习计划。

---

## 特性

- **38 道精选题**（持续增加）· 三大方向：前端 / Web3 / 远程协作
- **SM-2 间隔复习**：基于答题质量动态调整下次复习时间，进度本地保存
- **每日任务**：从已审校题集中按日期种子抽样 3 道，稳定可复现
- **即时搜索 + 多维筛选**：方向、状态、周次、关键词（标题 / 题面 / 标签）
- **URL 状态可分享**：当前筛选视图通过 query 参数复制即得
- **审校状态可见**：每题标记 `reviewed` / `draft` / `needs-review`，便于社区贡献者识别缺口
- **SEO 友好**：每题独立 URL、JSON-LD 结构化数据、OG 图、sitemap
- **暗色模式**：跟随系统 + 手动覆盖，所有界面双主题适配
- **零服务端依赖**：进度、连击、复习队列全部走 `localStorage`，不上传服务器

---

## 技术栈

| 层 | 技术 | 版本 |
| --- | --- | --- |
| 框架 | [Astro](https://astro.build) | ^7.2 |
| UI 岛屿 | [React](https://react.dev) | ^19.2 |
| 样式 | [Tailwind CSS](https://tailwindcss.com) | ^4.3 |
| 类型 | [TypeScript](https://www.typescriptlang.org) | ^6.0（pin） |
| 状态 | [Zustand](https://zustand.docs.pmnd.rs) + persist | ^5.0 |
| 测试 | [Vitest](https://vitest.dev) + Testing Library + happy-dom | ^4.1 |
| 包管理 | [pnpm](https://pnpm.io) | ≥ 10 |
| 运行时 | [Node.js](https://nodejs.org) | ≥ 22.12 |

> **TypeScript 6.x 锁版本**：TS 7 移除了 `@astrojs/language-server` 依赖的程序化 API，升级会导致 `astro check` 失败。详见 `CLAUDE.md`。

---

## 快速开始

```bash
# 1. 克隆
git clone https://github.com/yasser/frontend-quiz-bank.git
cd frontend-quiz-bank

# 2. 安装依赖（推荐 pnpm，npm/yarn 也行）
pnpm install

# 3. 启动开发服务器（默认 http://localhost:4321）
pnpm dev
```

构建生产版本：

```bash
pnpm build      # 输出到 ./dist
pnpm preview    # 本地预览构建产物
```

---

## 常用脚本

| 命令 | 作用 |
| --- | --- |
| `pnpm dev` | 启动开发服务器（HMR） |
| `pnpm build` | 构建生产版本到 `dist/` |
| `pnpm preview` | 本地预览构建产物 |
| `pnpm check` | Astro 类型检查（`.astro` 文件） |
| `pnpm test` | 跑全部单元测试（Vitest） |
| `pnpm test:unit:watch` | 监听模式测试 |
| `pnpm test:coverage` | 生成测试覆盖率报告 |
| `pnpm validate` | 校验所有题目的 frontmatter（CI 用） |

---

## 内容结构

```text
src/
├── components/
│   ├── islands/          # React 客户端岛屿
│   │   ├── QuestionExplorer.tsx   # 题库筛选与搜索
│   │   ├── QuizCard.tsx           # 单题练习卡
│   │   ├── Dashboard.tsx          # 复习中心仪表盘
│   │   ├── DailyMission.tsx       # 每日任务
│   │   └── ReviewQueue.tsx        # SM-2 复习队列
│   ├── Header.astro
│   └── Footer.astro
├── content/
│   ├── config.ts         # MDX content collection schema
│   └── questions/        # 题目源文件（按方向分目录）
│       ├── frontend/     # 前端方向
│       ├── web3/         # Web3 方向
│       └── remote/       # 远程协作方向
├── lib/
│   ├── content-loader.ts # 构建期加载所有 MDX
│   ├── sm2.ts            # SM-2 算法实现
│   ├── daily.ts          # 每日任务种子抽样
│   └── progress-store.ts # Zustand + persist 进度存储
├── pages/
│   ├── index.astro       # 首页（编辑式 hero + 学习入口）
│   ├── questions/
│   │   ├── index.astro   # 题库列表
│   │   └── [...slug].astro # 题目详情
│   ├── review.astro      # 复习中心
│   └── about.astro       # 关于
├── layouts/BaseLayout.astro
├── styles/global.css
└── tests/unit/           # 单元测试镜像源结构
```

### Frontmatter 示例

```mdx
---
id: fe-w1-q01-react-closure
title: React 闭包陷阱
category: frontend
sub_category: react-basics
week: 1
difficulty: intermediate
type: choice                # choice | multi-choice | interview | code
tags: [react, hooks]
source: handwritten          # handwritten | ai-generated | community
status: reviewed             # reviewed | draft | needs-review
language: zh
last_updated: 2026-08-01
reviewer: yasser             # reviewed 必填
---

为什么 setState 看到的是旧值？

<Explanation>
闭包捕获了 render 时的快照……
</Explanation>
```

完整 schema 见 [`src/content/config.ts`](./src/content/config.ts)，校验逻辑见 [`scripts/validate.mjs`](./scripts/validate.mjs)。

---

## 贡献

欢迎贡献题目、修复 Bug、改进文档！

- **新加题目** → 见 [`CONTRIBUTING.md`](./CONTRIBUTING.md) 的「写作规范」
- **报告问题** → [打开 Issue](https://github.com/yasser/frontend-quiz-bank/issues/new/choose)
- **提 PR** → [PR 模板](./.github/PULL_REQUEST_TEMPLATE.md)

**首问友好**：哪怕只是修个错别字、补个标签，都是有效贡献。`good first issue` 标签的题目适合新手。

---

## 行为准则

参与本项目即代表同意遵守 [`CODE_OF_CONDUCT.md`](./.github/CODE_OF_CONDUCT.md)。请在所有交流中保持尊重与建设性。

---

## License

[MIT](./LICENSE) © 2026 yasser
