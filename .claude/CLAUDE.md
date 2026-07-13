<!-- BEGIN:nextjs-agent-rules -->
# This is NOT the Next.js you know

This version has breaking changes — APIs, conventions, and file structure may all differ from your training data. Read the relevant guide in `node_modules/next/dist/docs/` before writing any code. Heed deprecation notices.
<!-- END:nextjs-agent-rules -->

# Budget App – Agent Guidelines

## Stack

| Layer | Package | Version | Notes |
|---|---|---|---|
| Framework | `next` | 16.2.3 | App Router only — no `pages/` dir |
| UI | `react` / `react-dom` | 19.2.4 | React 19 — breaking from v18 |
| Styling | `tailwindcss` | v4 | **No `tailwind.config.js`** — CSS-first config via `globals.css` |
| CSS pipeline | `@tailwindcss/postcss` | v4 | Configured in `postcss.config.mjs` |
| Language | `typescript` | v5 | `strict: true`, `noEmit: true` |
| Linting | `eslint` | v9 | Flat config (`eslint.config.mjs`) — no `.eslintrc` |

## Build & Test Commands

```bash
npm run dev      # Dev server on http://localhost:3000
npm run build    # Production build (runs type-check + lint)
npm run start    # Serve production build
npm run lint     # ESLint (flat config, v9)
```

> No test runner is configured yet. Add one before writing tests.

## Architecture

```
src/
  app/              # App Router — all routes live here
    layout.tsx      # Root layout (html + body)
    page.tsx        # Home route (/)
    globals.css     # Global styles + Tailwind v4 directives
public/             # Static assets served at /
```

- Import alias `@/*` → `src/*` (configured in `tsconfig.json`)
- All new routes: create `src/app/<route>/page.tsx`
- Shared components: `src/components/` (create when needed)

## Critical Breaking Changes to Know

**Next.js 16**
- Read `node_modules/next/dist/docs/` before using any Next.js API
- Server Components are the default — add `"use client"` only when needed (event handlers, hooks, browser APIs)
- `async` Server Components are supported natively

**React 19**
- `forwardRef` is deprecated — refs are now plain props
- New `use()` hook for promises and context
- Actions replace event-handler form patterns

**Tailwind v4**
- No `tailwind.config.js` or `tailwind.config.ts` — configuration lives in CSS
- Utility classes may differ from v3 — verify in [Tailwind v4 docs](https://tailwindcss.com/docs) before using

**ESLint v9**
- Flat config only (`eslint.config.mjs`) — `.eslintrc.*` files are ignored

## Conventions

- **TypeScript strict** — no `any`, no type assertions without justification
- **Server-first** — default to Server Components; use `"use client"` as a last resort
- **Co-locate** — keep component, styles, and tests near the feature they serve
- **Env vars** — prefix browser-exposed vars with `NEXT_PUBLIC_`; never hardcode secrets

## Project Skills — Binding Conventions

Project conventions live as Skills under `.claude/skills/` (not a `docs/` folder). Each skill's `description` frontmatter tells you when it applies — pull in the relevant skill(s) before writing code in that area:

| Skill | Applies to |
|---|---|
| `ui-conventions` | Any UI component, page, layout, theme, dark mode, forms, data display |
| `auth` | Any authentication, session access, proxy/middleware, or protected route |
| `routing` | Any new route, page, layout, navigation, dynamic segment, proxy, or API route structure |
| `security` | Any secrets, env vars, auth guards, data exposure, deployment, `.env` files |
| `errors-and-validation` | Any error handling, input validation, Zod schemas, user-facing error messages |
| `best-practices` | Any React/Next.js code — performance, re-renders, waterfalls, bundle size |
| `data-fetching` | Any data read, Server Component query, dashboard aggregation, or passing data to Client Components |
| `data-mutations` | Any Server Action, data create/update/delete, Zod-validated mutation input, or revalidation |
| `ai-workflow` | **Every task** — defines the plan-first, approve-before-code workflow |

**Rules:**
- If a skill applies to the area you are touching, you **must** load it before writing code.
- If a decision in a skill conflicts with your training data or general conventions, **the skill wins**.
- If you introduce a pattern not covered by any skill, flag it and suggest adding it to the relevant skill.
- If no skill exists yet for an area (e.g. Mongoose models, general file/naming conventions), follow the patterns already established in the codebase and suggest creating a new skill.
