---
name: security
description: Use when touching secrets, env vars, auth guards, data exposure, deployment config, or .env files in this budget-app project. Covers env var handling, secrets management, data isolation, API route security, MongoDB security, and pre-commit/deployment checklists.
---

# Security Conventions

## Core Principle

**Never trust the client. Never expose secrets. Never commit credentials.**

Every line of code that touches secrets, user input, or sensitive data must follow the rules in this document. No exceptions.

---

## Environment Variables

### Required variables

| Variable | Where used | Exposure |
|---|---|---|
| `MONGODB_URI` | `src/lib/db.ts` — server only | **Never** expose to client |
| `NEXTAUTH_SECRET` | NextAuth JWT signing — server only | **Never** expose to client |
| `NEXTAUTH_URL` | NextAuth callback URL — server only | **Never** expose to client |

### File hierarchy

| File | Purpose | Committed? |
|---|---|---|
| `.env.local` | Local dev secrets — actual values | **NO** — git-ignored |
| `.env.example` | Template with placeholder keys (no real values) | **YES** — committed |

### `.env.example` format

```env
# Database
MONGODB_URI=mongodb+srv://<user>:<password>@<cluster>.mongodb.net/<db>?retryWrites=true&w=majority

# Auth
NEXTAUTH_SECRET=generate-with-openssl-rand-base64-32
NEXTAUTH_URL=http://localhost:3000
```

**Rules:**
- `.env.example` contains **only placeholder values** — never real credentials
- `.env.local` is in `.gitignore` — verify this before every commit
- Never create `.env.production`, `.env.staging`, or any other `.env.*` file with real values in the repo
- If a new env var is added, update `.env.example` immediately

### Server vs client variables

```
# Server-only (default) — accessible only in Server Components, Route Handlers, proxy
MONGODB_URI=...
NEXTAUTH_SECRET=...

# Client-exposed — accessible in browser code (use sparingly)
NEXT_PUBLIC_APP_NAME=Budget App
```

**Rules:**
- Only prefix with `NEXT_PUBLIC_` when the value is genuinely needed in the browser
- **Never** put secrets, tokens, database URIs, or API keys behind `NEXT_PUBLIC_`
- If you think you need a secret on the client, you don't — use a Route Handler as a proxy instead

---

## Secrets Management

### What counts as a secret

- Database connection strings (`MONGODB_URI`)
- JWT signing keys (`NEXTAUTH_SECRET`)
- OAuth client secrets
- API keys for third-party services
- Encryption keys
- Any value that grants access to a system

### Where secrets live

| Environment | Storage | Access |
|---|---|---|
| Local dev | `.env.local` (git-ignored) | Developer's machine only |
| CI/CD | Pipeline secrets / encrypted vars | GitHub Actions secrets, Vercel env vars |
| Production | Hosting platform env vars | Vercel dashboard, cloud provider console |

### Rules

1. **Never hardcode secrets in source code** — no string literals with credentials anywhere in `.ts`, `.tsx`, `.js`, or `.json` files
2. **Never log secrets** — no `console.log(process.env.MONGODB_URI)` or similar
3. **Never include secrets in error messages** — catch DB connection errors but don't echo the connection string
4. **Never commit `.env.local`** — verify `.gitignore` includes `.env*`
5. **Never paste secrets in chat, issues, or PRs** — use secure sharing tools
6. **Rotate immediately if leaked** — if a secret appears in a commit, consider it compromised; revoke and regenerate

### Generating secrets

```bash
# Generate a strong NEXTAUTH_SECRET
openssl rand -base64 32

# Generate a random API key
node -e "console.log(require('crypto').randomBytes(32).toString('hex'))"
```

---

## Sensitive Data in Code

### Password handling

```ts
// ✅ Correct — hash before storing
import bcrypt from "bcryptjs";
const hashed = await bcrypt.hash(password, 12);
await User.create({ email, password: hashed });

// ✅ Correct — never return password from queries
const user = await User.findById(id).select("-password");

// ❌ NEVER — plaintext password storage
await User.create({ email, password: plaintext });

// ❌ NEVER — returning password in API response
return NextResponse.json(user); // if user includes password field
```

### API responses

```ts
// ✅ Correct — strip sensitive fields
const user = await User.findById(id).select("-password -__v").lean();
return NextResponse.json({ data: user });

// ❌ NEVER — returning raw Mongoose doc (may include password, __v, internal fields)
const user = await User.findById(id);
return NextResponse.json(user);
```

### Logging

```ts
// ✅ Correct — log the error type, not the data
console.error("Login failed for user:", email);

// ❌ NEVER — logging passwords or tokens
console.log("Password:", password);
console.log("Token:", token);
console.log("Session:", JSON.stringify(session)); // may contain sensitive fields

// ❌ NEVER — logging connection strings
console.log("Connecting to:", process.env.MONGODB_URI);
```

---

## Client-Side Security

### What must NEVER reach the browser

- Database connection strings
- JWT secrets
- Password hashes (even hashed — they're still sensitive)
- Internal user IDs from other users
- Server error stack traces
- Raw Mongoose/MongoDB error messages

### Server Component vs Client Component data flow

```tsx
// ✅ Correct — Server Component fetches, passes only safe data to client
export default async function DashboardPage() {
  const session = await getServerSession(authOptions);
  const transactions = await getTransactions(session.user.id); // server-only
  return <TransactionList items={transactions} />; // only serializable, safe data
}

// ❌ NEVER — fetching secrets or DB data in client components
"use client";
const data = await fetch("/api/internal-thing", {
  headers: { "x-secret": process.env.NEXTAUTH_SECRET }, // won't work AND is wrong
});
```

### Browser storage

- **Never store tokens, passwords, or secrets in `localStorage` or `sessionStorage`**
- NextAuth manages JWT in httpOnly cookies — don't override this
- If you need to persist non-sensitive UI state (theme preference, sidebar collapsed), `localStorage` is fine

---

## API Route Security

### Authentication check (every protected route)

```ts
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";

export async function GET(req: NextRequest) {
  const session = await getServerSession(authOptions);
  if (!session) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  // Use session.user.id for all queries — never trust client-supplied userId
  const data = await Model.find({ userId: session.user.id });
  return NextResponse.json({ data });
}
```

### Authorization — always scope to user

```ts
// ✅ Correct — scope query to authenticated user
const transaction = await Transaction.findOne({
  _id: id,
  userId: session.user.id,  // prevents accessing other users' data
});

// ❌ NEVER — trusting client-supplied userId
const { userId } = await req.json();
const transaction = await Transaction.findOne({ _id: id, userId }); // IDOR vulnerability
```

### Input validation

- Validate ALL request bodies with Zod (see [[errors-and-validation]] skill)
- Validate URL params (e.g., check that `id` is a valid MongoDB ObjectId)
- Never pass raw user input to MongoDB queries

```ts
import { z } from "zod";
import mongoose from "mongoose";

const paramsSchema = z.object({
  id: z.string().refine((val) => mongoose.Types.ObjectId.isValid(val), {
    message: "Invalid ID format",
  }),
});
```

---

## MongoDB Security

- **Connection string in `.env.local` only** — never in source code
- **IP whitelist** — restrict Atlas Network Access to known IPs (dev machine, deployment IPs)
- **Least-privilege DB user** — use a DB user with only `readWrite` on the `budget-app` database, not `atlasAdmin`
- **Use Mongoose schemas** — never build raw query strings from user input (prevents NoSQL injection)
- **Sanitize query operators** — if accepting filter params from clients, whitelist allowed fields; never pass raw objects to `.find()`

---

## Git & Version Control

### Pre-commit checklist

Before every commit, verify:

1. `git diff --staged` — no secrets, credentials, or `.env` values in the diff
2. `.gitignore` includes `.env*` and `.vscode/mcp.json`
3. No hardcoded URLs with credentials (e.g., `mongodb+srv://user:pass@...`)
4. No `console.log` with sensitive data

### Files that must NEVER be committed

| File/Pattern | Reason |
|---|---|
| `.env.local` | Contains real secrets |
| `.env.*.local` | Environment-specific secrets |
| `.vscode/mcp.json` | Contains DB credentials for MCP server |
| `*.pem` | Private keys |
| Any file with real passwords, tokens, or keys | Self-explanatory |

### If a secret is accidentally committed

1. **Revoke the secret immediately** — generate a new one
2. Remove the file from git history using `git filter-repo` or BFG Repo-Cleaner
3. Force-push the cleaned history
4. Update `.env.local` with the new secret
5. Verify `.gitignore` prevents recurrence

> Simply deleting the file in a new commit does NOT remove it from git history. The old value is still accessible.

---

## Deployment Security

### Vercel (or any hosting platform)

- Add env vars through the platform dashboard — never through committed files
- Use separate env vars per environment (Preview, Production)
- Enable "Sensitive" flag for secrets so they aren't shown in logs
- Never use `vercel env pull` output as a committed file

### Production hardening checklist

- [ ] `NEXTAUTH_SECRET` is a random 32+ byte value (not a dictionary word)
- [ ] `NEXTAUTH_URL` is set to the production domain
- [ ] `MONGODB_URI` uses a dedicated production DB user (not the dev user)
- [ ] Atlas IP whitelist is scoped to deployment IPs only (not 0.0.0.0/0)
- [ ] No `console.log` statements with sensitive data in production code
- [ ] Error responses never include stack traces or internal error messages
- [ ] CORS is configured if API is accessed cross-origin
- [ ] Rate limiting is in place for auth endpoints (`/api/auth/register`, `/api/auth/[...nextauth]`)

---

## Quick Reference: Do / Don't

| Do | Don't |
|---|---|
| Store secrets in `.env.local` | Hardcode secrets in code |
| Use `.env.example` with placeholders | Commit `.env.local` |
| Validate all input with Zod | Trust client-supplied data |
| Scope queries to `session.user.id` | Accept `userId` from request body |
| Select `-password` on User queries | Return raw Mongoose docs |
| Log error types, not data | `console.log` passwords or tokens |
| Use `NEXT_PUBLIC_` only for safe values | Put secrets behind `NEXT_PUBLIC_` |
| Rotate secrets if leaked | Assume deleting a commit removes it |
| Use bcrypt with 12+ rounds | Store plaintext passwords |
| Use httpOnly cookies (NextAuth default) | Store tokens in localStorage |
