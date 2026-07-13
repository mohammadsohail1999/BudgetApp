---
name: auth
description: Use when implementing or modifying authentication in this budget-app project — NextAuth v4 config, session access, the proxy.ts route-protection file, registration, or per-user data isolation.
---

# Authentication Conventions

## Stack

- **NextAuth v4** — handles sessions, JWT, CSRF, and credential-based auth
- **bcryptjs** — password hashing (min 12 rounds)
- **Zod** — request body validation on all auth API routes
- **Middleware** — route protection enforced at the edge before any page renders

---

## File Locations

| File | Purpose |
|---|---|
| `src/lib/auth.ts` | NextAuth config object — `authOptions` exported for reuse |
| `src/app/api/auth/[...nextauth]/route.ts` | Mounts NextAuth handler for App Router |
| `src/app/api/auth/register/route.ts` | Custom registration endpoint |
| `src/proxy.ts` | Proxy (Next.js 16) — protects all routes by default |
| `src/types/next-auth.d.ts` | Module augmentation — adds `id` to `session.user` |
| `src/components/SessionProvider.tsx` | Client wrapper for NextAuth `SessionProvider` |

---

## NextAuth Config (`src/lib/auth.ts`)

```ts
import type { NextAuthOptions } from "next-auth";
import CredentialsProvider from "next-auth/providers/credentials";
import { connectDB } from "@/lib/db";
import { User } from "@/models/User";
import bcrypt from "bcryptjs";
import { z } from "zod";

const loginSchema = z.object({
  email: z.string().email(),
  password: z.string().min(8),
});

export const authOptions: NextAuthOptions = {
  session: { strategy: "jwt" },
  pages: {
    signIn: "/login",
    error: "/login",
  },
  providers: [
    CredentialsProvider({
      name: "credentials",
      credentials: {
        email: { label: "Email", type: "email" },
        password: { label: "Password", type: "password" },
      },
      async authorize(credentials) {
        const parsed = loginSchema.safeParse(credentials);
        if (!parsed.success) return null;

        await connectDB();
        const user = await User.findOne({ email: parsed.data.email })
          .select("+password")
          .lean();

        if (!user) return null;

        const passwordMatch = await bcrypt.compare(
          parsed.data.password,
          user.password
        );
        if (!passwordMatch) return null;

        return {
          id: user._id.toString(),
          name: user.name,
          email: user.email,
        };
      },
    }),
  ],
  callbacks: {
    async jwt({ token, user }) {
      if (user) token.id = user.id;
      return token;
    },
    async session({ session, token }) {
      if (token.id) session.user.id = token.id as string;
      return session;
    },
  },
};
```

**Rules:**
- `authOptions` is a plain exported object — pass it to `getServerSession(authOptions)` and the route handler
- Always use `strategy: "jwt"` — stateless, no DB session store needed
- `user.id` is injected into the JWT in the `jwt` callback and surfaced as `session.user.id` via the `session` callback — this is the authoritative identity value used everywhere
- Never store sensitive data (password, internal flags) in the JWT token

---

## Route Handler (`src/app/api/auth/[...nextauth]/route.ts`)

```ts
import NextAuth from "next-auth";
import { authOptions } from "@/lib/auth";

const handler = NextAuth(authOptions);

export { handler as GET, handler as POST };
```

---

## Registration (`src/app/api/auth/register/route.ts`)

```ts
import { NextRequest, NextResponse } from "next/server";
import { connectDB } from "@/lib/db";
import { User } from "@/models/User";
import { Category } from "@/models/Category";
import { DEFAULT_CATEGORIES } from "@/lib/defaultCategories";
import bcrypt from "bcryptjs";
import { z } from "zod";

const registerSchema = z.object({
  name: z.string().min(1).max(100),
  email: z.string().email(),
  password: z.string().min(8),
});

export async function POST(req: NextRequest) {
  const body = await req.json();
  const parsed = registerSchema.safeParse(body);

  if (!parsed.success) {
    return NextResponse.json(
      { ok: false, error: parsed.error.errors[0].message },
      { status: 400 }
    );
  }

  await connectDB();

  const exists = await User.findOne({ email: parsed.data.email }).lean();
  if (exists) {
    return NextResponse.json(
      { ok: false, error: "An account with this email already exists." },
      { status: 409 }
    );
  }

  const hash = await bcrypt.hash(parsed.data.password, 12);
  const user = await User.create({
    name: parsed.data.name,
    email: parsed.data.email,
    password: hash,
  });

  // Seed default categories for this user
  await Category.insertMany(
    DEFAULT_CATEGORIES.map((cat) => ({ ...cat, userId: user._id }))
  );

  return NextResponse.json({ ok: true }, { status: 201 });
}
```

---

## Proxy (`src/proxy.ts`)

> **Next.js 16 breaking change**: Middleware has been renamed to **Proxy**. The file is `src/proxy.ts` (not `middleware.ts`). The function is exported as `proxy` or as a default export.

All routes are protected by default. Public paths are excluded explicitly. Uses `getToken` from `next-auth/jwt` to check for a valid session.

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
    // Authenticated user hitting /login or /signup → redirect to dashboard
    if (pathname === "/login" || pathname === "/signup") {
      const token = await getToken({
        req: request,
        secret: process.env.NEXTAUTH_SECRET,
      });
      if (token) {
        return NextResponse.redirect(new URL("/app/dashboard", request.url));
      }
    }
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
  if (!token && pathname.startsWith("/api")) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  return NextResponse.next();
}

export const config = {
  matcher: [
    "/((?!_next/static|_next/image|favicon.ico|.*\\.(?:svg|png|jpg|jpeg|gif|webp)$).*)",
  ],
};
```

**Rules:**
- Uses `getToken()` from `next-auth/jwt` — works at the edge without DB access
- The `matcher` excludes static assets; the function itself handles public vs protected logic
- To make a new route public, add it to the `publicPaths` array
- Authenticated users hitting `/login` or `/signup` are redirected to `/app/dashboard`
- Unauthenticated API requests get a 401 JSON response (not a redirect)

---

## Accessing the Session

### In Server Components and Route Handlers (v4)

```ts
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";

const session = await getServerSession(authOptions);
if (!session) return NextResponse.json({ ok: false, error: "Unauthorized" }, { status: 401 });

const userId = session.user.id; // string — injected via session callback
```

### In Client Components

```tsx
"use client";
import { useSession } from "next-auth/react";

const { data: session } = useSession();
const userId = session?.user?.id;
```

### SessionProvider setup (`src/app/layout.tsx`)

`useSession` requires `SessionProvider` mounted at the root:

```tsx
import { SessionProvider } from "next-auth/react";

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html>
      <body>
        <SessionProvider>{children}</SessionProvider>
      </body>
    </html>
  );
}
```

**Rule:** Never trust `userId` from the request body or query params. Always read it from `getServerSession(authOptions)`.

---

## Extending the Session Type

NextAuth v4 does not include `id` on `session.user` by default. Extend it via module augmentation in `src/types/next-auth.d.ts`:

```ts
import type { DefaultSession } from "next-auth";

declare module "next-auth" {
  interface Session {
    user: {
      id: string;
    } & DefaultSession["user"];
  }
}

declare module "next-auth/jwt" {
  interface JWT {
    id: string;
  }
}
```

---

## Data Isolation

Every user can only access their own data. This is enforced at **two levels**:

### 1. Session level (API routes)
Every Route Handler and Server Action that touches the DB must:
1. Call `auth()` and verify the session exists
2. Extract `session.user.id` as the authoritative `userId`
3. Pass that `userId` as a filter in every DB query

```ts
// ✅ Correct — userId comes from the session
const session = await auth();
if (!session) return NextResponse.json({ ok: false, error: "Unauthorized" }, { status: 401 });

const transactions = await Transaction.find({ userId: session.user.id }).lean();
```

```ts
// ❌ Wrong — never trust userId from the client
const { userId } = await req.json();
const transactions = await Transaction.find({ userId }).lean();
```

### 2. Database level (Mongoose queries)
Every query that reads or mutates data **must** include `userId` as a filter — even when a resource ID is already known.

```ts
// ✅ Correct — scoped to the authenticated user
await Transaction.findOneAndDelete({
  _id: transactionId,
  userId: session.user.id,
});
```

```ts
// ❌ Wrong — another user could delete any transaction by guessing the ID
await Transaction.findByIdAndDelete(transactionId);
```

This means even if an attacker knows a valid `_id`, the query silently returns `null` if `userId` doesn't match — no data leaks, no error exposed.

---

## Security Rules

| Concern | Rule |
|---|---|
| Password storage | Always hash with `bcrypt.hash(password, 12)` — never store plaintext |
| Password comparison | Always use `bcrypt.compare()` — never compare directly |
| Session identity | Always read `userId` from `session.user.id` — never from the request |
| Error messages | Return generic messages on auth failure — never reveal whether email exists during login |
| Token contents | Only store `id`, `name`, `email` in JWT — nothing sensitive |
| `select: false` | `User.password` has `select: false` — always add `.select("+password")` explicitly when comparing |
| NEXTAUTH_SECRET | Must be set in `.env.local` — minimum 32 random bytes (`openssl rand -base64 32`) |
| Route protection | Every route is protected by default — public routes must be explicitly listed in middleware |
