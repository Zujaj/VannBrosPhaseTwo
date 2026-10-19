# `.auth/` file formats

`playwright/.auth/` is gitignored (`playwright/.gitignore`), so its files never appear in a checkout. This folder holds **committed, placeholder-only templates** for the files a person writes by hand. To use one, copy it into `.auth/` without the `.example` part and fill in real values:

```bash
cp auth-templates/production_farmappadmin_credentials.example.json .auth/production_farmappadmin_credentials.json
```

Never put a real value in this folder, and never print a filled-in file (no `cat`, no logging). When you need to inspect one, print only its keys.

## Hand-written files (templates here)

| File in `.auth/` | Template | Shape | Read by | Overridden by |
|---|---|---|---|---|
| `credentials.json` | [`credentials.example.json`](./credentials.example.json) | Role keys → `{ username, password, heading? }`; `_unassigned[]` of the same shape; `_README[]` notes | `tests/helpers/credentials.ts` (QA role bootstrap in `auth.setup.ts`), `tests/public/account-triage.spec.ts`; written by `pnpm creds:import` | `VANNBROSPHASETWO_<ROLE>_USER` / `_PASS` (legacy `AGRIERP_<ROLE>_*`) |
| `production_farmappadmin_credentials.json` | [`production_farmappadmin_credentials.example.json`](./production_farmappadmin_credentials.example.json) | `{ email, password }`, the `farmappadmin` account | `tests/helpers/credentials.ts` (admin on UAT, `TARGET_ENV=uat`), `scripts/sync-console-errors.mts` (production, read-only) | `PROD_SYNC_EMAIL` / `PROD_SYNC_PASSWORD` (sync-console script only) |
| `growersportal_credentials.json` | [`growersportal_credentials.example.json`](./growersportal_credentials.example.json) | `{ <env>: { <GP role>: { email, password } } }`; env is `QA`; roles `SuperAdmin`, `Super Admin View-only`, `GrowerAdmin`, `GrowerRep`, `Grower View-only` | No code yet. Used by hand to sign in to Grower's Portal QA (Microsoft login + MFA), which is **read-only** for us | — |
| `yhs_wms_credentials.json` | [`yhs_wms_credentials.example.json`](./yhs_wms_credentials.example.json) | `{ <env>: { url, <role>: { pin, configuration } } }`; env is `QA`; role `Superadmin` | `tests/helpers/wmsAuth.ts` → `pnpm auth:wms` (scripted PIN entry; with no valid PIN a human finishes the login in the open window). Also used by hand with `playwright-cli`. See the `vannbrosphasetwo-yhs` skill | `YHS_WMS_PIN` |

Field notes:
- **`credentials.json` role keys** must be names from `tests/constants/roles.json`. Any other key, and anything starting with `_`, is ignored. An entry is used only when both `username` and `password` are non-empty strings. A malformed file is ignored, and setup falls back to the human SSO login.
- **`heading`** is the section label the account sat under in the source `creds.txt`. It is informational only; `pnpm creds:import` uses it to place `QA Admin user` / `Farm Hand` accounts. It must never hold a password. Before the 2026-10-12 importer fix, a password line leaked into the following accounts' `heading`.
- **Grower's Portal role names** contain spaces, so keep them quoted exactly as above.

## Token files (plain text, no template)

One line holding just the bearer token (a JWT); a `Bearer ` prefix is fine. Where noted, a JSON object is also accepted.

| File | Holds | Read by | Overridden by |
|---|---|---|---|
| `qa_refresh_token.txt` | Farm App QA API token | `api/client.mts` (also accepts `{ "token" \| "qa_refresh_token" \| "access_token": "…" }`) | `VANNBROSPHASETWO_API_TOKEN` (legacy `AGRIERP_API_TOKEN`); falls back to `printToken` in `admin.json` |
| `qa_operator_token.txt` | Farm App QA token for the operator | `api/client.mts` (`ApiClient.asOperator`), `scripts/seed-hour-log.mts` | `VANNBROSPHASETWO_OPERATOR_TOKEN`; falls back to `operator.json` |
| `qa_finops_token.txt` | D365 F&O bearer (its `aud` claim is the D365 host) | `.claude/skills/vannbrosphasetwo-finops-api/scripts/finops.mjs` (also accepts `{ "access_token" \| "token": "…" }`) | `FINOPS_API_TOKEN` |

They expire within hours. See the `vannbrosphasetwo-vann-api-qa` and `vannbrosphasetwo-finops-api` skills for how to get fresh ones.

## Generated files (not documented here)

Playwright `storageState` files (`{ cookies, origins }`), written by `pnpm auth:qa` / `pnpm auth:uat` (`tests/auth.setup.ts`) or by `playwright-cli state-save`. Don't edit them by hand.

| File | Written by |
|---|---|
| `admin.json`, `operator.json`, `farmhand.json`, `<role>.json` | `pnpm auth:qa` (one per role in `tests/constants/roles.json`) |
| `uat-admin.json` | `pnpm auth:uat` |
| `gp_superadmin.json` | `playwright-cli state-save` after a manual Grower's Portal login |
| `wms-superadmin.json` | `pnpm auth:wms` (`tests/wms/wms.setup.ts`): YHS AgriWMS QA, session in localStorage |
