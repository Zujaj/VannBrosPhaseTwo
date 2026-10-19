---
name: vannbrosphasetwo-yhs
description: >-
  Product + QA reference for YHS (Yolo Hulling and Shelling Company), the Vann Brothers
  huller/sheller, and its Folio3 processor apps: AgriWMS (warehouse: Receiving Harvest
  Loads / field tickets, gross-tare-net scale weighing, stockpile assignment and stockpile
  ticket, field validation by QR, weight certificate, inventory, locations/stockpiles/tanks,
  truck check-in, shipments, empty bins, bulk trailer weighing, handler bin IDs),
  AgriQuality (quality templates, attributes, quality orders), AgriProduction (pre-clean
  jobs, production runs, chutes, bin tags, turnout), and the Vann Phase 3 YHS FRD (D365 F&SC
  receiving, fumigation, hulling, shelling, USDA, shipments). Also covers how YHS Receiving
  links to AgriERP Harvest Central harvest tickets (WMSIntegration sync, actual weight,
  Awaiting YHS). Use whenever a task mentions YHS, AgriWMS, WMS, vann-wms-qa, receiving,
  field ticket, stockpile, weight certificate, huller, pre-clean, AgriQuality or
  AgriProduction, even if "YHS" is not named. Farm App facts (work orders, Harvest Central
  screens) stay in vannbrosphasetwo-knowledge.
---

# YHS (Yolo Hulling and Shelling) — AgriWMS, AgriQuality, AgriProduction

**YHS** is the Vann Brothers hulling and shelling facility. Growers' trucks bring field-run almonds there.
Folio3 builds three processor apps for it on the same AgriERP platform (same auth gateway) as the Farm App:

| App | What it does | QA URL | Reference |
|---|---|---|---|
| **AgriWMS** | Receiving (field tickets, scale, stockpiles), inventory, locations, movement, truck check-in, shipments, empty bins, bulk trailer weighing, handler bin IDs | `https://vann-wms-qa.agrierp.com` (**live-checked 2026-10-19**) | `references/agriwms.md` |
| **AgriQuality** | Quality attributes → templates → quality orders against stockpiles / production runs | Prototype only: `https://agrierp-quality-vb.folio3.site/` | `references/agriquality.md` |
| **AgriProduction** | Pre-clean jobs, production orders (hulling/shelling runs), chutes, bin weighing and tags, D365 batch orders | Prototype only (see reference) | `references/agriproduction.md` |

The **FRD** (`references/frd-yhs.md`) is the signed As-Is → To-Be requirements document (Dec 2025, D365 F&SC). Its RQ IDs
(RQ-REC, RQ-QLT, RQ-PRC, RQ-USD, RQ-SHP) are the traceability anchors for YHS test cases.

## Reference routing

| If the task is about… | Read |
|---|---|
| **How YHS Receiving links to AgriERP Harvest Central**: ticket sync, `WMSIntegration` API, field mapping, actual weight, `Awaiting YHS`, cross-system statuses, E2E verification steps | `references/harvest-central-integration.md` |
| AgriWMS screens, labels, statuses, receiving journey, stockpile assignment, weighing, printing, inventory, locations, shipments, truck check-in, bins. **§0 has the live QA check and spec ↔ live drift** | `references/agriwms.md` |
| Quality attributes / templates / orders, sampling, grading | `references/agriquality.md` |
| Pre-clean, production runs, chutes, bins, turnout, D365 batch orders | `references/agriproduction.md` |
| Business requirements and process per stage (receiving → fumigation → quality → picking → pre-clean → hulling → shelling → labels → storage → USDA → shipments) | `references/frd-yhs.md` |
| Farm App side of harvest tickets (planning, capture, drawer, posting) | `vannbrosphasetwo-knowledge` → `references/harvest-central.md` |

## Authority order

1. **Live QA app.** It wins for tests and docs. Flag drift; don't silently rewrite.
2. **AgriWMS / AgriQuality / AgriProduction PSDs** (`resources/yhs/*.pdf`).
3. **FRD.** It holds requirements, not built behaviour.
4. The FRD *Diagrams* file. It is derived and inferred, not signed off.

**Source-file trap:** `resources/yhs/AgriWMS Warehouse Management Product Spec.md` actually contains the
**AgriProduction** spec. Read AgriWMS from the PDF (or `references/agriwms.md`). `resources/yhs/product-spec-docs/*.pdf`
are byte-identical copies of the three top-level PDFs.

## Environment & login (AgriWMS QA)

- URL `https://vann-wms-qa.agrierp.com`. `/receiving` redirects to `/login` when signed out.
- `PIN` → on-screen keypad `Enter 6-Digit PIN`. Click the digit buttons; key presses don't register. Then pick
  **`Select Configuration`** → `Vann Brothers - QA` → **`YHS`**. Card Scan is the other sign-in option.
- Superadmin PIN: `playwright/.auth/yhs_wms_credentials.json` (template in `playwright/auth-templates/`), or the
  `YHS_WMS_PIN` env var, which takes precedence. Never print it. It signs in as `Super User` / `superuser@test.com`.
- **Session: `pnpm auth:wms`** (in `playwright/`, project `wms-setup`, `tests/wms/wms.setup.ts`) writes
  `.auth/wms-superadmin.json`. It reuses a valid session, else clicks the PIN keypad and `YHS`. If no PIN is stored, or
  the scripted entry fails, the headed Firefox window is **handed to a human** for up to 5 minutes (same pattern as
  `pnpm auth:qa`). `AUTH_HEADLESS=1` skips the window when the stored PIN is known to work. The setup logs a WARNING
  when the API answers "user not found in the system". Access token ≈ 1 h, refresh token 30 days; reuse re-saves the
  state. For `playwright-cli`, `state-load .auth/wms-superadmin.json` then `goto` a WMS route.
- WMS URLs: `WMS_QA_BASE_URL`, `wmsRoutes` and `wmsUrl()` in `playwright/tests/constants/routes.ts`. They're QA only;
  `TARGET_ENV` does not apply.
- **Known blocker (2026-10-19):** that user is not in the WMS database, so every `/api/v1/*` call returns 404
  `User with email 'superuser@test.com' not found in the system`. Screens render, but lists are empty and dropdowns don't load.
  Ask dev to provision the user (or for a provisioned PIN) before doing data-level QA.
- API: `https://agrierp-authgateway-qa-api.folio3.site/api/v1/…` (`field-tickets`, `locations`, `shipments`,
  `master-data/growers/dropdown`), the same gateway as the Farm App.
- Drive it with the `playwright-cli` skill in **Firefox**, run from `playwright/`. Treat WMS QA as **read-only** unless
  the user approves creating data. Field tickets feed D365 inventory and the Farm App's Actual Weight.
- No WMS specs exist yet. When adding them, put them under `playwright/tests/wms/`, use `storageState: WMS_AUTH_FILE`
  (`tests/helpers/wmsAuth.ts`), make the project depend on `wms-setup`, and keep WMS URLs out of the Farm App `routes`.

## Roles (from the PSDs)

| App | Persona | Device |
|---|---|---|
| AgriWMS | Front Office ("Sarah"): creates or selects the field ticket, weighs gross and tare, assigns the stockpile, prints | Web |
| AgriWMS | Stockpile Worker ("David"): field-validates the stockpile by QR, moves loads | Mobile / tablet |
| AgriQuality | Quality Manager (web); Quality Supervisor (web in v1.1) | Web |
| AgriProduction | Production Manager (web); Production Supervisor and Floor Workers (kiosk/tablet, job card or PIN) | Web + kiosk |
| FRD | Receptionist, Yard Leader, driver, AFS (fumigation), USDA inspector | — |

## Glossary (short)

| Term | Meaning |
|---|---|
| **Field run** | Almonds as harvested, before hulling or shelling |
| **Field ticket / harvest ticket** | One truck load's receiving record. AgriWMS uses both terms. In the Farm App it is the Harvest Central ticket (`HT-…`) |
| **GFV** | Grower–Field–Variety, the key for stockpile assignment (first load opens a pile; later loads reuse it) |
| **Stockpile** | Yard pile (lot) of one GFV. It has a QR label; the driver gets a barcoded *stockpile (location) ticket* |
| **Gross / Tare / Net** | Truck weight in, empty weight out, and Net = Gross − Tare |
| **Weight certificate** | Printed after tare. After it is printed, the ticket and stockpile can no longer be changed |
| **Handler** | Marketing handler for the grower's crop (GP `handler`, e.g. `VFO`) |
| **Handler Rejects** | Product type `Rejects`. GFV is locked and the load goes to a virtual stockpile |
| **Intercompany grower** | (PSD) Grower whose ticket arrives "synced via AgriERP" instead of being keyed in WMS |
| **Inshell / Kernel** | Shelling outputs. Shipments are split by these |

Full glossaries are at the end of each reference.
