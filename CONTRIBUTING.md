# 贡献指南

感谢你愿意为 **前端题库** 投入时间！这份指南说明如何高质量地贡献内容与代码。

> **TL;DR**：fork → 新分支 → 写内容/代码 → `pnpm validate && pnpm test` → PR。

---

## 我能贡献什么

| 类型 | 怎么做 |
| --- | --- |
| 📝 **新题目** | 在 `src/content/questions/<方向>/` 加 `.mdx`，遵守下面的「写作规范」 |
| 🐛 **修 Bug** | 看 [`good first issue`](https://github.com/yasser/frontend-quiz-bank/labels/good%20first%20issue) 标签 |
| 🌍 **翻译** | 题目 `language: en` 或 `bilingual`，建议先在 Issue 里说一声 |
| 🎨 **UI/UX** | 改进可访问性、暗色模式、移动端体验 |
| 📚 **文档** | README、CONTRIBUTING、解题思路、参考链接补全 |
| 🧪 **测试** | 加单元 / E2E 测试，特别是岛屿组件 |

---

## 准备工作

1. **Node ≥ 22.12**（推荐用 [fnm](https://github.com/Schniz/fnm) 或 [volta](https://volta.sh) 管理）
2. **pnpm ≥ 10**：`npm i -g pnpm`
3. Fork 仓库并 clone 到本地：

```bash
git clone https://github.com/<你的用户名>/frontend-quiz-bank.git
cd frontend-quiz-bank
pnpm install
```

4. **跑一遍现有的测试**确保环境就绪：

```bash
pnpm test
pnpm check
pnpm build
```

---

## 开发循环

```bash
git checkout -b feat/your-feature       # 分支名：feat/ | fix/ | docs/ | test/ | chore/
pnpm dev                                  # http://localhost:4321 热重载

# 写代码 / 写题目
pnpm validate                             # 校验 frontmatter
pnpm test                                 # 跑测试
pnpm check                                # astro 类型检查
```

提交前最后一次跑 `pnpm build` 确认产物正常。

---

## 写作规范（题目贡献者必读）

### 1. 文件命名

- **格式**：`<方向缩写>-w<周>-q<两位序号>-<短主题>.mdx`
- **示例**：`fe-w1-q01-react-closure.mdx`、`web3-w2-q03-eip6963.mdx`、`remote-w1-q02-async-first.mdx`
- 方向缩写：`fe` / `web3` / `remote`

### 2. Frontmatter

```yaml
---
id: fe-w1-q01-react-closure   # 与文件名（去后缀）一致，全局唯一
title: React 闭包陷阱          # 简洁、可扫描
category: frontend             # frontend | web3 | remote
sub_category: react-basics     # 自由命名，建议同类复用
week: 1                        # 整数，1-N
difficulty: intermediate       # basic | intermediate | advanced
type: choice                   # choice | multi-choice | interview | code
tags: [react, hooks]           # 小写、短词，3-5 个
source: handwritten            # handwritten | ai-generated | community
status: draft                  # 新贡献默认 draft，reviewer 升 reviewed
language: zh                   # zh | en | bilingual
last_updated: 2026-08-10       # YYYY-MM-DD
# reviewer: yasser             # 仅 status=reviewed 必填
---
```

### 3. 正文结构

```mdx
<题面一句话，问句结尾>

<详细题面：背景、约束、代码片段（如有）>

<Explanation>
<考点解析：原理、为什么、坑点>
</Explanation>

<References>
- [文档标题](https://...)
- [文章标题](https://...)
</References>
```

### 4. 质量要求

- ✅ **题面有具体场景**，不要「请说说你对 X 的理解」这种空泛题
- ✅ **解析讲透"为什么"**，不是把文档抄一遍
- ✅ **参考链接给出权威源**（MDN、规范、官方文档、源码），不要 CSDN 营销号
- ✅ **代码示例必须可运行**或明确标注伪代码
- ✅ **不要照搬网传八股**，至少要重新组织语言

### 5. 状态语义

| 状态 | 含义 | 进入门槛 |
| --- | --- | --- |
| `draft` | 草稿，可能有问题 | 任何人 |
| `needs-review` | 内容成型但缺审校 | 写完后觉得完整就标这个 |
| `reviewed` | 已审校、可发布 | 维护者审过后 |

---

## 代码规范

- **TypeScript 严格模式**：禁止 `any`，必要时用 `unknown` + narrowing
- **不可变更新**：用 spread，不要 mutate
- **函数 ≤ 50 行，文件 ≤ 800 行**：超了就拆
- **测试覆盖 ≥ 80%**：新功能必须带测试
- **语义化 HTML**：`<nav>` / `<main>` / `<section>` 优先于 `<div>`
- **可访问性**：交互元素必须有 `aria-label`，颜色对比度 ≥ WCAG AA

提交前请确保：

```bash
pnpm check     # 无报错
pnpm test      # 全绿
pnpm validate  # 无 frontmatter 错误
```

---

## 提交规范

使用 [Conventional Commits](https://www.conventionalcommits.org/zh-hans/)：

```
<type>(<scope>): <description>

[可选 body]
```

| type | 用途 |
| --- | --- |
| `feat` | 新功能 / 新题目 |
| `fix` | Bug 修复 |
| `docs` | 文档变更 |
| `test` | 测试相关 |
| `refactor` | 重构（不改行为） |
| `chore` | 构建、依赖、配置 |
| `perf` | 性能优化 |
| `ci` | CI 配置 |

**示例**：
```
feat(questions): add web3-w2-q01-wallet-signing (task 22)
fix(sm2): handle edge case when easiness < 1.3
docs(readme): polish feature list
```

---

## PR 流程

1. **Rebase 到 `main` 最新**（不要 merge，保持线性历史）
2. **PR 标题**遵循 conventional commits
3. **PR 描述**用模板填写：背景、改动、测试清单、关闭的 Issue
4. **CI 必须全绿**（validate + check + test + build）
5. **至少一个维护者 review 通过**后合并

新题目的 PR，维护者会重点检查：
- 题面是否清晰
- 解析是否准确（不出现误导）
- 参考链接是否权威
- frontmatter 是否合规

---

## 报告 Bug / 提建议

[打开 Issue](https://github.com/yasser/frontend-quiz-bank/issues/new/choose)，选择对应模板：
- 🐛 Bug 报告
- ✨ 功能建议
- 📝 题目纠错

请尽量提供：复现步骤、期望结果、实际结果、环境信息（浏览器/Node/pnpm 版本）。

---

## 行为准则

参与本项目即代表同意遵守 [Code of Conduct](./.github/CODE_OF_CONDUCT.md)。我们追求友好、包容、对事不对人的协作氛围。

---

## 维护者备注

如果你是 maintainer：

- 合并 PR 前必须看到 CI 全绿
- 升级 `status` 到 `reviewed` 时，必须填写 `reviewer` 字段
- 升级依赖前在 PR 描述里写明 breaking changes
- 不要直接 push 到 `main`，走 PR 流程

---

再次感谢你的贡献！♡ 如果有任何疑问，欢迎在 Issue / Discussion 里提出。
