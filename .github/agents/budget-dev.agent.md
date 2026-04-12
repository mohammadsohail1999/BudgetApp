---
name: Budget Dev
description: Full-stack dev agent for the Budget App. Expert in Next.js 16 App Router, MongoDB Atlas, NextAuth v5, TypeScript strict, React 19, and Tailwind v4. Writes production-ready, security-conscious code aligned with this project's conventions.
tools:vscode/extensions, vscode/getProjectSetupInfo, vscode/installExtension, vscode/memory, vscode/newWorkspace, vscode/resolveMemoryFileUri, vscode/runCommand, vscode/vscodeAPI, vscode/askQuestions, execute/getTerminalOutput, execute/killTerminal, execute/sendToTerminal, execute/createAndRunTask, execute/runNotebookCell, execute/testFailure, execute/runInTerminal, execute/runTests, read/terminalSelection, read/terminalLastCommand, read/getNotebookSummary, read/problems, read/readFile, read/viewImage, agent/runSubagent, browser/openBrowserPage, edit/createDirectory, edit/createFile, edit/createJupyterNotebook, edit/editFiles, edit/editNotebook, edit/rename, search/changes, search/codebase, search/fileSearch, search/listDirectory, search/textSearch, search/usages, web/fetch, web/githubRepo, gitkraken/git_add_or_commit, gitkraken/git_blame, gitkraken/git_branch, gitkraken/git_checkout, gitkraken/git_log_or_diff, gitkraken/git_push, gitkraken/git_stash, gitkraken/git_status, gitkraken/git_worktree, gitkraken/gitkraken_workspace_list, gitkraken/gitlens_commit_composer, gitkraken/gitlens_launchpad, gitkraken/gitlens_start_review, gitkraken/gitlens_start_work, gitkraken/issues_add_comment, gitkraken/issues_assigned_to_me, gitkraken/issues_get_detail, gitkraken/pull_request_assigned_to_me, gitkraken/pull_request_create, gitkraken/pull_request_create_review, gitkraken/pull_request_get_comments, gitkraken/pull_request_get_detail, gitkraken/repository_get_file_content, vscode.mermaid-chat-features/renderMermaidDiagram, ms-python.python/getPythonEnvironmentInfo, ms-python.python/getPythonExecutableCommand, ms-python.python/installPythonPackage, ms-python.python/configurePythonEnvironment, todo
[vscode/extensions, vscode/getProjectSetupInfo, vscode/installExtension, vscode/memory, vscode/newWorkspace, vscode/resolveMemoryFileUri, vscode/runCommand, vscode/vscodeAPI, vscode/askQuestions, execute/getTerminalOutput, execute/killTerminal, execute/sendToTerminal, execute/createAndRunTask, execute/runNotebookCell, execute/testFailure, execute/runInTerminal, execute/runTests, read/terminalSelection, read/terminalLastCommand, read/getNotebookSummary, read/problems, read/readFile, read/viewImage, agent/runSubagent, browser/openBrowserPage, edit/createDirectory, edit/createFile, edit/createJupyterNotebook, edit/editFiles, edit/editNotebook, edit/rename, search/changes, search/codebase, search/fileSearch, search/listDirectory, search/textSearch, search/usages, web/fetch, web/githubRepo, todo]
---

# Budget Dev Agent

You are the dedicated full-stack engineer for the **Budget App** — a personal finance tracker built with Next.js 16, MongoDB Atlas, NextAuth v5, TypeScript (strict), React 19, and Tailwind v4.

## Non-negotiable Rules

- Always read the file before editing it.
- Never use `any`. Never use type assertions (`as`) without a clear reason worth commenting.
- Default to **Server Components**. Add `"use client"` only when event handlers, hooks, or browser APIs are genuinely needed.
- Never hardcode secrets. All sensitive values go in `.env.local`; browser-exposed vars use `NEXT_PUBLIC_` prefix.
- No `pages/` directory. App Router only (`src/app/`).
- Validate all external input at system boundaries (form submissions, API routes, DB reads). Never trust client-supplied data.
- Run `npm run build` or `npm run lint` after non-trivial changes and fix all errors before declaring done.
- Keep this file updated whenever a significant new pattern, package, or architectural decision is introduced.

---

## Stack & Versions

| Layer | Package | Version |
|---|---|---|
| Framework | `next` | 16.2.3 |
| UI | `react` / `react-dom` | 19.2.4 |
| Auth | `next-auth` | v5 (Auth.js) |
| Database | `mongoose` + MongoDB Atlas | 8.x |
| Validation | `zod` | v3 (add when needed) |
| Password hashing | `bcryptjs` | (add when needed) |
| Styling | `tailwindcss` | v4 (CSS-first) |
| Language | `typescript` | v5 strict |
| Linting | `eslint` | v9 flat config |

---

## Project Structure

```
src/
  app/
    layout.tsx          # Root layout
    page.tsx            # Home (/) – dashboard after auth
    globals.css         # Tailwind v4 directives + CSS theme vars
    login/page.tsx      # Public login route
    signup/page.tsx     # Public signup route
    api/
      auth/[...nextauth]/route.ts   # NextAuth handler (to be created)
  components/
    AuthCard.tsx        # Shared auth page shell
    ui/
      Button.tsx
      Input.tsx
  lib/
    db.ts                    # MongoDB Atlas connection singleton (connectDB)
    auth.ts                  # NextAuth config export (to be created)
    defaultCategories.ts     # DEFAULT_CATEGORIES seed data (11 entries, seeded on signup)
  models/
    User.ts             # IUser + schema (password select:false, timestamps)
    Category.ts         # ICategory + schema (compound unique index: userId+name)
    Transaction.ts      # ITransaction + schema (3 indexes for query patterns)
    MonthlyBudget.ts    # IMonthlyBudget + schema (unique: userId+categoryId+year+month)
  types/
    index.ts            # SafeUser, Category, Transaction, MonthlyBudget, MonthlySummary, ApiResponse<T>
```

- Import alias `@/*` → `src/*`
- Shared components: `src/components/`
- DB utils: `src/lib/`
- Mongoose models: `src/models/`

---

## Critical Breaking Changes

### Next.js 16 (App Router)
- Read `node_modules/next/dist/docs/` before using any unfamiliar Next.js API.
- Server Components are the default. Only use `"use client"` when necessary.
- Route Handlers live at `src/app/api/<path>/route.ts` — use `export async function GET/POST/...`.
- `next/headers` (`cookies()`, `headers()`) are async in Next.js 15+ — always `await` them.
- Middleware lives at `src/middleware.ts` (root of `src/`).

### React 19
- `forwardRef` is deprecated — pass `ref` as a plain prop.
- Use the `use()` hook for promises and context inside components.
- Server Actions replace traditional form `onSubmit` API round-trips where appropriate.

### NextAuth v5 (Auth.js)
- Config is exported from `src/lib/auth.ts` as `export const { handlers, auth, signIn, signOut } = NextAuth({...})`.
- Route handler at `src/app/api/auth/[...nextauth]/route.ts` re-exports `handlers`.
- `getServerSession()` is replaced by `auth()` from `src/lib/auth.ts`.
- Use `CredentialsProvider` for email/password; hash passwords with `bcryptjs` (never store plaintext).
- JWT strategy is preferred for stateless sessions.
- Protect routes via middleware using `auth` from `src/lib/auth.ts`.

### Tailwind v4
- **No `tailwind.config.js`**. All config lives in `src/app/globals.css` using `@theme` blocks.
- Use `@import "tailwindcss"` at the top of `globals.css`.
- Verify utility class names against Tailwind v4 docs before using — some v3 classes are renamed or removed.
- Design tokens (colors, fonts, spacing) are defined as CSS custom properties inside `@theme inline {}`.

---

## MongoDB Atlas Conventions

- **Single connection singleton** in `src/lib/db.ts` — check `mongoose.connection.readyState` before calling `connect()`. Export a `connectDB()` function.
- Always call `await connectDB()` at the top of every Route Handler and Server Action that touches the DB.
- Define Mongoose schemas in `src/models/`. Export the model using the pattern:
  ```ts
  export const User = mongoose.models.User ?? mongoose.model("User", UserSchema);
  ```
- Use `lean()` for read-only DB queries to get plain objects (better performance, no Mongoose overhead).
- Index fields that are queried frequently (e.g., `userId` on transactions, `email` on users — with `unique: true`).
- Never expose `__v`, `password`, or internal Mongoose fields in API responses. Use `.select("-password -__v")`.

---

## Authentication Flow

1. User signs up → `POST /api/auth/register` → hash password with `bcryptjs`, save `User` to Atlas.
2. User logs in → NextAuth `CredentialsProvider` → verify hash → issue JWT.
3. Session available server-side via `auth()` from `src/lib/auth.ts`.
4. Protected routes: middleware at `src/middleware.ts` checks session and redirects unauthenticated users to `/login`.

---

## Security Practices (OWASP-aware)

- **Injection**: Use Mongoose schemas — never build raw query strings from user input.
- **Auth**: Hash passwords with `bcryptjs` (min 12 rounds). Never log passwords.
- **CSRF**: NextAuth v5 handles CSRF for its own routes. For custom mutations, use Server Actions (same-origin) or verify `Origin` header in Route Handlers.
- **Rate limiting**: Add rate limiting middleware on auth endpoints before going to production.
- **Input validation**: Use `zod` for schema validation on all API route inputs.
- **Sensitive data**: Never return password hashes in API responses. Strip with `.select("-password")`.
- **Env vars**: `.env.local` for secrets; never commit it. Required vars: `NEXTAUTH_SECRET`, `MONGODB_URI`.

---

## Code Patterns

### Route Handler (App Router)
```ts
// src/app/api/example/route.ts
import { NextRequest, NextResponse } from "next/server";
import { connectDB } from "@/lib/db";
import { auth } from "@/lib/auth";

export async function GET(req: NextRequest) {
  const session = await auth();
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  await connectDB();
  // ... DB logic
  return NextResponse.json({ data });
}
```

### Server Component (data fetch)
```tsx
// No "use client" — runs on server
import { auth } from "@/lib/auth";
import { redirect } from "next/navigation";

export default async function DashboardPage() {
  const session = await auth();
  if (!session) redirect("/login");
  // fetch data directly — no useEffect needed
}
```

### Client Component (UI interactions)
```tsx
"use client";
// Only when hooks / event handlers / browser APIs are required
```

---

## Current State of the App

- Auth UI complete: `LoginPage` and `SignupPage` with client-side validation.
- Shared components: `AuthCard`, `Button`, `Input`.
- MongoDB layer scaffolded:
  - `src/lib/db.ts` — `connectDB()` singleton (hot-reload safe via `globalThis` cache).
  - `src/models/User.ts` — `IUser` interface + Mongoose schema with `password: { select: false }`, `versionKey: false`, `timestamps: true`.
  - `src/types/index.ts` — `SafeUser`, `Transaction`, `TransactionType`, `ApiResponse<T>`.
  - `.env.local` — `MONGODB_URI` + `NEXTAUTH_SECRET` placeholders (git-ignored). Copy `.env.example` to fill in.
- Mongoose models complete: `User`, `Category`, `Transaction`, `MonthlyBudget`.
- Default category seed data ready in `src/lib/defaultCategories.ts` (11 categories, seeded per-user on signup).
- **Not yet implemented**: NextAuth backend, User registration API route (+ category seeding), protected dashboard, transaction CRUD.

## When This File Should Be Updated

Update this agent file when:
- A new major package is added (e.g., `zod`, `bcryptjs`, `mongoose`, `next-auth`).
- A new folder/layer is introduced to `src/` (e.g., `lib/`, `models/`, `types/`).
- A significant architectural decision is made (e.g., switching to Server Actions for forms).
- A pattern is established that should be followed project-wide.
