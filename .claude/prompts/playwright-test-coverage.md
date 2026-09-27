---
agent: default
description: Plan, generate and heal tests for one flow
---

Parameters:
- Task: the flow to cover
- Seed file (optional): defaults to `playwright/tests/authenticated/agent-seed.spec.ts` (logged-in flows; none for public flows)
- Test plan file: `playwright/test-plans/{authenticated,public}/<flow>.md` (match the flow's auth context)

1. Call #playwright-test-planner subagent with prompt:

<plan>
  <task-text><!-- the task --></task-text>
  <seed-file><!-- path to seed file --></seed-file>
  <plan-file><!-- path to test plan file to generate --></plan-file>
</plan>

2. For each test case from the test plan file (1.1, 1.2, ...), one after another, not in parallel, call #playwright-test-generator subagent with prompt:

<generate>
  <test-suite><!-- Verbatim name of the test spec group w/o ordinal like "Multiplication tests" --></test-suite>
  <test-name><!-- Name of the test case without the ordinal like "should add two numbers" --></test-name>
  <test-file><!-- Spec path under playwright/tests/{public,authenticated}/ per auth context, like playwright/tests/authenticated/work-orders-inspection.spec.ts --></test-file>
  <seed-file><!-- Seed file path from test plan --></seed-file>
  <body><!-- Test case content including steps and expectations --></body>
</generate>

3. Call #playwright-test-healer subagent with prompt:

<heal>Run only the spec files generated in step 2 and fix the failing tests one after another. Do not run the whole suite.</heal>
