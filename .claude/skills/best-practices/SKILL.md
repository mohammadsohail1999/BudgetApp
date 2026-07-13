---
name: best-practices
description: Use when writing or reviewing any React/Next.js code in this budget-app project — performance, waterfalls, bundle size, re-renders, Server Component data fetching, or JavaScript micro-optimizations.
---

# React & Next.js Best Practices

> Adapted from [vercel-labs/agent-skills — React Best Practices](https://github.com/vercel-labs/agent-skills/blob/main/skills/react-best-practices/AGENTS.md) (v1.0.0, Vercel Engineering). Tailored for this project's stack: Next.js 16 App Router, React 19, MUI v6+, TypeScript strict, Mongoose/MongoDB Atlas.

---

## Table of Contents

1. [Eliminating Waterfalls](#1-eliminating-waterfalls) — **CRITICAL**
2. [Bundle Size Optimization](#2-bundle-size-optimization) — **CRITICAL**
3. [Server-Side Performance](#3-server-side-performance) — **HIGH**
4. [Client-Side Data Fetching](#4-client-side-data-fetching) — **MEDIUM-HIGH**
5. [Re-render Optimization](#5-re-render-optimization) — **MEDIUM**
6. [Rendering Performance](#6-rendering-performance) — **MEDIUM**
7. [JavaScript Performance](#7-javascript-performance) — **LOW-MEDIUM**
8. [Advanced Patterns](#8-advanced-patterns) — **LOW**

---

## 1. Eliminating Waterfalls

**Impact: CRITICAL** — Waterfalls are the #1 performance killer. Each sequential `await` adds full network latency.

### 1.1 Check Cheap Conditions Before Async Flags

When a branch uses `await` for a flag or remote value and also requires a cheap synchronous condition, evaluate the cheap condition first.

```ts
// ❌ Incorrect
const someFlag = await getFlag()
if (someFlag && someCondition) { /* ... */ }

// ✅ Correct
if (someCondition) {
  const someFlag = await getFlag()
  if (someFlag) { /* ... */ }
}
```

### 1.2 Defer Await Until Needed

Move `await` into the branches where it's actually used to avoid blocking code paths that don't need it.

```ts
// ❌ Incorrect — blocks both branches
async function handleRequest(userId: string, skipProcessing: boolean) {
  const userData = await fetchUserData(userId)
  if (skipProcessing) return { skipped: true }
  return processUserData(userData)
}

// ✅ Correct — only blocks when needed
async function handleRequest(userId: string, skipProcessing: boolean) {
  if (skipProcessing) return { skipped: true }
  const userData = await fetchUserData(userId)
  return processUserData(userData)
}
```

### 1.3 Prevent Waterfall Chains in API Routes

In Route Handlers and Server Actions, start independent operations immediately.

```ts
// ❌ Incorrect — config waits for auth, data waits for both
export async function GET(request: Request) {
  const session = await auth()
  const config = await fetchConfig()
  const data = await fetchData(session.user.id)
  return Response.json({ data, config })
}

// ✅ Correct — auth and config start immediately
export async function GET(request: Request) {
  const sessionPromise = auth()
  const configPromise = fetchConfig()
  const session = await sessionPromise
  const [config, data] = await Promise.all([
    configPromise,
    fetchData(session.user.id),
  ])
  return Response.json({ data, config })
}
```

### 1.4 Promise.all() for Independent Operations

When async operations have no interdependencies, execute them concurrently.

```ts
// ❌ Sequential — 3 round trips
const user = await fetchUser()
const posts = await fetchPosts()
const comments = await fetchComments()

// ✅ Parallel — 1 round trip
const [user, posts, comments] = await Promise.all([
  fetchUser(),
  fetchPosts(),
  fetchComments(),
])
```

**Budget App example — Route Handler fetching dashboard data:**

```ts
// ✅ Correct
export async function GET() {
  const session = await getServerSession(authOptions)
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 })

  await connectDB()
  const userId = session.user.id

  const [categories, transactions, budgets] = await Promise.all([
    Category.find({ userId }).lean(),
    Transaction.find({ userId }).sort({ date: -1 }).lean(),
    MonthlyBudget.find({ userId }).lean(),
  ])

  return NextResponse.json({ categories, transactions, budgets })
}
```

### 1.5 Strategic Suspense Boundaries

Use Suspense boundaries to show wrapper UI faster while data loads, instead of blocking the entire page.

```tsx
// ❌ Incorrect — entire page blocked by data
async function Page() {
  const data = await fetchData()
  return (
    <div>
      <Sidebar />
      <DataDisplay data={data} />
      <Footer />
    </div>
  )
}

// ✅ Correct — shell renders immediately
function Page() {
  return (
    <div>
      <Sidebar />
      <Suspense fallback={<Skeleton />}>
        <DataDisplay />
      </Suspense>
      <Footer />
    </div>
  )
}

async function DataDisplay() {
  const data = await fetchData()
  return <div>{data.content}</div>
}
```

**When NOT to use:** SEO-critical content above the fold, critical layout data, small fast queries.

### 1.6 Parallel Nested Data Fetching

Chain dependent fetches within each item's promise so a slow item doesn't block the rest.

```ts
// ❌ Incorrect — one slow chat blocks all author fetches
const chats = await Promise.all(chatIds.map(id => getChat(id)))
const authors = await Promise.all(chats.map(chat => getUser(chat.author)))

// ✅ Correct — each item chains independently
const authors = await Promise.all(
  chatIds.map(id => getChat(id).then(chat => getUser(chat.author)))
)
```

---

## 2. Bundle Size Optimization

**Impact: CRITICAL** — Reducing initial bundle size improves Time to Interactive and Largest Contentful Paint.

### 2.1 Avoid Barrel File Imports

Import directly from source files instead of barrel files to avoid loading thousands of unused modules.

```tsx
// ❌ Incorrect — loads 2,225 modules
import { Button, TextField } from "@mui/material"

// ✅ Correct — direct imports (non-Next.js barrel optimization)
import Button from "@mui/material/Button"
import TextField from "@mui/material/TextField"
```

> **Next.js 13.5+** automatically transforms barrel imports via `optimizePackageImports`. For libraries in the default list (`@mui/material` is included), standard imports are fine. For unlisted libraries, add them to `next.config.ts` under `experimental.optimizePackageImports`.

**Libraries commonly affected:** `@mui/material`, `@mui/icons-material`, `lucide-react`, `lodash`, `date-fns`, `rxjs`.

### 2.2 Dynamic Imports for Heavy Components

Use `next/dynamic` to lazy-load large components not needed on initial render.

```tsx
// ❌ Incorrect — chart library bundles with main chunk
import { BarChart } from "@mui/x-charts/BarChart"

// ✅ Correct — loads on demand
import dynamic from "next/dynamic"

const BarChart = dynamic(
  () => import("@mui/x-charts/BarChart").then(m => m.BarChart),
  { ssr: false }
)
```

### 2.3 Defer Non-Critical Third-Party Libraries

Analytics, logging, and error tracking don't block user interaction. Load them after hydration.

```tsx
import dynamic from "next/dynamic"

const Analytics = dynamic(
  () => import("@vercel/analytics/react").then(m => m.Analytics),
  { ssr: false }
)
```

### 2.4 Preload Based on User Intent

Preload heavy bundles before they're needed using hover/focus events.

```tsx
function EditorButton({ onClick }: { onClick: () => void }) {
  const preload = () => {
    if (typeof window !== "undefined") {
      void import("./heavy-component")
    }
  }

  return (
    <button onMouseEnter={preload} onFocus={preload} onClick={onClick}>
      Open Editor
    </button>
  )
}
```

### 2.5 Prefer Statically Analyzable Paths

Build tools work best when import paths are obvious at build time.

```ts
// ❌ Incorrect — bundler can't statically analyze
const Page = await import(PAGE_MODULES[pageName])

// ✅ Correct — explicit map of allowed modules
const PAGE_MODULES = {
  home: () => import("./pages/home"),
  settings: () => import("./pages/settings"),
} as const

const Page = await PAGE_MODULES[pageName]()
```

---

## 3. Server-Side Performance

**Impact: HIGH** — Optimizing server-side rendering and data fetching eliminates waterfalls and reduces response times.

### 3.1 Authenticate Server Actions Like API Routes

Server Actions (`"use server"`) are exposed as public endpoints. Always verify auth inside each action.

```ts
"use server"

import { getServerSession } from "next-auth"
import { authOptions } from "@/lib/auth"

export async function deleteTransaction(transactionId: string) {
  const session = await getServerSession(authOptions)
  if (!session) throw new Error("Unauthorized")

  await connectDB()

  // Verify ownership before deleting
  const txn = await Transaction.findOne({ _id: transactionId, userId: session.user.id })
  if (!txn) throw new Error("Not found")

  await txn.deleteOne()
  return { success: true }
}
```

### 3.2 Avoid Shared Module State for Request Data

Server renders can run concurrently. Never store request-scoped data in module-level variables.

```tsx
// ❌ Incorrect — request data leaks across concurrent renders
let currentUser: User | null = null

export default async function Page() {
  currentUser = await auth()
  return <Dashboard />
}

// ✅ Correct — keep request data local to the render tree
export default async function Page() {
  const user = await auth()
  return <Dashboard user={user} />
}
```

**Safe exceptions:** Immutable static config, the `connectDB()` singleton, process-wide caches keyed correctly.

### 3.3 Minimize Serialization at RSC Boundaries

Only pass fields the client actually uses across the Server/Client boundary.

```tsx
// ❌ Incorrect — serializes all 50 fields
async function Page() {
  const user = await fetchUser() // 50 fields
  return <Profile user={user} />
}

// ✅ Correct — serializes only what's needed
async function Page() {
  const user = await fetchUser()
  return <Profile name={user.name} avatar={user.avatar} />
}
```

### 3.4 Parallel Data Fetching with Component Composition

React Server Components execute sequentially within a tree. Restructure with composition to parallelize.

```tsx
// ❌ Incorrect — Sidebar waits for Header's fetch
export default async function Page() {
  const header = await fetchHeader()
  return (
    <div>
      <div>{header}</div>
      <Sidebar />
    </div>
  )
}

// ✅ Correct — both fetch simultaneously
export default function Page() {
  return (
    <div>
      <Header />
      <Sidebar />
    </div>
  )
}

async function Header() {
  const data = await fetchHeader()
  return <div>{data}</div>
}

async function Sidebar() {
  const items = await fetchSidebarItems()
  return <nav>{items.map(renderItem)}</nav>
}
```

### 3.5 Per-Request Deduplication with React.cache()

Use `React.cache()` for server-side request deduplication. Authentication and database queries benefit most.

```ts
import { cache } from "react"
import { getServerSession } from "next-auth"
import { authOptions } from "@/lib/auth"

export const getCurrentUser = cache(async () => {
  const session = await getServerSession(authOptions)
  if (!session?.user?.id) return null
  return session.user
})
```

> `React.cache()` uses shallow equality (`Object.is`). Avoid inline objects as arguments — they create new references and miss the cache.

### 3.6 Use after() for Non-Blocking Operations

Use Next.js's `after()` to schedule work after the response is sent.

```ts
import { after } from "next/server"

export async function POST(request: Request) {
  await updateDatabase(request)

  after(async () => {
    // Logging happens after response is sent
    await logUserAction({ userAgent: request.headers.get("user-agent") ?? "unknown" })
  })

  return Response.json({ status: "success" })
}
```

### 3.7 Hoist Static I/O to Module Level

Module-level code runs once when imported, not on every request.

```ts
// ❌ Incorrect — reads config on every request
export async function GET() {
  const config = JSON.parse(await fs.readFile("./config.json", "utf-8"))
  return Response.json(config)
}

// ✅ Correct — reads once at module initialization
const configPromise = fs.readFile("./config.json", "utf-8").then(JSON.parse)

export async function GET() {
  const config = await configPromise
  return Response.json(config)
}
```

### 3.8 Avoid Duplicate Serialization in RSC Props

RSC serialization deduplicates by object reference, not value. Do transformations (`.toSorted()`, `.filter()`, `.map()`) on the client, not the server.

```tsx
// ❌ Incorrect — duplicates the array
<ClientList usernames={usernames} sorted={usernames.toSorted()} />

// ✅ Correct — transform on client
<ClientList usernames={usernames} />

// Client component:
const sorted = useMemo(() => [...usernames].sort(), [usernames])
```

---

## 4. Client-Side Data Fetching

**Impact: MEDIUM-HIGH** — Efficient fetching patterns reduce redundant network requests.

### 4.1 Use Passive Event Listeners for Scrolling

Add `{ passive: true }` to touch and wheel listeners to enable immediate scrolling.

```ts
useEffect(() => {
  const handler = (e: WheelEvent) => console.log(e.deltaY)
  document.addEventListener("wheel", handler, { passive: true })
  return () => document.removeEventListener("wheel", handler)
}, [])
```

**Use passive when:** tracking, logging, any listener that doesn't call `preventDefault()`.

### 4.2 Version and Minimize localStorage Data

Add version prefix to keys and store only needed fields.

```ts
const VERSION = "v1"

function saveTheme(theme: string) {
  try {
    localStorage.setItem(`budget-theme:${VERSION}`, theme)
  } catch {
    // Throws in incognito/private browsing, quota exceeded
  }
}

function loadTheme(): string | null {
  try {
    return localStorage.getItem(`budget-theme:${VERSION}`)
  } catch {
    return null
  }
}
```

Always wrap in try-catch. Never store tokens, PII, or internal flags.

---

## 5. Re-render Optimization

**Impact: MEDIUM** — Reducing unnecessary re-renders minimizes wasted computation.

### 5.1 Calculate Derived State During Rendering

If a value can be computed from current props/state, do not store it in state or update it in an effect.

```tsx
// ❌ Incorrect — redundant state + effect
const [fullName, setFullName] = useState("")
useEffect(() => setFullName(first + " " + last), [first, last])

// ✅ Correct — derive during render
const fullName = first + " " + last
```

### 5.2 Don't Define Components Inside Components

Creates a new component type on every render, destroying state and DOM.

```tsx
// ❌ Incorrect — remounts on every render
function UserProfile({ user }) {
  const Avatar = () => <img src={user.avatarUrl} />
  return <Avatar />
}

// ✅ Correct — stable component, pass props
function Avatar({ src }: { src: string }) {
  return <img src={src} />
}

function UserProfile({ user }) {
  return <Avatar src={user.avatarUrl} />
}
```

**Symptoms:** Input fields lose focus on keystroke, animations restart, effects re-run on every parent render.

### 5.3 Use Functional setState Updates

Prevents stale closures and unnecessary callback recreations.

```tsx
// ❌ Incorrect — stale closure risk
const addItem = useCallback((item: Item) => {
  setItems([...items, item])
}, [items]) // Recreated on every items change

// ✅ Correct — stable callback, no stale closures
const addItem = useCallback((item: Item) => {
  setItems(curr => [...curr, item])
}, []) // Never recreated
```

### 5.4 Use Lazy State Initialization

Pass a function to `useState` for expensive initial values.

```tsx
// ❌ Incorrect — JSON.parse runs on every render
const [settings, setSettings] = useState(
  JSON.parse(localStorage.getItem("settings") || "{}")
)

// ✅ Correct — runs only once
const [settings, setSettings] = useState(() => {
  const stored = localStorage.getItem("settings")
  return stored ? JSON.parse(stored) : {}
})
```

### 5.5 Put Interaction Logic in Event Handlers

If a side effect is triggered by a user action, run it in the handler — not in an effect.

```tsx
// ❌ Incorrect — models action as state + effect
const [submitted, setSubmitted] = useState(false)
useEffect(() => {
  if (submitted) post("/api/register")
}, [submitted])

// ✅ Correct — do it in the handler
function handleSubmit() {
  post("/api/register")
}
```

### 5.6 Split Combined Hook Computations

When a hook contains independent tasks with different dependencies, split them.

```tsx
// ❌ Incorrect — changing sortOrder recomputes filtering
const sorted = useMemo(() => {
  const filtered = products.filter(p => p.category === category)
  return filtered.toSorted((a, b) => a.price - b.price)
}, [products, category, sortOrder])

// ✅ Correct — filtering only recomputes when needed
const filtered = useMemo(
  () => products.filter(p => p.category === category),
  [products, category]
)
const sorted = useMemo(
  () => filtered.toSorted((a, b) => sortOrder === "asc" ? a.price - b.price : b.price - a.price),
  [filtered, sortOrder]
)
```

### 5.7 Narrow Effect Dependencies

Specify primitive dependencies instead of objects.

```tsx
// ❌ Re-runs on any user field change
useEffect(() => { console.log(user.id) }, [user])

// ✅ Re-runs only when id changes
useEffect(() => { console.log(user.id) }, [user.id])
```

### 5.8 Use Transitions for Non-Urgent Updates

```tsx
import { startTransition } from "react"

const handler = () => {
  startTransition(() => setScrollY(window.scrollY))
}
```

### 5.9 Use useDeferredValue for Expensive Derived Renders

```tsx
const [query, setQuery] = useState("")
const deferredQuery = useDeferredValue(query)
const filtered = useMemo(
  () => items.filter(item => fuzzyMatch(item, deferredQuery)),
  [items, deferredQuery]
)
const isStale = query !== deferredQuery
```

### 5.10 Use useRef for Transient Values

When a value changes frequently and you don't need a re-render on every update, store it in `useRef`.

### 5.11 Don't Wrap Simple Primitive Expressions in useMemo

```tsx
// ❌ Unnecessary
const isLoading = useMemo(() => user.isLoading || notifs.isLoading, [user.isLoading, notifs.isLoading])

// ✅ Just compute it
const isLoading = user.isLoading || notifs.isLoading
```

### 5.12 Extract Default Non-Primitive Values from Memoized Components

```tsx
// ❌ Broken memoization — new function ref each render
const UserAvatar = memo(({ onClick = () => {} }) => { /* ... */ })

// ✅ Stable default
const NOOP = () => {}
const UserAvatar = memo(({ onClick = NOOP }) => { /* ... */ })
```

---

## 6. Rendering Performance

**Impact: MEDIUM** — Optimizing the rendering process reduces browser work.

### 6.1 CSS content-visibility for Long Lists

```css
.transaction-item {
  content-visibility: auto;
  contain-intrinsic-size: 0 72px;
}
```

For 1000 transactions, the browser skips layout/paint for ~990 off-screen items.

### 6.2 Prevent Hydration Mismatch Without Flickering

For client-dependent content (theme from localStorage), inject a synchronous script before hydration.

```tsx
function ThemeWrapper({ children }: { children: ReactNode }) {
  return (
    <>
      <div id="theme-wrapper">{children}</div>
      <script
        dangerouslySetInnerHTML={{
          __html: `(function(){try{var t=localStorage.getItem('theme')||'light';var e=document.getElementById('theme-wrapper');if(e)e.className=t}catch(e){}})()`,
        }}
      />
    </>
  )
}
```

### 6.3 Suppress Expected Hydration Mismatches

For intentionally different server/client values (dates, random IDs):

```tsx
<span suppressHydrationWarning>{new Date().toLocaleString()}</span>
```

Do not use this to hide real bugs.

### 6.4 Use Activity Component for Show/Hide

```tsx
import { Activity } from "react"

function Dropdown({ isOpen }: { isOpen: boolean }) {
  return (
    <Activity mode={isOpen ? "visible" : "hidden"}>
      <ExpensiveMenu />
    </Activity>
  )
}
```

### 6.5 Use Explicit Conditional Rendering

```tsx
// ❌ Renders "0" when count is 0
{count && <Badge count={count} />}

// ✅ Correct
{count > 0 ? <Badge count={count} /> : null}
```

### 6.6 Use React DOM Resource Hints

```tsx
import { preconnect, prefetchDNS } from "react-dom"

export default function RootLayout({ children }: { children: ReactNode }) {
  prefetchDNS("https://fonts.googleapis.com")
  preconnect("https://fonts.gstatic.com")
  return <html><body>{children}</body></html>
}
```

### 6.7 Use useTransition Over Manual Loading States

```tsx
const [isPending, startTransition] = useTransition()

const handleSearch = (value: string) => {
  setQuery(value)
  startTransition(async () => {
    const data = await fetchResults(value)
    setResults(data)
  })
}
```

### 6.8 Use next/script Instead of Raw Script Tags

```tsx
import Script from "next/script"

<Script src="https://example.com/analytics.js" strategy="afterInteractive" />
```

---

## 7. JavaScript Performance

**Impact: LOW-MEDIUM** — Micro-optimizations for hot paths.

### 7.1 Avoid Layout Thrashing

Don't interleave style writes with layout reads. Batch writes, then read.

```ts
// ❌ Forces two reflows
element.style.width = "100px"
const w = element.offsetWidth
element.style.height = "200px"
const h = element.offsetHeight

// ✅ Batch writes, read once
element.style.width = "100px"
element.style.height = "200px"
const { width, height } = element.getBoundingClientRect()
```

Prefer CSS classes and MUI's `sx` prop over inline style manipulation.

### 7.2 Build Index Maps for Repeated Lookups

```ts
// ❌ O(n) per lookup
users.find(u => u.id === order.userId)

// ✅ O(1) per lookup
const userById = new Map(users.map(u => [u.id, u]))
userById.get(order.userId)
```

### 7.3 Use Set/Map for O(1) Lookups

```ts
// ❌ O(n)
const allowed = ["a", "b", "c"]
items.filter(item => allowed.includes(item.id))

// ✅ O(1)
const allowed = new Set(["a", "b", "c"])
items.filter(item => allowed.has(item.id))
```

### 7.4 Use toSorted() Instead of sort()

`.sort()` mutates in place — breaks React's immutability model.

```ts
// ❌ Mutates props
const sorted = users.sort((a, b) => a.name.localeCompare(b.name))

// ✅ Immutable
const sorted = users.toSorted((a, b) => a.name.localeCompare(b.name))
```

Also prefer `.toReversed()`, `.toSpliced()`, `.with()` over their mutating counterparts.

### 7.5 Early Return from Functions

```ts
// ❌ Processes all items after finding error
function validate(users: User[]) {
  let error = ""
  for (const u of users) {
    if (!u.email) error = "Email required"
  }
  return error ? { valid: false, error } : { valid: true }
}

// ✅ Returns immediately
function validate(users: User[]) {
  for (const u of users) {
    if (!u.email) return { valid: false, error: "Email required" }
  }
  return { valid: true }
}
```

### 7.6 Combine Multiple Array Iterations

```ts
// ❌ 3 iterations
const admins = users.filter(u => u.isAdmin)
const inactive = users.filter(u => !u.isActive)

// ✅ 1 iteration
const admins: User[] = []
const inactive: User[] = []
for (const u of users) {
  if (u.isAdmin) admins.push(u)
  if (!u.isActive) inactive.push(u)
}
```

### 7.7 Use flatMap to Map and Filter in One Pass

```ts
// ❌ 2 iterations + intermediate array
const names = users.map(u => u.isActive ? u.name : null).filter(Boolean)

// ✅ 1 pass
const names = users.flatMap(u => u.isActive ? [u.name] : [])
```

### 7.8 Hoist RegExp Creation

```tsx
// ❌ New RegExp every render
const regex = new RegExp(`(${query})`, "gi")

// ✅ Memoize
const regex = useMemo(() => new RegExp(`(${escapeRegex(query)})`, "gi"), [query])
```

### 7.9 Defer Non-Critical Work with requestIdleCallback

```ts
requestIdleCallback(() => {
  analytics.track("search", { query })
})
```

Use for analytics, saving to localStorage/IndexedDB, prefetching. Do NOT use for user-facing feedback.

---

## 8. Advanced Patterns

**Impact: LOW** — For specific cases requiring careful implementation.

### 8.1 Initialize App Once, Not Per Mount

Components can remount (dev mode, Strict Mode). Use a module-level guard.

```tsx
let didInit = false

function App() {
  useEffect(() => {
    if (didInit) return
    didInit = true
    loadFromStorage()
    checkAuthToken()
  }, [])
}
```

### 8.2 useEffectEvent for Stable Callback Refs

Access latest values in callbacks without adding them to dependency arrays.

```tsx
import { useEffectEvent } from "react"

function SearchInput({ onSearch }: { onSearch: (q: string) => void }) {
  const [query, setQuery] = useState("")
  const onSearchEvent = useEffectEvent(onSearch)

  useEffect(() => {
    const timeout = setTimeout(() => onSearchEvent(query), 300)
    return () => clearTimeout(timeout)
  }, [query])
}
```

### 8.3 Do Not Put Effect Events in Dependency Arrays

`useEffectEvent` return values intentionally change identity every render. Never include them in `useEffect` dependencies.

---

## Project-Specific Conventions

These rules extend the general best practices above with patterns specific to this codebase.

### Mongoose Queries in Route Handlers

Always parallelize independent queries and use `.lean()` for read-only access:

```ts
export async function GET() {
  const session = await getServerSession(authOptions)
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 })

  await connectDB()
  const uid = session.user.id

  const [categories, recentTxns] = await Promise.all([
    Category.find({ userId: uid }).lean(),
    Transaction.find({ userId: uid }).sort({ date: -1 }).limit(20).lean(),
  ])

  return NextResponse.json({ categories, transactions: recentTxns })
}
```

### Server Components — Fetch Data, Pass Minimal Props

```tsx
// Server Component — no "use client"
export default async function DashboardPage() {
  const session = await getServerSession(authOptions)
  if (!session) redirect("/login")

  await connectDB()
  const transactions = await Transaction.find({ userId: session.user.id })
    .sort({ date: -1 })
    .limit(50)
    .lean()

  // Pass only serializable, minimal data to client
  const serialized = transactions.map(t => ({
    id: String(t._id),
    amount: t.amount,
    type: t.type,
    date: t.date.toISOString(),
    description: t.description,
  }))

  return <TransactionList transactions={serialized} />
}
```

### MUI Dynamic Imports

Heavy MUI components (DataGrid, Charts) should be dynamically imported:

```tsx
import dynamic from "next/dynamic"

const DataGrid = dynamic(
  () => import("@mui/x-data-grid").then(m => m.DataGrid),
  { ssr: false }
)

const BarChart = dynamic(
  () => import("@mui/x-charts/BarChart").then(m => m.BarChart),
  { ssr: false }
)
```

---

## References

1. [React docs](https://react.dev)
2. [Next.js docs](https://nextjs.org)
3. [Vercel — How we optimized package imports in Next.js](https://vercel.com/blog/how-we-optimized-package-imports-in-next-js)
4. [Vercel — How we made the dashboard twice as fast](https://vercel.com/blog/how-we-made-the-vercel-dashboard-twice-as-fast)
5. [Source: vercel-labs/agent-skills](https://github.com/vercel-labs/agent-skills/blob/main/skills/react-best-practices/AGENTS.md)
