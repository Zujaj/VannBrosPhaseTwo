---
agent: playwright-test-healer
description: Fix failing tests
---

Fix the failing tests in <!-- spec path, e.g. playwright/tests/authenticated/maps.spec.ts -->,
running only that file on the <!-- firefox | chromium | firefox-guest --> project.

- Do not run the whole suite: `@mutating` tests create data on QA, and a full run is slow and expensive.
- If a test fails at login, stop and report that `pnpm auth:qa` must be run.
