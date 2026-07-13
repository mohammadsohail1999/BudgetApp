---
name: routing
description: Use when adding a new route, page, layout, navigation, dynamic segment, proxy/middleware, or API route structure in this budget-app project. Covers the Next.js 16 App Router file layout, public vs protected routes, the proxy.ts route-protection file, and Route Handler conventions.
---

# Routing Conventions

## Overview

This app uses the **Next.js 16 App Router** with file-system based routing. All routes live under `src/app/`. There is no `pages/` directory.

---

## Route Structure

```
src/app/
├── layout.tsx                        # Root layout (html + body + providers)
├── page.tsx                          # Home → redirects to /app/dashboard
├── globals.css                       # Tailwind v4 + CSS theme vars
├── login/page.tsx                    # Public — /login
├── signup/page.tsx                   # Public — /signup
├── app/                              # Protected shell — all authenticated routes
│   ├── layout.tsx                    # App layout (sidebar, nav, session provider)
│   ├── dashboard/page.tsx            # /app/dashboard
│   ├── transactions/
│   │   ├── page.tsx                  # /app/transactions (list)
│   │   └── [id]/page.tsx            # /app/transactions/:id (detail)
│   ├── budgets/
│   │   ├── page.tsx                  # /app/budgets (list by month)
│   │   └── [id]/page.tsx            # /app/budgets/:id (edit)
│   ├── categories/
│   │   └── page.tsx                  # /app/categories (manage)
│   ├── analytics/
│   │   └── page.tsx                  # /app/analytics (charts/reports)
│   └── settings/
│       └── page.tsx                  # /app/settings (profile, preferences)
├── api/
│   ├── auth/
│   │   ├── [...nextauth]/route.ts   # NextAuth handler
│   │   └── register/route.ts        # POST /api/auth/register
│   ├── transactions/
│   │   ├── route.ts                 # GET (list) / POST (create)
│   │   └── [id]/route.ts           # GET / PATCH / DELETE
│   ├── budgets/
│   │   ├── route.ts                 # GET / POST
│   │   └── [id]/route.ts           # PATCH / DELETE
│   ├── categories/
│   │   ├── route.ts                 # GET / POST
│   │   └── [id]/route.ts           # PATCH / DELETE
│   └── analytics/
│       └── route.ts                 # GET (aggregation queries)
```

---

## Route Naming Rules

| Rule | Example | Rationale |
|---|---|---|
| Use plural nouns for resource collections | `/app/transactions`, not `/app/transaction` | Matches REST conventions |
| Use kebab-case for multi-word routes | `/app/monthly-budgets` (if needed) | URL-friendly, consistent |
| Dynamic segments use `[param]` | `/app/transactions/[id]` | Next.js convention |
| Catch-all routes use `[...param]` | `/api/auth/[...nextauth]` | Only for auth handler |
| No verb-based routes for pages | `/app/transactions`, not `/app/create-transaction` | Use modals/dialogs for create/edit |
| API routes mirror resource structure | `/api/transactions/[id]` matches `/app/transactions/[id]` | Predictable mapping |

---

## Public vs Protected Routes

### Public routes (no auth required)

| Path | Purpose |
|---|---|
| `/login` | Login page |
| `/signup` | Registration page |
| `/` | Landing/redirect (sends auth users → `/app/dashboard`, guests → `/login`) |

### Protected routes (auth required)

**Everything under `/app/*` requires authentication.** Unauthenticated requests are redirected to `/login`.

---

## Route Protection via Proxy

> **Next.js 16 breaking change**: Middleware has been renamed to **Proxy**. The file is `src/proxy.ts` (not `middleware.ts`). The function is exported as `proxy` or as a default export.

### `src/proxy.ts`

```ts
import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";
import { getToken } from "next-auth/jwt";

export async function proxy(request: NextRequest) {
  const { pathname } = request.nextUrl;

  // Public routes — skip auth check
  const publicPaths = ["/login", "/signup", "/api/auth"];
  const isPublic = publicPaths.some((path) => pathname.startsWith(path));

  if (isPublic) {
    return NextResponse.next();
  }

  // Check for valid session token
  const token = await getToken({
    req: request,
    secret: process.env.NEXTAUTH_SECRET,
  });

  // Unauthenticated → redirect to login
  if (!token && pathname.startsWith("/app")) {
    const loginUrl = new URL("/login", request.url);
    loginUrl.searchParams.set("callbackUrl", pathname);
    return NextResponse.redirect(loginUrl);
  }

  // Unauthenticated API request → 401
  if (!token && pathname.startsWith("/api") && !pathname.startsWith("/api/auth")) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  // Authenticated user hitting /login or /signup → redirect to dashboard
  if (token && (pathname === "/login" || pathname === "/signup")) {
    return NextResponse.redirect(new URL("/app/dashboard", request.url));
  }

  return NextResponse.next();
}

export const config = {
  matcher: [
    // Match all paths except static files and Next.js internals
    "/((?!_next/static|_next/image|favicon.ico|.*\\.(?:svg|png|jpg|jpeg|gif|webp)$).*)",
  ],
};
```

### Protection rules summary

| Request | Token present? | Result |
|---|---|---|
| `GET /app/dashboard` | No | Redirect → `/login?callbackUrl=/app/dashboard` |
| `GET /app/dashboard` | Yes | Allow |
| `GET /login` | Yes | Redirect → `/app/dashboard` |
| `GET /login` | No | Allow |
| `POST /api/transactions` | No | 401 JSON response |
| `POST /api/auth/register` | No | Allow (public API) |

---

## Special Files (per route segment)

| File | Purpose |
|---|---|
| `page.tsx` | UI for the route — required to make a route publicly accessible |
| `layout.tsx` | Shared UI wrapper — persists across navigations |
| `loading.tsx` | Instant loading skeleton (Suspense boundary) |
| `error.tsx` | Error boundary for the segment |
| `not-found.tsx` | Custom 404 UI for the segment |

### When to use `layout.tsx`

- **Root layout** (`src/app/layout.tsx`) — `<html>`, `<body>`, providers (theme, session)
- **App layout** (`src/app/app/layout.tsx`) — sidebar, navigation bar, user menu — shared by all protected pages
- **Do NOT** nest layouts deeper unless the UI genuinely differs (e.g., a full-width analytics page vs a sidebar page)

---

## Navigation

### Client-side navigation

Always use `next/link` for internal links:

```tsx
import Link from "next/link";

<Link href="/app/transactions">Transactions</Link>
```

### Programmatic navigation

Use `next/navigation` (not `next/router` — that's the old Pages Router):

```tsx
"use client";
import { useRouter } from "next/navigation";

const router = useRouter();
router.push("/app/dashboard");
```

### Redirects in Server Components

```tsx
import { redirect } from "next/navigation";

// Inside an async Server Component
const session = await getServerSession(authOptions);
if (!session) redirect("/login");
```

---

## Dynamic Routes

### Pattern: `/app/transactions/[id]`

```
src/app/app/transactions/[id]/page.tsx
```

```tsx
interface Props {
  params: Promise<{ id: string }>;
}

export default async function TransactionDetailPage({ params }: Props) {
  const { id } = await params;
  // Fetch transaction by id...
}
```

> **Next.js 15+ breaking change**: `params` is now a `Promise` — always `await` it.

---

## API Routes (Route Handlers)

### Convention

- File: `src/app/api/<resource>/route.ts`
- Export named functions: `GET`, `POST`, `PATCH`, `DELETE`
- One route file per resource level

```ts
// src/app/api/transactions/route.ts
import { NextRequest, NextResponse } from "next/server";

export async function GET(req: NextRequest) { /* list */ }
export async function POST(req: NextRequest) { /* create */ }
```

```ts
// src/app/api/transactions/[id]/route.ts
import { NextRequest, NextResponse } from "next/server";

interface Props {
  params: Promise<{ id: string }>;
}

export async function GET(req: NextRequest, { params }: Props) {
  const { id } = await params;
  /* fetch by id */
}

export async function PATCH(req: NextRequest, { params }: Props) { /* update */ }
export async function DELETE(req: NextRequest, { params }: Props) { /* delete */ }
```

---

## Grouping & Organization

### Route Groups `(folder)`

Use parentheses for logical grouping without affecting the URL:

```
src/app/
├── (marketing)/        # Does NOT add /marketing to URL
│   ├── about/page.tsx  # → /about
│   └── pricing/page.tsx # → /pricing
```

We don't currently need route groups, but use them if the app grows and routes need separate layouts.

### Co-location

Keep route-specific components near the route:

```
src/app/app/transactions/
├── page.tsx                    # Route page
├── TransactionList.tsx         # Client component used only here
├── columns.tsx                 # Table column definitions
└── loading.tsx                 # Loading skeleton
```

---

## Rules

1. **All pages under `/app/*` are protected** — enforce via proxy, not per-component checks
2. **Never duplicate auth checks** — proxy handles redirect; Server Components use `getServerSession` only to read user data, not to guard access
3. **Use `loading.tsx`** for every route under `/app/` — instant navigation feedback
4. **Params are Promises** — always `await params` in page/route handler props (Next.js 15+ change)
5. **No client-side route guards** — no `useEffect` + `redirect` patterns; the proxy handles everything before render
6. **API routes return JSON** — never return HTML from `/api/*`
7. **Keep routes flat** — max 2 levels deep under `/app/` (e.g., `/app/transactions/[id]`); avoid deeply nested routes
