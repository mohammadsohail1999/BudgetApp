---
name: nextauth-credentials-authorize-location
description: next-auth CredentialsProvider stores the real authorize function in .options, not on the top-level object — critical for unit tests
metadata:
  type: feedback
---

next-auth v4's `CredentialsProvider` returns an object where `authorize` is always `() => null` (a stub). The real `authorize` function supplied by the app is stored inside the `options` property.

**Why:** This is how next-auth v4 (≥4.x) is implemented in `node_modules/next-auth/providers/credentials.js`. The returned shape is `{ id, name, type, credentials, authorize: () => null, options }` — the user-supplied config (including the real `authorize`) lives in `options`.

**How to apply:** When unit-testing `authOptions.providers[0].authorize`, always read from the `options` sub-object:

```typescript
type CredentialsProviderInternal = CredentialsConfig & {
  options: CredentialsConfig;
};
const credentialsProvider = authOptions.providers[0] as unknown as CredentialsProviderInternal;
const authorize = credentialsProvider.options.authorize!;
```

Reading `credentialsProvider.authorize` directly returns the always-null stub, causing all "valid credentials" tests to silently fail (the Zod schema never even runs).
