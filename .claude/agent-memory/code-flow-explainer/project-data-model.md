---
name: project-data-model
description: Core Mongoose data model — four models, their relationships, indexes, and where each is imported
metadata:
  type: project
---

Four Mongoose models live in `src/models/`:

- **User** (`User.ts`) — credentials store; `password` has `select: false`. Models guard pattern: `models.User ?? model(...)`.
- **Category** (`Category.ts`) — per-user categories; seeded from `src/lib/defaultCategories.ts` on signup. Unique compound index `{ userId, name }`. `isDefault: true` rows are signup-seeded and should be protected from deletion.
- **Transaction** (`Transaction.ts`) — financial events; `amount` stored in **cents** (integer, validated). Three compound indexes covering userId+date, userId+type+date, userId+categoryId+type+date query patterns.
- **MonthlyBudget** (`MonthlyBudget.ts`) — spending caps per category per calendar month; also stored in cents. Unique index `{ userId, categoryId, year, month }`.

All monetary fields (`amount`, `limitAmount`) are **integers in cents** — never floats.

**Current consumers:**
- `src/app/api/auth/register/route.ts` — imports `User` + `Category` (creates user, seeds default categories)
- `src/lib/auth.ts` — imports `User` (NextAuth credentials authorize callback)
- `Transaction` and `MonthlyBudget` are defined but **not yet imported by any API route** (as of 2026-07-13)

**Supporting files:**
- `src/lib/db.ts` — `connectDB()` singleton with `globalThis` cache for dev hot-reload safety
- `src/lib/defaultCategories.ts` — 11 seed category templates (3 income, 7 expense, 1 both)
- `src/types/index.ts` — plain client-facing TS interfaces mirroring each model (no Mongoose types), plus `MonthlySummary` / `CategorySpending` aggregation shapes and `ApiResponse<T>` envelope

**Why:** Transaction and MonthlyBudget models are scaffold-only — no API routes consume them yet. Flag this when asked about missing features or incomplete API coverage.

**How to apply:** When building new API routes, always call `connectDB()` before any model query. Amount fields must be passed/validated as integers (cents) — never floats.
