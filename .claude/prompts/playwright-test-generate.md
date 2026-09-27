---
agent: playwright-test-generator
description: Generate tests from a plan
---

Generate the test for bullet <!-- e.g. 1.1 --> of the test plan.

- Test plan: `playwright/test-plans/authenticated/<flow>.md`
- Seed file: `playwright/tests/authenticated/agent-seed.spec.ts`
- Test file: `playwright/tests/authenticated/<flow>.spec.ts` (`public/` for guest flows).
  Add to the existing spec for that flow if there is one.
- Title carries the workbook tag if the plan gives one (`@TC:XX-000`, `@TC-partial:`, `@SMK:`), plus `@mutating` if it changes data.
