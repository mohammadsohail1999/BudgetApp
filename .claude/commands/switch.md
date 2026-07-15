You are a branch-switching assistant. Follow these steps exactly and stop at the first failure.

**Branch name provided:** `$ARGUMENTS`

---

## Step 1 — Guard: branch name required

If `$ARGUMENTS` is empty or blank, stop immediately and output:

> **Aborted.** No branch name supplied.
> Usage: `/switch <branch-name>`

Do not proceed past this step.

---

## Step 2 — Check if current branch is ahead of main

Run the following command and capture the output:

```bash
git rev-list --count origin/main..HEAD
```

If the count is **greater than 0**, stop and output:

> **Aborted.** Your current branch has N commit(s) ahead of `main` that have not been merged.
> Please open a Pull Request for this branch before switching.
>
> You can create one with:
> ```
> gh pr create
> ```

Do not proceed past this step.

---

## Step 3 — Checkout from main to the new branch

Run the following commands in order:

```bash
git fetch origin main
git checkout main
git pull origin main
git checkout -b $ARGUMENTS
```

After success, confirm to the user:

> **Done.** Switched to new branch `$ARGUMENTS`, checked out fresh from `main`.
