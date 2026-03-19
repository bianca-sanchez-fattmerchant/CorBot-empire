# Workflow Pack MVP Implementation Plan

**Goal:** While preserving a development-workflow-centric structure, support `novel/report/video pre-production/web research + report/roleplay` demand on the same orchestration engine.

**Architecture:** Keep the existing `task + meeting + messenger` pipeline as a shared engine, and separate domain-specific differences via `Workflow Pack` configuration (input schema/prompt/QA/output).

**Tech Stack:** TypeScript 5.9, Express 5, React 19, SQLite (`node:sqlite`), existing settings + task orchestration routes

---

## 1. Product Scope (MVP)

### In Scope

- Execution mode branching based on `workflow_pack_key`
- Session-level default pack assignment (messenger settings)
- Auto-routing + confirmation questions on low confidence
- Pack-specific required input collection (Q&A form/conversation)
- Pack-specific output templates + QA gate

### Out of Scope (Post-MVP)

- Video file rendering (actual T2V engine invocation)
- Multi-step payments/pricing billing
- External translation management SaaS integration

### Success Metrics

- Pack auto-classification accuracy >= 85%
- First-response failure rate per pack <= 5%
- Re-request rate (re-entering same intent) reduced by at least 20%
- Completion report delivery rate (messenger/web) >= 98%

---

## 2. Workflow Pack Model

```ts
type WorkflowPackKey = "development" | "novel" | "report" | "video_preprod" | "web_research_report" | "roleplay";
```

Common fields (configuration storage):

- `key`: Pack identifier
- `name`: Display name
- `enabled`: Availability flag
- `input_schema_json`: Required input field definition
- `prompt_preset_json`: System/role prompts
- `qa_rules_json`: QA rules
- `output_template_json`: Output format
- `routing_keywords_json`: Routing hints
- `cost_profile_json`: Model/token/round limits

Priority order (pack resolution at runtime):

1. User explicit switch (`/mode report`, UI toggle)
2. Session default pack (`messengerChannels.*.sessions[].workflowPackKey`)
3. Project default pack (`projects.default_pack_key`)
4. Auto-router inference
5. Global default `development`

---

## 3. Data Model / Migration Plan

Extend while preserving the existing structure as much as possible:

### 3.1 New table

```sql
CREATE TABLE IF NOT EXISTS workflow_packs (
  key TEXT PRIMARY KEY,
  name TEXT NOT NULL,
  enabled INTEGER NOT NULL DEFAULT 1,
  input_schema_json TEXT NOT NULL,
  prompt_preset_json TEXT NOT NULL,
  qa_rules_json TEXT NOT NULL,
  output_template_json TEXT NOT NULL,
  routing_keywords_json TEXT NOT NULL,
  cost_profile_json TEXT NOT NULL,
  created_at INTEGER DEFAULT (unixepoch()*1000),
  updated_at INTEGER DEFAULT (unixepoch()*1000)
);
```

### 3.2 Existing table extensions

```sql
ALTER TABLE projects ADD COLUMN default_pack_key TEXT NOT NULL DEFAULT 'development';
ALTER TABLE tasks ADD COLUMN workflow_pack_key TEXT NOT NULL DEFAULT 'development';
ALTER TABLE tasks ADD COLUMN workflow_meta_json TEXT;
ALTER TABLE tasks ADD COLUMN output_format TEXT;
```

### 3.3 Settings schema extension

- key: `messengerChannels` (keep existing)
- Add optional fields in session objects:
  - `workflowPackKey?: WorkflowPackKey`
  - `workflowPackOverrides?: Record<string, unknown>`

---

## 4. API Design (MVP)

### 4.1 Pack catalog

- `GET /api/workflow-packs`
  - Returns all packs + enabled/config summary
- `PUT /api/workflow-packs/:key`
  - Updates pack configuration/activation status

### 4.2 Routing preview

- `POST /api/workflow/route`
  - Input: `text`, `sessionKey?`, `projectId?`
  - Output: `packKey`, `confidence`, `reason`, `requiresConfirmation`

### 4.3 Session binding

- `PATCH /api/messenger/sessions/:sessionId`
  - Input: `workflowPackKey`
  - Effect: stores session default pack

### 4.4 Task execution binding

- Add fields to existing task/directive creation:
  - `workflow_pack_key`
  - `workflow_meta_json`
  - `output_format`

---

## 5. Pack-by-Pack MVP Definition

### development

- Purpose: Keep existing development-company workflow
- Required input: project/path/instruction
- Output: task result + report + decision
- QA: Reuse existing test/review gates

### report

- Purpose: Structured document generation
- Required input: purpose, audience, length, tone, format
- Output: `summary -> body -> action items`
- QA: auto-regenerate when sections are missing

### web_research_report

- Purpose: Evidence-based report via web research
- Required input: topic, period, reliability criteria, language
- Output: Report with source links
- QA: block assertive statements without sources

### novel

- Purpose: Novel/scenario writing
- Required input: genre, POV, mood, length, characters
- Output: synopsis + body
- QA: character consistency/tone drift checks

### video_preprod

- Purpose: Video production pre-planning
- Required input: platform, target length, target audience, style
- Output: concept -> script -> shot list -> editing guide
- QA: fail if shot list is missing

### roleplay

- Purpose: Simple conversational roleplay
- Required input: character card, prohibited rules, tone
- Output: multi-turn dialogue
- QA: safety-rule and character-collapse prevention

---

## 6. Backend Implementation Tasks

### BE-1. Schema + seed

- Targets:
  - `server/modules/bootstrap/schema/base-schema.ts`
  - `server/modules/bootstrap/schema/*migrations*.ts`
  - new `server/modules/bootstrap/schema/workflow-pack-seeds.ts`
- Done criteria:
  - Migration succeeds on both new/existing DBs
  - Seed 6 default rows in `workflow_packs`

### BE-2. Runtime pack resolver

- Targets:
  - new `server/modules/workflow/packs/resolver.ts`
  - new `server/modules/workflow/packs/router.ts`
  - `server/modules/routes/collab/direct-chat.ts`
- Done criteria:
  - Routing priorities 1-5 work
  - Return confirmation question on low confidence

### BE-3. Task binding + execution hooks

- Targets:
  - `server/modules/routes/ops/messages/directives-inbox-routes.ts`
  - `server/modules/routes/core/tasks/*`
  - `server/modules/workflow/orchestration.ts`
- Done criteria:
  - Save `workflow_pack_key` in task rows
  - Apply pack preset to execution prompts

### BE-4. Pack QA gate

- Targets:
  - new `server/modules/workflow/packs/qa-gates.ts`
  - `server/modules/workflow/orchestration/report-workflow-tools.ts`
- Done criteria:
  - Support one retry loop for pack-level QA failure/regeneration

### BE-5. Settings/session extension

- Targets:
  - `server/modules/routes/ops/settings-stats.ts`
  - `server/messenger/session-agent-routing.ts`
  - `server/gateway/client.ts`
- Done criteria:
  - Save/read/default handling for session `workflowPackKey`

---

## 7. Frontend Implementation Tasks

### FE-1. Type extension

- Targets:
  - `src/types/index.ts`
  - `src/api/*` (settings/task payload)
- Done criteria:
  - Reflect `WorkflowPackKey` type and session `workflowPackKey`

### FE-2. Settings UI (pack management)

- Targets:
  - new `src/components/settings/WorkflowPacksTab.tsx`
  - `src/components/settings/SettingsTabNav.tsx`
- Done criteria:
  - Display pack enable/disable + summary

### FE-3. Messenger session UI binding

- Targets:
  - `src/components/settings/GatewaySettingsTab.tsx`
- Done criteria:
  - Select default pack per session
  - Support pack selection in new-chat modal

### FE-4. Chat mode UX

- Targets:
  - `src/components/ChatPanel.tsx`
  - `src/components/chat-panel/*`
- Done criteria:
  - Display current mode badge
  - Instant switch via `/mode` or dropdown

### FE-5. i18n text cleanup

- Targets:
  - new `src/i18n/workflow-pack.ts` (or extend existing `t({ko,en,ja,zh})`)
- Done criteria:
  - Support all new UI text in 4 languages

---

## 8. QA / Verification Tasks

### QA-1. Unit

- Server:
  - `server/modules/workflow/packs/*.test.ts`
  - extend `server/modules/routes/collab/direct-chat.normalize.test.ts`
- Frontend:
  - `src/components/settings/*workflow*.test.tsx`

### QA-2. Integration

- Scenarios:
  - General chat in a session with default pack `roleplay`
  - In same session, switch with `/mode report` and create report task
  - In `web_research_report`, regenerate on missing citations

### QA-3. Regression

- Verify no impact to existing `$` directive flow and review decision inbox
- Verify messenger channel-separated routing remains intact

### QA-4. Exit Criteria

- `pnpm run test` passes
- `pnpm run test:e2e` passes
- All 6 manual scenario checklist items pass

---

## 9. Delivery Phasing

### Phase 1 (Foundation)

- BE-1, BE-2, FE-1, FE-3, part of QA-1
- Outcome: pack select/save/default routing available

### Phase 2 (High-demand packs first)

- `report`, `web_research_report`, `roleplay`
- Outcome: prioritize highest user-perceived value

### Phase 3 (Creative packs)

- `novel`, `video_preprod`
- Outcome: support creative demand

### Phase 4 (Hardening)

- Cost cap, routing accuracy, analytics dashboard

---

## 10. Risks and Guardrails

- Risk: Prompt complexity increases as pack branching grows
  - Mitigation: Minimize per-pack presets + reuse common templates
- Risk: Hallucinations/missing sources in web-research pack
  - Mitigation: enforce citation gate
- Risk: `roleplay` misclassified as work directive
  - Mitigation: separate task-intent classifier and pack-intent classifier
- Risk: UX complexity increases
  - Mitigation: session default pack + current mode badge + single-switch UX
