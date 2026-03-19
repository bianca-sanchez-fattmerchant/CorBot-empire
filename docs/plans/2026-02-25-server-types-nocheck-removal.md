# Server `@ts-nocheck` Removal Implementation Plan

> **For Claude:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task.

**Goal:** Remove all `@ts-nocheck` directives from server modules and pass strict type checks without changing existing runtime behavior.

**Architecture:** Keep business logic intact and refactor only types and structure. For large modules, first extract shared type/context-binding utilities to reduce the compile error surface area, then remove `@ts-nocheck` file-by-file and repeat type checks immediately.

**Tech Stack:** TypeScript 5.9, Express 5, Node 22, SQLite runtime (`node:sqlite`), Vitest

---

### Task 1: Establish Typecheck Baseline

**Files:**
- Modify: `tasks/todo.md`

**Step 1: Run baseline typecheck**

Run: `pnpm exec tsc -p tsconfig.node.json --pretty false`
Expected: exit code `0`

**Step 2: Record current risk**

Run: `rg -n "^// @ts-nocheck" server/modules server/types`
Expected: identify `13` files

### Task 2: Remove `@ts-nocheck` from low-risk files first

**Files:**
- Modify: `server/modules/workflow.ts`
- Modify: `server/modules/routes.ts`
- Modify: `server/modules/lifecycle.ts`

**Step 1: Remove `@ts-nocheck`**

**Step 2: Run immediate typecheck**

Run: `pnpm exec tsc -p tsconfig.node.json --pretty false`
Expected: only newly exposed errors related to those files

**Step 3: Reach green with minimal edits**

- Add unresolved type imports
- Strengthen callback/utility parameter types
- Do not change runtime logic

### Task 3: Type hardening for submodules (Provider/Meeting/Coordination)

**Files:**
- Modify: `server/modules/workflow/agents/providers.ts`
- Modify: `server/modules/workflow/orchestration/meetings.ts`
- Modify: `server/modules/routes/collab/coordination.ts`

**Step 1: Explicitly define shared row/response types as local interfaces**
**Step 2: Explicitly define return types for `ctx` binding functions**
**Step 3: Repeat typecheck**

Run: `pnpm exec tsc -p tsconfig.node.json --pretty false`

### Task 4: Break down core orchestration files

**Files:**
- Modify: `server/modules/workflow/core.ts`
- Modify: `server/modules/workflow/agents.ts`
- Modify: `server/modules/workflow/orchestration.ts`
- Create: `server/modules/workflow/shared/*.ts` (if needed)

**Step 1: Split context-binding blocks**

- Extract repeated `const foo = __ctx.foo` patterns into helper functions/modules
- In logic functions, only copy-move is allowed

**Step 2: Explicitly define logic function signatures**

- Standardize identifier types such as `taskId`, `agentId`, `provider`
- Define minimal structural types for results of `db.prepare(...).get/all`

**Step 3: Typecheck**

Run: `pnpm exec tsc -p tsconfig.node.json --pretty false`

### Task 5: Break down route files and remove `@ts-nocheck`

**Files:**
- Modify: `server/modules/routes/collab.ts`
- Modify: `server/modules/routes/ops/messages.ts`
- Modify: `server/modules/routes/ops.ts`
- Modify: `server/modules/routes/core.ts`
- Create: `server/modules/routes/shared/*.ts` (if needed)

**Step 1: Extract message/auth/decision helpers**
**Step 2: Narrow Express handler body types (`unknown` -> guard)**
**Step 3: Repeat typecheck**

Run: `pnpm exec tsc -p tsconfig.node.json --pretty false`

### Task 6: Verification and result logging

**Files:**
- Modify: `tasks/todo.md`

**Step 1: Final typecheck**

Run: `pnpm exec tsc -p tsconfig.node.json --pretty false`
Expected: exit code `0`, `@ts-nocheck` count = `0`

**Step 2: Test**

Run: `pnpm run test:api`
Expected: pass (if environment-dependent failures occur, record cause and fallback verification)

**Step 3: Build**

Run: `pnpm run build`
Expected: pass (if environment-dependent failures occur, record cause and fallback verification)

**Step 4: Check deliverables**

Run: `rg -n "^// @ts-nocheck" server/modules server/types`
Expected: no match
