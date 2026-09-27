---
agent: playwright-test-planner
description: Create test plan
---

Create a test plan for <!-- flow, e.g. "Inspection Template: create, edit, activate" -->.

- Seed file: `playwright/tests/authenticated/agent-seed.spec.ts` (logged-in; for a public flow use no seed)
- Test plan: `playwright/test-plans/authenticated/<flow>.md` (`public/` for unauthenticated flows).
  Match the format of `playwright/test-plans/authenticated/work-orders-planned.md`.
- Take labels, steps and statuses from `vannbrosphasetwo-knowledge`; note where the live app differs.
- Mark steps that create or change QA data as `@mutating`.
