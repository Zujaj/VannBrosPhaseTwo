---
name: vannbros-burq
description: >-
  QA reference for Burq.io, the iPaaS that moves Vann Brothers data between the AgriERP Farm App,
  YHS AgriWMS and D365 (VANNBROS.QA instance, https://vannbros-qa.burqio.site). Covers login
  (email + password + emailed 2FA code, `pnpm auth:burq`), Transactions and the Advance Filter
  (workspace YHS_AGRIERP → dataflows YHS_HarvestTickets / Drivers / Fleet / Trucks / Trailers /
  TicketsWeight_AGRIERP), how to read a data packet (Source ID, Destination ID, Detail, the GET /
  POST / UPDATE steps), the DataPacket REST API, and known sync errors. Use whenever a task mentions
  Burq, burqio, sync logs, dataflow, data packet, transactions, "why didn't the ticket sync",
  wmsSyncStatus, external ref id, or tracing a Harvest Central ticket into WMS, even if Burq is not
  named. Read-only: never retry, re-run, edit or stop anything in Burq.
---

# Burq.io (VANNBROS.QA): the sync layer between Farm App, AgriWMS and D365

Burq is a Blazor WebAssembly iPaaS console. Each **workspace** groups **dataflows**. A dataflow runs on a cron
(the YHS_AGRIERP ones run every minute). Each record it moves is a **data packet**, which the UI calls a
**transaction**. When the Farm App and WMS disagree, the packet tells you which side produced the bad value.

Live-checked 2026-10-19, v2.1.0.1. The UAT instance header reads `VANNBROS.UAT` and has the same screens.

## Login and session

- URL `https://vannbros-qa.burqio.site`. Any route redirects to `/` (login) when signed out. The first load
  downloads the .NET runtime, which takes 30–60 s before the form renders.
- The login form has **Email**, **Password** and **Login**. Then `/loginwith2fa` shows "Enter the authenticator code you
  received in your registered email." → **Code** → **Login**. After 2FA the app lands on `/`, the same path as
  login, so detect sign-in by the left nav (it shows "Transactions"), not by URL.
- Credentials are in `playwright/.auth/burq_credentials.json` (`{ QA: { url, email, password } }`; template in
  `playwright/auth-templates/`). `BURQ_EMAIL` / `BURQ_PASSWORD` take precedence. Never print them.
- **`pnpm auth:burq`** (in `playwright/`, project `burq-setup`, `tests/burq/burq.setup.ts`, always headed):
  - it reuses a valid session;
  - otherwise it fills the email and password, and a **human types the 2FA code** within 5 min.
- The session is saved to `.auth/burq-qa.json`. The tokens are in localStorage (`authToken`, a JWT, and
  `refreshToken`). Nothing is in cookies. `.auth/burq-qa.session-storage.json` is restored by an init script (it's
  empty today).
- For `playwright-cli`: `-s=burq open --browser=firefox`, `state-load .auth/burq-qa.json`, `goto …/transactions`,
  then wait about 40 s for the app to boot.
- Routes: `BURQ_QA_BASE_URL`, `burqRoutes` and `burqUrl()` in `playwright/tests/constants/routes.ts`.

## Navigation (left nav → route)

| Nav | Route |
|---|---|
| Home | `/` |
| Workspaces | `/workspace` |
| Dataflow | `/workspace-dataflows` (Classic / Orchestration tabs, Advance Filter) |
| **Transactions** | `/transactions` |
| Debug Logs → All / Info / Error Logs | `/logs`, `/infologs`, `/errorlogs` |
| Packet Logs | `/packetlogs`, `/producerpackets`, `/consumerpackets` |
| Audit Trails | `/audittrails` |
| Apps, Analytics, Reports, Manager, Settings | (not explored) |

## Transactions → Harvest Central logs (the main QA use)

1. Open `/transactions`. The grid has columns **ID · Workspace · Dataflow · Status · Source ID · Destination ID · Detail
   · Created at**. Top bar: **Exact Match**, **Search by keywords**, **Auto Refresh Disabled**, **Refresh**, **Advance filter**.
2. **Advance filter** opens the "Advance Filter" panel:
   - **Workspaces**: pick `YHS_AGRIERP`;
   - **Dataflows**: it's disabled until a workspace is picked; tick `YHS_HarvestTickets_AGRIERP`;
   - **Status**;
   - **Select Date** From / To (defaults to the last month);
   - keyword box with "Click on checkbox for exact match";
   - **Filter** / **Clear**.
3. Each row is one sync attempt for one Farm App ticket:
   - **Source ID** is the Farm App ticket `id`, the `/api/harvestcentral/ticket/{hcId}` row id, not the `HT-…` number;
   - **Destination ID** is the WMS field ticket id (`/receiving/{id}`);
   - **Detail** reads either `Harvest ticket HT-… synced to WMS (entityId: N).` or the validation error;
   - **Status** is Success or Error.

Other workspaces in the dropdown: `AuthGW_Apps`, `ElectronicShipment`, `VFO_D365_Apps`, `VFO_GP_Apps`, `VFO_GP_D365`,
`VFO_ProductionOrder`, `YHS_D365_Apps` (WMS → D365 inventory journals and shipments), `YHS_GP_Apps`, `YHS_ProductionOrder`.

### YHS_AGRIERP dataflows (workspace id 12)

| Dataflow | id | Direction | Notes |
|---|---|---|---|
| `YHS_HarvestTickets_AGRIERP` | 110 | Farm App → WMS | GET Farm `WMSIntegration/harvest-tickets` → POST WMS field ticket → UPDATE Farm (`mark-as-synced`: `wmsTicketRefId`, `wmsSyncStatus 2`) |
| `YHS_TicketsWeight_AGRIERP` | 111 | WMS → Farm App | Actual weight back to the harvest ticket |
| `YHS_Drivers_AGRIERP` | 106 | WMS → Farm App | Detail `Driver … created successfully (erpId: N)`; Source = WMS id, Destination = Farm id |
| `YHS_Fleet_AGRIERP` | 105 | WMS → Farm App | WMS carriers become Farm fleets |
| `YHS_Trucks_AGRIERP` | 107 | WMS → Farm App | |
| `YHS_Trailers_AGRIERP` | 108 | WMS → Farm App | |

The master-data flows give each Farm fleet/driver/truck/trailer a `…ExternalRefId` (its WMS id). The harvest-ticket
flow sends those refs to WMS **as-is**: Burq does no name or plate lookup. A wrong ref on the Farm side produces wrong
transport data in WMS.

## Reading a packet

The grid's `data` holds a JSON string. Inside it, `Syncable.Json` holds the run record:
- `GET.data`: what the Farm App returned, e.g. `ticketNumber`, `manualTicketNumber`, `fleetExternalRefId`,
  `driverExternalRefId`, `truckExternalRefId`, `front/rearTrailerExternalRefId`, `isSplitLoad`, `splitLoadOption`,
  `standardQuantity`, `actualQuantity`.
- `EXECUTED_STEPS`, for example `["POST","UPDATE"]`. On a validation error the list is empty and nothing is sent.
- `POST`: the WMS response (`entityId`, `operationDisplayName`). The POST **request body is not logged**.
- `UPDATE`: the body sent back to the Farm App.
- `FETCHMARKER`: the incremental cursor (`DateTime`, `PageSize 50`).

"View full" on a row opens this in the UI. To read it in bulk, use the API.

## REST API (same origin, `Authorization: Bearer <localStorage authToken>`)

- `GET /api/v1/DataPacket/dataPackets?ServiceIds=110&Status=0..6&FromDate=…&ToDate=…&PageNumber=0&PageSize=25&IsASC=false&MatchPhrase=false&OrderByFieldName=DateModified`
  (`ServiceIds` = dataflow id). Response: `{ data[], totalCount, totalPages, … }`, where each row has `id, status
  (2 success, 3 error), sourceID, destinationID, detail, data, serviceName, workspaceName`.
- `GET /api/v1/Workspaces/options?IncludeHidden=false`, `GET /api/v1/Dataflows/options?WorkspaceId=12`, `GET /api/v1/Dataflows`.
- Run it in the page (`playwright-cli run-code` → `page.evaluate(fetch…)`) so the token never leaves the browser.

## Known findings (QA, 2026-10-19, Harvest Central 19 = field 290 / NONPAREIL)

- **Wrong transport data in WMS: the Farm App sends wrong external refs (ADO #26706).**
  - Packet 4711 (Farm 977, HT-290-JJZIQ-26 → WMS 6073) sent fleet 104, driver 8, truck 12, trailers 17/16. The ticket's
    own fleet, driver, truck and trailers are Valley Farm Transport (WMS 82), Chavez, Antonio, 9F33028 (WMS 6) and TRL-104/103.
  - Packet 4717 (Farm 696, HT-290-40N8N-26 → WMS 6077) sent 44 / 87 / 175 / 3280, while the correct WMS ids are 22 / – / 169 / 3154.
  - The offsets are constant per entity. These records predate Burq: the WMS rows are `SEED_DRV_20260630` / `SEED_20260630`,
    and only 33 drivers and 2 fleets ever went through Burq. So the bad cross-refs come from the 2026-06-30 seed, not from the live flow.
- **No fleet, no sync (ADO #26707).** Packet 4714 (Farm 711, HT-290-SC57Y-26) failed with `'Fleet External Ref Id' must not be empty.`
  The ticket stays `wmsSyncStatus 1`, and the Farm App shows no error.
- **Manual ticket length (ADO #26709).** Packet 4710 (Farm 576) failed with `The length of 'Manual Ticket Number' must be 50 characters or
  fewer. You entered 61 characters.` The Farm App accepts up to 64 (ADO #26704).
- **Manual ticket # dropped (ADO #26708).** The GET carries `manualTicketNumber` ("RT1", "Man01"), but WMS `ticketNumber` stays null. The
  POST body isn't logged, so it is not yet clear whether Burq's mapping or WMS drops it.
- **Duplicate link.** Packets 4692–4695 (Farm 562) failed with `WMS ticket reference '6068' is already linked to harvest ticket 'HT-130-VTXV0-26'.`
- **Attachments are not part of the flow.** WMS tickets show 0 attachments.

## Rules

- **Read-only.** Don't retry, re-run, stop or start dataflows, and don't edit connections or settings. A retry
  re-sends to WMS or D365.
- Quote packet ids (`ID` column) in bugs, along with the Source and Destination IDs.
- Related skills: `vannbrosphasetwo-yhs` (WMS side, `references/harvest-central-integration.md`) and
  `vannbrosphasetwo-knowledge` (Farm App Harvest Central).
