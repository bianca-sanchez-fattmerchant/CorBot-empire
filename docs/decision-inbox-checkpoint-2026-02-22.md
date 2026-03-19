# Decision Inbox Checkpoint (2026-02-22)

## Purpose
- Keep project-level decision flows as a continuation of existing work
- Prevent unnecessary new meetings and duplicate work
- Ensure multilingual consistency in decision UI/text

## Key Changes Applied
1. Project review gate
- When all active project items are in `review` status, do not start a team leader meeting immediately; wait for Decision Inbox approval
- Start the project review meeting only after approval

2. Decision Inbox API/client
- `GET /api/decision-inbox`
- `POST /api/decision-inbox/:id/reply`
- Connected client decision modal/reply flow

3. Option policy
- Removed exposure of `Keep waiting (keep_waiting)`
- For single-option cases with no meaningful choice, start `Start team leader meeting` directly instead of `Continue existing work`
- Cleaned up multilingual (ko/en/ja/zh) labels/summary strings

4. Additional request (supplement round)
- When `Additional request input` is submitted, create an additional request as a subtask of the existing task
- Branch `review -> pending` to start a supplement round
- Resume execution immediately when possible; otherwise log the pending reason

5. UI improvements
- Changed additional request input from `window.prompt` to an input area at the bottom of the modal
- Improved `Submit request` button contrast/visibility in light and dark modes

## Verified Behavior
- Additional request input values are recorded below
  - `task_logs`: `Decision inbox follow-up request added: ...`
  - `subtasks`: `[Decision Inbox Additional Request] ...` or multilingual prefix
- Confirmed supplement round branch/re-execution logs
  - `Decision inbox: supplement round opened (review -> pending)`
  - `Decision inbox: supplement round execution started`

## Next Steps (OpenClaw Integration)
- Send OpenClaw Gateway wake notifications when a decision item is generated
- Target events
  - Project review ready (`project_review_ready`)
  - Decision required to resume after timeout (`task_timeout_resume`)
- Apply deduplication keys to prevent excessive notifications
