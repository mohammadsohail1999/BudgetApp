---
description: Use when creating, updating, or deleting any data in this budget-app project — transactions, budgets, categories, or user settings. Covers Server Action file layout, Zod-validated typed inputs, auth guard, DB connection, return envelope, error handling, cache invalidation, and how client components invoke actions. Do NOT write a new API route or client-side fetch for any mutation — Server Actions only.
---

# Data Mutations — Budget App Conventions

All data mutations (create, update, delete) go through **Next.js Server Actions**. No client-side fetch to mutation API routes. No extra `POST` route handlers for anything already covered by an action.

---

## File Layout

```
src/
  actions/
    transactions.ts   # createTransaction, updateTransaction, deleteTransaction
    budgets.ts        # upsertMonthlyBudget, deleteMonthlyBudget
    categories.ts     # createCategory, updateCategory, deleteCategory
```

- One file per domain object, named after the model it mutates.
- Every file starts with `"use server"` at the top.
- Co-locate the Zod schema with the action it validates — do not share schemas across action files unless the shape is truly identical.

---

## Canonical Action Shape

```ts
"use server";

import { auth } from "@/lib/auth";
import { connectDB } from "@/lib/db";
import { Transaction } from "@/models/Transaction";
import { revalidatePath } from "next/cache";
import { z } from "zod";

// 1. Schema — strongly typed, no raw FormData
const createTransactionSchema = z.object({
  type: z.enum(["income", "expense"]),
  amount: z.number().int().min(1),        // always integer cents
  categoryId: z.string().min(1),
  description: z.string().max(300).optional(),
  date: z.string().datetime(),
});

type CreateTransactionInput = z.infer<typeof createTransactionSchema>;

// 2. Return envelope — always { ok, data?, error? }
type ActionResult<T = void> =
  | { ok: true; data: T }
  | { ok: false; error: string };

// 3. Action function
export async function createTransaction(
  input: CreateTransactionInput,
): Promise<ActionResult<{ id: string }>> {
  // 4. Auth guard — first thing, every action
  const session = await auth();
  if (!session?.user?.id) {
    return { ok: false, error: "Unauthorized." };
  }

  // 5. Validate
  const parsed = createTransactionSchema.safeParse(input);
  if (!parsed.success) {
    return { ok: false, error: parsed.error.issues[0].message };
  }

  // 6. DB
  try {
    await connectDB();
    const tx = await Transaction.create({
      ...parsed.data,
      userId: session.user.id,
      date: new Date(parsed.data.date),
    });

    // 7. Revalidate affected pages
    revalidatePath("/app/dashboard");
    revalidatePath("/app/transactions");

    return { ok: true, data: { id: String(tx._id) } };
  } catch {
    return { ok: false, error: "Failed to create transaction. Please try again." };
  }
}
```

---

## Rules

### Inputs
- **Never accept `FormData`** — always accept a plain typed object validated by Zod.
- Parameter type must be `z.infer<typeof schema>` — not a hand-written interface.
- Monetary amounts are **integer cents** everywhere: `z.number().int().min(1)`. Dollar-to-cent conversion happens in the client component before calling the action.

### Auth
- Call `auth()` as the **first line** of every action.
- Return `{ ok: false, error: "Unauthorized." }` with no further processing if the session is missing.
- Never trust a `userId` passed in the input — always use `session.user.id`.

### Return envelope
- Always return `{ ok: true, data: T }` or `{ ok: false, error: string }`.
- Never throw to the client — catch all DB/external errors and map them to `{ ok: false, error: "..." }`.
- `data` is omitted (or `void`) when a mutation needs no return value beyond success.

### DB
- Call `connectDB()` inside the try block, after auth and validation.
- Never use `bufferCommands: true` — the project disables it globally.

### Ownership
- Before updating or deleting, query the document with **both `_id` and `userId`** to prevent cross-user mutations:
  ```ts
  const doc = await Transaction.findOne({ _id: input.id, userId: session.user.id });
  if (!doc) return { ok: false, error: "Not found." };
  ```

### Cache invalidation
- Call `revalidatePath(...)` for every route that displays the mutated data.
- Prefer specific paths over `revalidatePath("/", "layout")` — that busts the entire cache.

---

## Calling Actions from Client Components

Use `useTransition` to track pending state. Do **not** use `fetch` or `useEffect` for mutations.

```tsx
"use client";

import { useTransition } from "react";
import { createTransaction } from "@/actions/transactions";

export function TransactionForm() {
  const [isPending, startTransition] = useTransition();

  function handleSubmit(values: FormValues) {
    startTransition(async () => {
      const result = await createTransaction({
        type: values.type,
        amount: Math.round(values.amountDollars * 100), // dollars → cents here
        categoryId: values.categoryId,
        description: values.description,
        date: values.date.toISOString(),
      });

      if (!result.ok) {
        setError(result.error);
        return;
      }

      // success — optimistically close modal, show toast, etc.
    });
  }
  // ...
}
```

- `isPending` drives button disabled state and loading spinners — no extra `isLoading` state needed.
- Dollar-to-cent conversion (`Math.round(dollars * 100)`) always happens in the client before the action call.

---

## What NOT to Do

| Pattern | Instead |
|---|---|
| `fetch("/api/transactions", { method: "POST" })` | Call the Server Action directly |
| `async function action(formData: FormData)` | Accept a typed `input` object |
| Trust `input.userId` from the client | Read `session.user.id` server-side |
| `throw new Error(...)` from an action | `return { ok: false, error: "..." }` |
| Create a new `POST` route for a mutation | Create a Server Action in `src/actions/` |
| Pass raw dollar strings from the form | Convert to integer cents in the client first |
