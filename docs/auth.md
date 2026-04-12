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
| `src/middleware.ts` | Edge middleware — protects all routes by default |
| `src/types/next-auth.d.ts` | Module augmentation — adds `id` to `session.user` |

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

## Middleware (`src/middleware.ts`)

All routes are protected by default. Public paths are excluded via the `matcher` pattern. NextAuth v4's `withAuth` helper handles the redirect automatically.

```ts
import { withAuth } from "next-auth/middleware";
import { NextResponse } from "next/server";

export default withAuth(
  function middleware(req) {
    const { pathname } = req.nextUrl;

    // Redirect authenticated users away from auth pages
    const authPages = ["/login", "/signup"];
    if (req.nextauth.token && authPages.some((p) => pathname.startsWith(p))) {
      return NextResponse.redirect(new URL("/", req.url));
    }

    return NextResponse.next();
  },
  {
    callbacks: {
      authorized({ token }) {
        return !!token;
      },
    },
    pages: {
      signIn: "/login",
    },
  }
);

export const config = {
  // Protect everything except static assets, NextAuth API, and public auth pages
  matcher: [
    "/((?!_next/static|_next/image|favicon.ico|api/auth|login|signup).*)",
  ],
};
```

**Rules:**
- `withAuth` automatically redirects unauthenticated requests to `pages.signIn`
- The `matcher` is the gate — any path not excluded is protected
- To make a new route public, add it to the `matcher` exclusion pattern
- Authenticated users hitting `/login` or `/signup` are redirected to `/`

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
