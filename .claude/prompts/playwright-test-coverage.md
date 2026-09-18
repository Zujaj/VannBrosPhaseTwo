---
agent: default
description: Produce test coverage
---

Parameters:
- Task: the task to perform
- Seed file (optional): the seed file to use, defaults to `playwright/tests/seed.spec.ts`
- Test plan file (optional): the test plan file to write, under `playwright/test-plans/{authenticated,public}/` folder (match the flow's auth context).

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

<heal>Run all tests and fix the failing ones one after another.</heal>
