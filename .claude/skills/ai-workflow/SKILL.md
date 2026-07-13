---
name: ai-workflow
description: Use for every non-trivial coding task in this budget-app project. Defines the mandatory plan-first, approve-before-code workflow — restate the request, propose a structured technical plan, wait for explicit approval, then implement.
---

# AI-Assisted Development Workflow

## Purpose

This skill defines the mandatory workflow for all AI-assisted development in this project. The goal is to ensure every change is deliberate, reviewed, and aligned with the project's architecture before any code is generated.

---

## Core Principle

> **Plan first, code second.** The AI must never generate implementation code without an explicitly approved plan.

---

## Workflow Phases

### Phase 1 — Understand the Request

Before doing anything, the AI must:

1. Read the user's request and restate it in its own words to confirm understanding.
2. Identify which project skills are relevant (UI, routing, auth, security, errors-and-validation, best-practices, etc.) and load them.
3. Ask clarifying questions if the request is ambiguous — do not assume.

**Exit criteria:** The user confirms the AI's understanding is correct.

---

### Phase 2 — Propose a Technical Plan

The AI must present a structured plan covering:

| Section | Contents |
|---|---|
| **Goal** | One-sentence summary of what the change achieves |
| **Architecture** | Which layers are affected (UI, API, DB, auth, etc.) and how they interact |
| **Files to create / modify** | Full list of file paths with a one-line description of the change in each |
| **Data flow** | How data moves through the system for this feature (request → validation → DB → response → UI) |
| **Schema changes** | Any new or modified Mongoose models, indexes, or types |
| **Dependencies** | New packages to install, if any (with justification) |
| **Security considerations** | Input validation, auth checks, data isolation — anything OWASP-relevant |
| **Open questions** | Anything the AI is unsure about or where multiple approaches exist |

**Format:** Use markdown. Keep it scannable — tables and bullet points, not prose paragraphs.

**Exit criteria:** The plan is posted in the chat. The AI **stops and waits**.

---

### Phase 3 — Wait for Explicit Approval

The AI must **not** write any implementation code until the user responds with an explicit approval. Valid approvals include:

- "approved", "go ahead", "lgtm", "do it", "ship it", "yes", "looks good"

If the user requests changes to the plan:

1. Revise only the affected sections.
2. Re-post the updated plan (or a clear diff of what changed).
3. Wait for approval again.

**The AI must never interpret silence, partial acknowledgment, or follow-up questions as approval.**

---

### Phase 4 — Implement

Once approved, the AI implements the plan:

1. Follow the approved plan exactly. Do not add unrequested features, refactors, or "improvements."
2. Implement in the order specified in the plan, or if no order was specified, follow dependency order (models → lib → API → UI).
3. After each file is created or edited, briefly state what was done (one line, no lengthy explanations).
4. Run `npm run build` (or `npm run lint` for smaller changes) after non-trivial changes and fix all errors before declaring done.

---

### Phase 5 — Summary & Verification

After implementation is complete, the AI must:

1. Provide a short summary listing every file created or modified.
2. Report the build/lint result (pass or fail + fix).
3. Flag any deviations from the approved plan (and explain why).
4. Suggest any follow-up work or skill updates if the change introduced a new pattern.

---

## Exceptions

The following may skip the full plan cycle:

- **One-line fixes** — typos, import corrections, lint fixes.
- **Direct commands** — "add X import to Y file", "rename Z to W".
- **Exploratory reads** — searching the codebase, reading files, listing directories.

Even for exceptions, the AI must never make destructive or hard-to-reverse changes without confirmation.

---

## Plan Amendments Mid-Implementation

If the AI discovers during implementation that the plan needs to change (e.g., an unexpected API difference, a missing dependency):

1. **Stop coding immediately.**
2. Describe the issue and propose the amendment.
3. Wait for approval before continuing.

---

## Rules for the AI

- Never generate code in the same message as the plan. Plan and code live in separate turns.
- Never say "I'll also add…" and sneak in unrequested work. If something extra is needed, propose it.
- If the user says "just do it" without a prior plan, produce the plan first anyway — then ask for approval.
- Keep plans proportional to the task. A single API route needs a short plan, not a 50-line document.
- Reference specific file paths, function names, and types from the codebase — never hand-wave.
