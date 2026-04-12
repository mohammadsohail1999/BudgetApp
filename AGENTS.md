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

## Project Docs — Read Before Implementing

The `docs/` folder contains binding conventions for this project. Before writing any code, read every doc that is relevant to the feature being implemented. These docs take precedence over general best practices.

| Doc | Read before working on... |
|---|---|
| [`docs/ui.md`](docs/ui.md) | Any UI component, page, layout, theme, dark mode, forms, data display |
| [`docs/conventions.md`](docs/conventions.md) | Any new file, naming, folder structure, TypeScript patterns |
| [`docs/api.md`](docs/api.md) | Any Route Handler, Server Action, request validation, API response |
| [`docs/database.md`](docs/database.md) | Any Mongoose model, query, aggregation, index, or DB utility |
| [`docs/auth.md`](docs/auth.md) | Any authentication, session access, middleware, or protected route |

**Rules:**
- If a doc exists for the area you are touching, you **must** read it before writing code.
- If a decision in the docs conflicts with your training data or general conventions, **the doc wins**.
- If you introduce a pattern not covered by any doc, flag it and suggest updating the relevant doc.
- If a doc does not exist yet, follow the patterns already established in the codebase.
