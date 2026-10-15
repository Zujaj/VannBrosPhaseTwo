# QA environment readiness checklist (run before smoke testing)

Gate for `pnpm test:smoke` (QA, Firefox, `@SMK` minus `@mutating`). If any **Blocker** row fails,
stop: the run will report environment noise as product defects. Record the result in the run
report (`coverage/runs/`). Facts below come from `auth.setup.ts`, `ARCHITECTURE.md`,
`SMOKE-NOTES.md`, `FINDINGS.md` and the 2026-10-12 UAT smoke run.

Run from `playwright/`. Target: `https://agrierp-vann-qa.folio3.site`, tenant Vann Brothers (VBS),
site Colusa, season Crop Year 2026.

## 1. Services reachable (Blocker)

- [ ] Web app loads: `https://agrierp-vann-qa.folio3.site/login` returns the login page, not a 5xx / blank page.
- [ ] Auth gateway answers: `agrierp-authgateway-qa-api.folio3.site` (token refresh and `/api/...` calls go here).
- [ ] Farm App API answers: `agrierp-vann-api-qa.folio3.site`.
- [ ] Not a DNS blip. WSL DNS has been flaky (see UAT work); retry `curl -sI <host>` twice before blaming the env.
- [ ] `maps.googleapis.com` reachable. TLS resets ~40% from this network; the harness retries and caches
      (`helpers/googleMaps.ts`), but a hard outage breaks every Maps row (MP-01..09).
- [ ] Auth Choose Environment dialog offers **Vann Brothers - QA** (`signIn.ts` retries the toggle until visible).

## 2. Session and token (Blocker)

- [ ] `pnpm auth:qa` exits 0. It refreshes `.auth/admin.json` in about 2 s, or does a scripted login.
- [ ] Log line reads `Existing session is VALID (... live Season)`, not `Session Season is missing or expired`.
- [ ] No sign-in blocker raised: password change required, MFA enrolment/challenge, credential rejected,
      no VannBrosPhaseTwo access. Detect and report only; never self-heal shared accounts.
- [ ] No HTTP 429 during login. Wait it out; do not hammer.
- [ ] Season is **Crop Year 2026** (`AUTH_SEASON` overrides). The header Season selector `title` must match.
      A season-expired session still authenticates but serves the degraded "Select Blocks" plot picker.
- [ ] Site is **Colusa** (Location id 2); QA defaults used by `pnpm api:smoke` are location 2, season 13.
- [ ] `pnpm api:smoke` exits 0: lists work orders and reads their Summary (read-only, proves API token works).
- [ ] Credential files present, gitignored, never printed: `.auth/credentials.json`, `.auth/admin.json`.
      Templates in `auth-templates/`.
- [ ] Only the `admin` account is usable unattended (1 of 31 accounts, `ACCOUNT-TRIAGE.md`). Any row needing
      Farm Hand, Supervisor, Operator etc. is manual or blocked; do not expect it from the suite.

## 3. Master data present in Crop Year 2026 / Colusa (Blocker for data-dependent rows)

Data-dependent rows fail as "no data", not as defects. Check each is non-empty:

- [ ] Work orders exist across states: upcoming, active, completed (MP-01..03, WO-02, WO-16, WI-14).
- [ ] Inspection WOs exist in the current week window with In Progress and Done states
      (MP-04/05 pass only partly without them; known gap).
- [ ] Material templates exist, including `Fertilization` and `Irrigation` (TM-01..36, TK-01/02, ST-09).
- [ ] Inspection templates exist, including `Inspection Template 001` (TI-10, TI-12).
- [ ] Attributes exist (TA-07 search needs cards).
- [ ] Crops, Materials, Operations (Task Type Name column), Resources lists non-empty (ST-02, 05, 07, 08).
- [ ] A POI / observation exists in the season (PO-05).
- [ ] Plots / blocks for Colusa load in the Create WO plot picker ("Select Plots", not "Select Blocks").
- [ ] Resources synced from D365 (Settings > Resources). Sync Console not stuck on errors for
      resource, plot, material or WO jobs (D365 F&O link; check `vannbrosphasetwo-finops-api` if suspicious).
- [ ] Dummy Resources v2 present on QA (QA-only; not on UAT). Needed by its own specs, not by any smoke row.

## 4. Known-bad areas: confirm status first, so expected failures are not re-triaged

Record whether each still reproduces today. A change in either direction is news.

- [ ] **MP-08**: Maps > Set Filters > Filter Type Task lists no operations until a WO filter type is chosen. Still failing.
- [ ] **TI-04**: Inspection wizard Available Attributes search does not filter. Still failing.
- [ ] **OPERATIONS-GRID**: `GET /api/Operation/getOperationsPaginated` never answers; ST-07 / ST-033 hang on skeleton rows.
- [ ] **TM-WIZARD-DROPDOWNS**: `GET /api/metadata/MaterialsV2?page=1&limit=99999` returns 500; wizard pickers
      blank (TM-08/10/11/13/17/25/28/29, partial passes). Does not reproduce on UAT.
- [ ] **TM-EDIT-CLONE-BLANK**: Material Template Edit/Clone open blank (TM-34/35). Does not reproduce on UAT.
- [ ] **TA-DELETE-500**: attribute delete / disable return 500, so `@mutating` attribute rows leave data behind.
- [ ] **MOBILE-ROLES**: User Management > Mobile User Role Permissions shows "No Record Found".
- [ ] **MAPS-DATE**: WO Date Range picker locked to 1 Jan 1900.
- [ ] Clone-name casing: `Copy Of <name>` vs `Copy of <name>` (TI-10 flaked on this).

## 5. Environment hygiene (Warning)

- [ ] No leftover test data from earlier `@mutating` runs: `SMK-AUTO ...` attributes (ids 366/367 are stuck on the
      TA-DELETE-500 bug), stray `Copy of ...` WOs, test WOs not in To Do. Clean with `pnpm wo:delete`; only To Do WOs
      may be deleted. Never revert a started WO.
- [ ] No one else mid-run on the shared QA account (concurrent logins spend each other's refresh token).
- [ ] No deployment or data refresh in progress on QA. Confirm build/version with the dev team; note it in the run report.
- [ ] Tab/session: close stray `playwright-cli` browsers; run `playwright-cli` from `playwright/`, never repo root.
- [ ] Clock/timezone sane (Season entry has a short same-day TTL; a stale clock expires sessions early).

## 6. Test harness (Blocker)

- [ ] `pnpm install` done in `playwright/`; `pnpm typecheck` clean.
- [ ] Firefox browser installed for Playwright (`test:smoke` uses `--project=firefox`).
- [ ] `git status` understood: no half-edited specs or helpers from other work.
- [ ] Checklist mapping current: `pnpm smoke:coverage` passes (no orphan, double or non-web `@SMK` tag).
- [ ] `TARGET_ENV` unset (QA). UAT is an explicit opt-in only; production is never targeted.

## 7. Go / no-go

| Result | Action |
|---|---|
| Sections 1, 2, 6 fully green; section 3 non-empty | **Go.** Run `pnpm test:smoke`. Section 4 failures are expected. |
| Section 3 has empty data | **Conditional.** Seed (`pnpm seed:planned` / `seed:harvest` / `seed:tickets`) or flag the affected rows as env-blocked, not Fail. |
| Any section 1 or 2 failure | **No-go.** Fix or escalate. Do not run. |
| Section 4 item newly passing or newly failing | Log it in `FINDINGS.md` / `SMOKE-NOTES.md`; update the expectation. |

## 8. After the run

- [ ] Report: pass / partial / flaky / fail / not run (@mutating) / not automated, with env data issues listed apart from defects.
- [ ] Flaky rows (known: MP-07 timeout, TK-02 loader overlay click, TI-10 clone casing) retried once; note slowness.
- [ ] `@mutating` rows run only with approval (`pnpm test:smoke:all`); clean up created data afterwards.
- [ ] Manual-only rows (mobile, after-mobile, D365 posting review, 19 web rows not automated) scheduled separately.
