---
name: errors-and-validation
description: Use when implementing error handling, input validation, Zod schemas, API response envelopes, or user-facing error messages in this budget-app project.
---

# Errors & Validation Conventions

## Stack

- **Zod v3** — single validation library for all input (API routes, Server Actions, forms)
- **MUI `Alert`** — all user-visible error messages render via `<Alert severity="error">` (or `severity="warning"` / `"success"`)
- **`ApiResponse<T>`** — uniform API response envelope (`src/types/index.ts`)
- **No stack traces exposed** — every error shown to the user is a plain-language sentence

---

## Core Principles

1. **Validate at the boundary, trust inside.** Validate once where external data enters the system (API route, Server Action, form submit). After validation passes, the data is typed and trusted — no re-validation deeper in the stack.
2. **Never expose internals.** Users see friendly messages. Logs get the real error. Stack traces, Mongoose errors, and raw exception messages never reach the client.
3. **Zod is the only validation tool.** No hand-written regex validation functions, no manual `if (!field)` chains. Zod schemas are the single source of truth for shape, type, and constraint checks.
4. **Fail fast, fail clearly.** Return the first actionable error the user can fix. For forms, return all field errors at once so the user can fix everything in one pass.

---

## File Locations

| File | Purpose |
|---|---|
| `src/lib/schemas/*.ts` | Zod schemas grouped by domain (e.g., `auth.ts`, `transaction.ts`, `budget.ts`) |
| `src/lib/errors.ts` | `AppError` class, `formatZodErrors()`, `safeErrorMessage()` helpers |
| `src/app/api/**/route.ts` | Server-side validation with Zod at the top of each handler |
| `src/components/ui/FormAlert.tsx` | Thin wrapper around MUI `Alert` for form-level errors |

---

## Zod Schemas

### Structure

Group schemas by domain. Export both the schema and the inferred type.

```ts
// src/lib/schemas/transaction.ts
import { z } from "zod"

export const createTransactionSchema = z.object({
  type: z.enum(["income", "expense"]),
  amount: z
    .number()
    .int("Amount must be a whole number (cents)")
    .positive("Amount must be greater than zero"),
  categoryId: z.string().min(1, "Category is required"),
  description: z.string().max(200, "Description too long").optional(),
  date: z.string().date("Invalid date format"),
})

export type CreateTransactionInput = z.infer<typeof createTransactionSchema>
```

### Naming Convention

| Pattern | Usage |
|---|---|
| `create<Entity>Schema` | POST — creating a new record |
| `update<Entity>Schema` | PATCH/PUT — partial or full update |
| `<entity>IdSchema` | Validating a single ID param |
| `<entity>QuerySchema` | Validating query/search params |

### Rules

- All amounts are integers in cents — use `z.number().int()`.
- Dates from the client are ISO strings — use `z.string().date()` or `z.string().datetime()`.
- ObjectId strings: `z.string().regex(/^[a-f\d]{24}$/i, "Invalid ID")` — extract to a reusable `objectIdSchema`.
- Trim strings at the schema level with `.trim()` so downstream code never handles leading/trailing whitespace.
- Set reasonable `.max()` lengths on all string fields to prevent abuse.

### Shared Primitives

```ts
// src/lib/schemas/shared.ts
import { z } from "zod"

export const objectIdSchema = z
  .string()
  .regex(/^[a-f\d]{24}$/i, "Invalid ID format")

export const paginationSchema = z.object({
  page: z.coerce.number().int().min(1).default(1),
  limit: z.coerce.number().int().min(1).max(100).default(20),
})
```

---

## API Error Handling

### Response Envelope

Every API route returns `ApiResponse<T>` (defined in `src/types/index.ts`):

```ts
// Success
{ ok: true, data: T }

// Error
{ ok: false, error: "Human-readable message" }
```

**Never return** raw Zod errors, Mongoose errors, or stack traces in the `error` field.

### Route Handler Pattern

```ts
// src/app/api/transactions/route.ts
import { NextRequest, NextResponse } from "next/server"
import { getServerSession } from "next-auth"
import { authOptions } from "@/lib/auth"
import { connectDB } from "@/lib/db"
import { Transaction } from "@/models/Transaction"
import { createTransactionSchema } from "@/lib/schemas/transaction"
import { formatZodErrors, safeErrorMessage } from "@/lib/errors"

export async function POST(req: NextRequest) {
  try {
    // 1. Auth
    const session = await getServerSession(authOptions)
    if (!session) {
      return NextResponse.json({ ok: false, error: "Please sign in to continue." }, { status: 401 })
    }

    // 2. Parse & validate
    const body = await req.json()
    const result = createTransactionSchema.safeParse(body)

    if (!result.success) {
      return NextResponse.json(
        { ok: false, error: formatZodErrors(result.error) },
        { status: 400 }
      )
    }

    // 3. Business logic (data is now typed as CreateTransactionInput)
    await connectDB()
    const txn = await Transaction.create({
      ...result.data,
      userId: session.user.id,
    })

    return NextResponse.json({ ok: true, data: txn }, { status: 201 })
  } catch (err) {
    console.error("[POST /api/transactions]", err)
    return NextResponse.json(
      { ok: false, error: safeErrorMessage(err) },
      { status: 500 }
    )
  }
}
```

### Order of Operations

Every Route Handler and Server Action follows this sequence:

1. **Authenticate** — check session; return 401 if missing
2. **Validate** — parse input with `schema.safeParse()`; return 400 with formatted errors
3. **Authorize** — verify ownership (e.g., `userId` matches); return 403 if forbidden
4. **Execute** — perform the DB operation
5. **Catch** — log the real error, return a safe generic message

---

## Error Utility Functions

```ts
// src/lib/errors.ts
import { ZodError } from "zod"

/**
 * Formats Zod validation errors into a single user-facing string.
 * Returns the first field error for simplicity, or joins multiple.
 */
export function formatZodErrors(error: ZodError): string {
  const messages = error.issues.map((issue) => {
    const field = issue.path.join(".")
    return field ? `${field}: ${issue.message}` : issue.message
  })
  return messages.join(". ")
}

/**
 * Extracts a safe, user-facing message from any caught error.
 * Never exposes stack traces or internal details.
 */
export function safeErrorMessage(err: unknown): string {
  // Known application error
  if (err instanceof AppError) return err.message

  // Mongoose duplicate key (e.g., unique email)
  if (
    typeof err === "object" &&
    err !== null &&
    "code" in err &&
    (err as Record<string, unknown>).code === 11000
  ) {
    return "A record with that value already exists."
  }

  // Fallback — never forward raw message
  return "Something went wrong. Please try again."
}

/**
 * Typed application error for expected failure cases.
 * The `message` is safe to show to users.
 */
export class AppError extends Error {
  public readonly statusCode: number

  constructor(message: string, statusCode = 400) {
    super(message)
    this.name = "AppError"
    this.statusCode = statusCode
  }
}
```

### When to Use AppError

Throw `AppError` for **expected** business-rule failures where the message is safe to display:

```ts
if (budget.limitAmount < 0) {
  throw new AppError("Budget limit cannot be negative.")
}
```

For unexpected failures (DB down, network errors), let them throw naturally — the outer `catch` in the Route Handler calls `safeErrorMessage()` which returns the generic fallback.

---

## Client-Side Error Display

### Form-Level Errors — MUI Alert

All form-level error messages (API failures, general validation failures) use MUI `Alert`:

```tsx
"use client"

import Alert from "@mui/material/Alert"

function TransactionForm() {
  const [formError, setFormError] = useState<string | null>(null)

  async function handleSubmit(data: CreateTransactionInput) {
    setFormError(null)

    const res = await fetch("/api/transactions", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(data),
    })
    const json: ApiResponse<Transaction> = await res.json()

    if (!json.ok) {
      setFormError(json.error)
      return
    }

    // Success — redirect, update state, etc.
  }

  return (
    <form onSubmit={handleSubmit}>
      {formError && (
        <Alert severity="error" sx={{ mb: 2 }}>
          {formError}
        </Alert>
      )}
      {/* ... form fields ... */}
    </form>
  )
}
```

### Field-Level Errors — MUI TextField

Inline field errors use MUI's built-in `error` and `helperText` props:

```tsx
<TextField
  label="Amount"
  name="amount"
  error={Boolean(fieldErrors.amount)}
  helperText={fieldErrors.amount}
/>
```

### Success Messages — MUI Alert or Snackbar

```tsx
// Inline success
<Alert severity="success">Transaction saved.</Alert>

// Toast notification (dismissable)
<Snackbar open={showSuccess} autoHideDuration={4000} onClose={handleClose}>
  <Alert severity="success" onClose={handleClose}>
    Transaction saved.
  </Alert>
</Snackbar>
```

### Alert Severity Guide

| Severity | When to Use |
|---|---|
| `error` | Validation failure, API error, auth failure, form submission failure |
| `warning` | Non-blocking caution (approaching budget limit, session expiring) |
| `success` | Confirmed action (saved, deleted, updated) |
| `info` | Neutral system message (no data yet, feature unavailable) |

---

## Client-Side Validation with Zod

Reuse the **same Zod schemas** on the client that the API uses on the server. This ensures consistent validation without duplicating rules.

```tsx
"use client"

import { createTransactionSchema } from "@/lib/schemas/transaction"

function handleSubmit(values: FormValues) {
  const result = createTransactionSchema.safeParse(values)

  if (!result.success) {
    // Map Zod issues to per-field errors for MUI TextFields
    const fieldErrors: Record<string, string> = {}
    for (const issue of result.error.issues) {
      const field = issue.path[0]
      if (typeof field === "string" && !fieldErrors[field]) {
        fieldErrors[field] = issue.message
      }
    }
    setErrors(fieldErrors)
    return
  }

  // result.data is typed and validated — submit to API
  submitToApi(result.data)
}
```

### Zod-to-Field-Errors Helper

```ts
// src/lib/schemas/utils.ts
import type { ZodError } from "zod"

/**
 * Converts a ZodError into a flat { fieldName: "message" } map.
 * Only includes the first error per field.
 */
export function zodFieldErrors(error: ZodError): Record<string, string> {
  const map: Record<string, string> = {}
  for (const issue of error.issues) {
    const key = String(issue.path[0] ?? "_form")
    if (!map[key]) map[key] = issue.message
  }
  return map
}
```

---

## Next.js Error Boundaries

### `error.tsx` — Route-Level Error Boundary

Each route segment can have an `error.tsx` that catches unhandled errors during rendering.

```tsx
// src/app/dashboard/error.tsx
"use client"

import Alert from "@mui/material/Alert"
import Button from "@mui/material/Button"
import Box from "@mui/material/Box"

export default function DashboardError({
  error,
  reset,
}: {
  error: Error & { digest?: string }
  reset: () => void
}) {
  return (
    <Box sx={{ p: 4, maxWidth: 480, mx: "auto" }}>
      <Alert
        severity="error"
        action={
          <Button color="inherit" size="small" onClick={reset}>
            Try again
          </Button>
        }
      >
        Something went wrong loading the dashboard.
      </Alert>
    </Box>
  )
}
```

**Rules for `error.tsx`:**
- Always `"use client"` — error boundaries must be client components.
- Never display `error.message` to the user — it may contain internal details.
- Log `error.message` and `error.digest` for debugging (or send to an error tracker).
- Always provide a "Try again" action via `reset()`.

### `not-found.tsx` — 404 Pages

```tsx
// src/app/not-found.tsx
import Alert from "@mui/material/Alert"
import Box from "@mui/material/Box"
import Button from "@mui/material/Button"
import Link from "next/link"

export default function NotFound() {
  return (
    <Box sx={{ p: 4, maxWidth: 480, mx: "auto", textAlign: "center" }}>
      <Alert severity="info" sx={{ mb: 2 }}>
        The page you're looking for doesn't exist.
      </Alert>
      <Button component={Link} href="/" variant="contained">
        Go home
      </Button>
    </Box>
  )
}
```

### `global-error.tsx` — Root Fallback

```tsx
// src/app/global-error.tsx
"use client"

export default function GlobalError({
  error,
  reset,
}: {
  error: Error & { digest?: string }
  reset: () => void
}) {
  return (
    <html>
      <body>
        <div style={{ padding: "2rem", textAlign: "center" }}>
          <h1>Something went wrong</h1>
          <p>Please try refreshing the page.</p>
          <button onClick={reset}>Try again</button>
        </div>
      </body>
    </html>
  )
}
```

> `global-error.tsx` cannot use MUI because it replaces the root layout (which mounts the ThemeProvider). Use plain HTML here.

---

## Error Message Wording

### Do

- Use complete sentences: "Email is required."
- Be specific about what went wrong: "Password must be at least 8 characters."
- Suggest a fix when possible: "Please enter a valid email address."
- Keep it short — one line per error.

### Don't

- Expose technical details: ~~"MongoServerError: E11000 duplicate key"~~
- Use jargon: ~~"Validation failed for path `email`"~~
- Blame the user: ~~"You entered an invalid email"~~
- Show stack traces or error codes to the user

### Standard Messages

| Scenario | User-Facing Message |
|---|---|
| Missing auth session | "Please sign in to continue." |
| Forbidden (not owner) | "You don't have permission to do that." |
| Validation failure | Field-specific Zod message (e.g., "Amount must be greater than zero") |
| Duplicate record | "A record with that value already exists." |
| Not found | "The requested item could not be found." |
| Rate limited | "Too many requests. Please wait a moment." |
| Generic server error | "Something went wrong. Please try again." |

---

## Summary Checklist

- [ ] Every API route wraps logic in `try/catch` and returns `ApiResponse<T>`
- [ ] Every API route validates input with `schema.safeParse()` before any DB call
- [ ] Zod schemas live in `src/lib/schemas/` and are shared between server and client
- [ ] `safeErrorMessage()` is the only function that converts caught errors to user-facing strings
- [ ] Form-level errors use `<Alert severity="error">`
- [ ] Field-level errors use `<TextField error helperText={...} />`
- [ ] `error.tsx` exists for key route segments and never displays `error.message`
- [ ] No raw error messages, stack traces, or DB errors ever reach the UI
