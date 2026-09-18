# QA accounts and role coverage

The regression workbook's `Test Data & Env` sheet requires nine actor profiles. This is what
we currently hold, and what still blocks the permission-scoped cases.

Roles are registered in `playwright/tests/constants/roles.ts` (+ `roles.json`). Credentials
live in the gitignored `.auth/credentials.json` (or `VANNBROSPHASETWO_<ROLE>_USER` / `_PASS` in CI) —
never in the repo. See ARCHITECTURE.md § "Credentials".

## Status — verified 2026-08-31

| Role | Workbook profile | Account | Session | Notes |
|---|---|---|---|---|
| `admin` | Admin / Manager (Grower) | `rffcropplanner@…` | ✅ bootstraps unattended in ~45s | The actor every existing authenticated spec runs as. |
| `farmhand` | FarmHand / Crew | `f3-agrierp-16@…` | ❌ blocked | Password is **valid** — Azure AD accepts it, then demands MFA **enrolment** ("Let's keep your account secure"). Automation cannot complete that. See below. |
| ~~`farmhand`~~ | ~~FarmHand / Crew~~ | ~~`f3-agrierp-04@…`~~ | ❌ unusable | Azure AD demands a password change ("Update your password"). Superseded by `-16` at the team's direction. |
| `supervisor` | Supervisor | — | ❌ unassigned | |
| `responsible` | Responsible | — | ❌ unassigned | |
| `operator` | Machine Operator | — | ❌ unassigned | |
| `multiGrower` | Multi-grower user | — | ❌ unassigned | |
| `restrictedLocation` | Restricted-location user | — | ❌ unassigned | |
| `bypassAttendance` | Bypass-attendance group member | — | ❌ unassigned | |
| `inactive` | Inactive user | — | n/a | Expected to be *refused* at sign-in (GN-007); holds no session by design. |

## Current state: 1 of 31 accounts usable

`pnpm triage:accounts` signs in with every account in the credentials file and classifies the
result into `test-plans/ACCOUNT-TRIAGE.md`. As of 2026-09-10: **1 usable** (the admin),
15 needing a password change, 10 with a wrong password on file, 4 needing MFA enrolment.

The file is stale rather than the tenant being locked down — see FINDINGS #11 for the
one-account fix.

## The MFA enrolment blocker

`f3-agrierp-16` gets further than `-04` did: its password is accepted. Azure AD then shows
the **enrolment** wizard — the account has no second factor registered at all — and that is
not something automation should do. Registering an authenticator or phone against a real
person's account is a permanent change to it.

Two ways forward, both needing a human:

1. **Enrol it once by hand.** Run `AUTH_ROLES=farmhand pnpm auth:qa` *without*
   `AUTH_HEADLESS=1`, complete the wizard in the visible browser, and the session persists
   from then on like the admin one does.
2. **Exclude QA test accounts from the MFA registration policy** (tenant admin). This is the
   better answer if the suite is ever to bootstrap roles in CI, which cannot involve a human
   at all.

The admin account (`rffcropplanner`) is unaffected — it bootstraps unattended in ~45s — so
whatever policy applies to it is the one the other test accounts want.

`auth.setup.ts` detects this screen and fails in ~20s with the above guidance, rather than
waiting out the five-minute human-login window.

## What's blocking the rest

The QA account list holds **31 accounts**, but only three carry a label that names an VannBrosPhaseTwo
role ("QA Admin user", "Farm Hand", "Farm Manager"). The rest are grouped by the tester who
owns them, which says nothing about their permissions.

Assigning them is a **human decision, not a guess**: a wrong mapping produces permission
tests that fail for the wrong reason and read as product bugs. To assign one, add it under
its role key in `.auth/credentials.json` (re-running `pnpm creds:import` preserves manual
assignments) and bootstrap with `AUTH_ROLES=<role> pnpm auth:qa`.

## Why this matters

**45 of the 633 web cases** cannot be automated as `admin` — they exist precisely to prove a
lower-privileged user is *denied* something. That includes every `Security`-type case, the
whole `12 Users, Roles & Perms` tab (39 automatable cases, 25 of them P1), and the
`Permissions` sub-process on Planning, Observations, Harvest Central, Settings and the
Communication Center.

Two accounts unblock most of it: a **Supervisor** (no create rights on web) and a working
**FarmHand** (minimum permissions).
