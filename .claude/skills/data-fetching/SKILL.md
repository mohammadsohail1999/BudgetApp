---
name: data-fetching
description: Use when reading or displaying any data in this budget-app project — transactions, budgets, categories, dashboard summaries, or user profile. Covers query function layout, Server Component data fetching, auth guard with redirect, ownership filtering, .lean() + .select() discipline, serialization, parallel fetching with Promise.all, Suspense/streaming, and passing data to Client Components. Do NOT fetch data inside Client Components. Do NOT create GET API routes solely to return data — use Server Components and query functions instead.
---

# Data Fetching — Budget App Conventions

All data reading happens in **async Server Components** via typed query functions. No `useEffect` + `fetch`. No `useQuery` / SWR. No GET API routes whose only job is returning JSON to a Client Component.

---

## File Layout

```
src/
  lib/
    queries/
      transactions.ts   # getTransactions, getTransactionById
      budgets.ts        # getMonthlyBudgets, getMonthlyBudget
      categories.ts     # getCategories, getCategoryById
      dashboard.ts      # getMonthlySummary, getCategorySpending
```

- One file per domain object, named after the model it reads.
- No `"use server"` directive — these are plain async functions, not actions.
- Each function is responsible for exactly one query shape. Do not add optional params to make one function cover two query patterns; write two functions.

---

## Canonical Query Function

```ts
// src/lib/queries/transactions.ts

import { auth } from "@/lib/auth";
import { connectDB } from "@/lib/db";
import { Transaction as TransactionModel } from "@/models/Transaction";
import type { Transaction } from "@/types";

export async function getTransactions(filters?: {
  type?: "income" | "expense";
  categoryId?: string;
  year?: number;
  month?: number;
}): Promise<Transaction[]> {
  // 1. Auth — every query function checks the session
  const session = await auth();
  if (!session?.user?.id) return [];   // page-level redirect handles the UX; query returns empty

  await connectDB();

  const query: Record<string, unknown> = {
    userId: session.user.id,           // 2. Ownership — always scope to current user
  };

  if (filters?.type) query.type = filters.type;
  if (filters?.categoryId) query.categoryId = filters.categoryId;
  if (filters?.year !== undefined && filters?.month !== undefined) {
    const start = new Date(filters.year, filters.month - 1, 1);
    const end   = new Date(filters.year, filters.month, 1);
    query.date = { $gte: start, $lt: end };
  }

  const docs = await TransactionModel
    .find(query)
    .sort({ date: -1 })
    .select("-__v")                    // 3. Never return __v; never return password fields
    .lean<Transaction[]>();            // 4. Always .lean() — plain objects, not Mongoose Documents

  // 5. Serialize ObjectIds to strings before returning to a Server Component
  return docs.map((doc) => ({
    ...doc,
    id: String(doc._id),
    userId: String(doc.userId),
    categoryId: String(doc.categoryId),
    date: (doc.date as unknown as Date).toISOString().slice(0, 10),
    createdAt: (doc.createdAt as unknown as Date).toISOString(),
    updatedAt: (doc.updatedAt as unknown as Date).toISOString(),
  }));
}
```

---

## Rules

### Auth
- Call `auth()` as the **first line** of every query function.
- Query functions return an empty array / `null` on missing session — they do **not** redirect. Redirect belongs in the page component (see below).
- Never accept a `userId` parameter — always read it from `session.user.id`.

### Ownership
- Every query **must** include `userId: session.user.id` in the filter.
- For single-document lookups, include both `_id` and `userId`:
  ```ts
  const doc = await TransactionModel
    .findOne({ _id: id, userId: session.user.id })
    .lean();
  if (!doc) return null;
  ```
- Returning `null` for a missing/unauthorized document is correct — the page decides whether to call `notFound()` or show an empty state.

### `.lean()` — always
- `.lean()` returns plain JavaScript objects instead of Mongoose Documents. This makes them serializable and safe to pass as props to Client Components.
- Never pass a Mongoose Document to a Client Component — it will throw a serialization error.
- Always type the `.lean()` call: `.lean<ReturnType[]>()` so TypeScript infers the right shape.

### `.select()` — project only what you need
- Use `.select("field1 field2")` for list queries that don't need every field.
- **Never** return `password` — it is `select: false` on the User model, so it won't appear unless you explicitly call `.select("+password")`. Never do that outside of `src/lib/auth.ts`.
- Always exclude `__v` with `.select("-__v")` or rely on `versionKey: false` already set on each schema.

### Serialization
- `.lean()` preserves ObjectId instances and Date objects. Convert them before returning:
  - ObjectIds → `String(doc._id)`
  - Dates → `.toISOString()` (or `.toISOString().slice(0, 10)` for date-only fields)
- Return types must match the plain-object interfaces in `src/types/index.ts` — not Mongoose document types.

### Error handling
- Wrap DB calls in try/catch and return a safe fallback (`[]` or `null`):
  ```ts
  try {
    await connectDB();
    const docs = await TransactionModel.find(...).lean();
    return serialize(docs);
  } catch {
    return [];
  }
  ```
- Let Next.js `error.tsx` boundaries handle unexpected crashes — don't swallow errors silently when a page-level boundary exists.

---

## Server Component Page Pattern

```tsx
// src/app/app/transactions/page.tsx

import { auth } from "@/lib/auth";
import { getTransactions } from "@/lib/queries/transactions";
import { getCategories } from "@/lib/queries/categories";
import { redirect } from "next/navigation";

export default async function TransactionsPage() {
  // 1. Auth check + redirect — always at the top of the page
  const session = await auth();
  if (!session) redirect("/login");

  // 2. Parallel fetch — never sequential when queries are independent
  const [transactions, categories] = await Promise.all([
    getTransactions(),
    getCategories(),
  ]);

  // 3. Pass plain serialized data to Client Components
  return <TransactionsView transactions={transactions} categories={categories} />;
}
```

- `redirect("/login")` terminates rendering — nothing after it executes.
- Use `Promise.all` for every set of independent queries. Sequential `await` is a waterfall — every extra round-trip adds latency.
- Never `await` inside a loop — collect IDs and use `$in` or `Promise.all` over the array.

---

## Parallel Fetching — Critical

```ts
// ❌ Waterfall — each query waits for the previous one
const transactions = await getTransactions();
const categories   = await getCategories();
const budgets      = await getMonthlyBudgets(year, month);

// ✅ Parallel — all three fire at once, total time = slowest single query
const [transactions, categories, budgets] = await Promise.all([
  getTransactions(),
  getCategories(),
  getMonthlyBudgets(year, month),
]);
```

---

## Passing Data to Client Components

Server Components can pass data to Client Components as props. The data **must** be fully serializable (no ObjectIds, no Date objects, no class instances).

```tsx
// Server Component — fetches and passes plain objects
export default async function DashboardPage() {
  const session = await auth();
  if (!session) redirect("/login");

  const [summary, categories] = await Promise.all([
    getMonthlySummary(year, month),
    getCategories(),
  ]);

  return <DashboardCharts summary={summary} categories={categories} />;
}

// Client Component — receives props, never fetches
"use client";

interface Props {
  summary: MonthlySummary;
  categories: Category[];
}

export function DashboardCharts({ summary, categories }: Props) {
  // render only — no useEffect, no fetch, no SWR here
}
```

---

## Suspense and Streaming

Wrap independent slow sections in `<Suspense>` so fast parts render immediately while slow queries stream in.

```tsx
import { Suspense } from "react";

export default async function DashboardPage() {
  const session = await auth();
  if (!session) redirect("/login");

  return (
    <main>
      {/* Renders immediately */}
      <DashboardHeader />

      {/* Streams in when its data is ready */}
      <Suspense fallback={<TransactionsSkeleton />}>
        <RecentTransactions />
      </Suspense>

      <Suspense fallback={<BudgetsSkeleton />}>
        <MonthlyBudgets />
      </Suspense>
    </main>
  );
}
```

- Each `<Suspense>`-wrapped component is its own async Server Component that fetches its own data.
- The `fallback` must be a skeleton that matches the eventual layout — no spinners in the middle of a page.
- Use `loading.tsx` for full-route loading states (navigating to a new route). Use `<Suspense>` for partial-page streaming within a route.

---

## Route-Level Files

| File | Purpose |
|---|---|
| `loading.tsx` | Shown while the page's async Server Component is executing — appears instantly on navigation |
| `error.tsx` | Catches thrown errors from the page or its children — must be a Client Component (`"use client"`) |

```tsx
// src/app/app/transactions/loading.tsx
export default function Loading() {
  return <TransactionsSkeleton />;
}

// src/app/app/transactions/error.tsx
"use client";
export default function Error({ reset }: { reset: () => void }) {
  return (
    <div>
      <p>Something went wrong loading your transactions.</p>
      <button onClick={reset}>Try again</button>
    </div>
  );
}
```

---

## What NOT to Do

| Pattern | Instead |
|---|---|
| `useEffect(() => { fetch("/api/transactions") }, [])` | Fetch in an async Server Component, pass as props |
| Create `GET /api/transactions` solely to serve a Client Component | Use a query function in a Server Component |
| `.find({ userId: input.userId })` | Always `.find({ userId: session.user.id })` |
| Return a Mongoose Document as a prop | Always `.lean()` and serialize ObjectIds/Dates |
| Sequential `await` for independent queries | `Promise.all([...])` |
| `await` inside a loop | Collect IDs, use `$in` or `Promise.all` over the array |
| Import a query function inside a `"use client"` file | Query functions are server-only; pass data as props instead |
