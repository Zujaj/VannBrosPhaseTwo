---
name: vannbros-burq
description: >-
  QA reference for Burq.io, the iPaaS that moves Vann Brothers data between the AgriERP Farm App,
  YHS AgriWMS and D365 (VANNBROS.QA instance, https://vannbros-qa.burqio.site). Covers login
  (email + password + emailed 2FA code, `pnpm auth:burq`), Transactions and the Advance Filter
  (workspace YHS_AGRIERP → dataflows YHS_HarvestTickets / Drivers / Fleet / Trucks / Trailers /
  TicketsWeight_AGRIERP), how to read a data packet (Source ID, Destination ID, Detail, the GET /
  POST / UPDATE steps), the Burq Web API (every endpoint from its Swagger spec, split by tag:
  Data Packet Management, Dataflow Management, Workspace Management, CrossRefs, Packet Logs,
  DebugLogs, …) with a read-only client (`scripts/burq.mjs`, token in
  playwright/.auth/vannbros_qa_burq_token.txt), and known sync errors. Use whenever a task mentions
  Burq, burqio, sync logs, dataflow, data packet, transactions, cross refs, "why didn't the ticket
  sync", wmsSyncStatus, external ref id, or tracing a Harvest Central ticket into WMS, even if Burq
  is not named. Read-only: never retry, re-run, edit or stop anything in Burq.
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

## REST API (Burq Web API)

Swagger 2.0 spec (`Burq Web API` v1). Local copy: `openapi.json` in this skill's folder. Live UI:
<https://vannbros-qa.burqio.site/swagger/index.html?url=/swagger/v1/swagger.json>. Same origin as the console.

- **Paths.** Most routes are `/api/v{version}/…` with `{version}` = `1`. Exceptions: `/api/identity/*` (users, roles,
  token), `/api/Audits`, `/api/Test/*`, and root routes `/dataPacketsCount`, `/dataPacketsCountByStatus`,
  `/dailyErrorGroups`, `/dailyErrorReport`. Copy each path from the reference file.
- **Unknown routes return 200 with the Blazor `index.html`**, not 404. A GET to a PUT-only route (e.g.
  `/api/v1/DataPacket/{Id}`) does the same. Treat an HTML body as "no such GET". `burq.mjs` fails on it.
- **Envelope.** `{ data, messages, succeeded }`. Paged lists add `currentPage` (1-based in the response),
  `totalPages`, `totalCount`, `pageSize`, `hasPreviousPage`, `hasNextPage`. The console sends `PageNumber=0` for the
  first page of `dataPackets`; `CrossRefs` takes `PageNumber=1`.
- **Packet status** (`MessageStatus`): 0 Default, 1 InQueue, **2 Success, 3 Error**, 4 Resync, 5 ReQueued, 6 Refetch,
  7 Archive. Other enums (`JobStatus`, `ConsumerStatus`, `StepType`, `HttpVerb`, …) are in `reference/_schemas.md`.

### How to use the reference

1. Find the tag in the index at the bottom and open `reference/<Tag-With-Dashes>.md`. To go from a path to its tag:
   `grep -l '`/api/v{version}/CrossRefs`' reference/*.md`.
2. Each file lists every operation (parameters, request body, **response schema**: unlike the Farm App spec, Burq's
   describes responses), then the schemas those use, two levels deep. Deeper types link into `reference/_schemas.md`
   (about 300 definitions). Don't read it whole: `grep -n 'id="schema-<lowercase name>"' reference/_schemas.md`.
3. Never hand-edit `reference/*.md` or the index block; run `scripts/refresh.sh`. Only this file's prose and
   `scripts/tag-summaries.json` are hand-written.

### Authentication

- Security scheme `JWT`: `Authorization: Bearer <token>`. Without it the API answers 401. `GET /api/Test/ping` needs no
  token (liveness only).
- The token is the console's localStorage **`authToken`** (a JWT of about 2,800 characters; claims carry the user's
  email, role `VannBrosTeam` and `Permission`s). It lasts about a day (the 2026-10-20 one expires 2026-10-21 15:11 UTC).
- **Tokens come from a person.** Login is email + password + an emailed 2FA code, so don't script
  `/api/identity/token*`. Where the client looks, first match wins:
  1. the `BURQ_API_TOKEN` env var;
  2. `playwright/.auth/vannbros_qa_burq_token.txt` (gitignored), one line, `Bearer ` prefix optional.
- **Fresh token:** sign in (`pnpm auth:burq` or by hand), then copy `authToken` from DevTools → Application → Local
  Storage → `https://vannbros-qa.burqio.site`, or from the `authToken` origin entry in `.auth/burq-qa.json`, into the
  token file. Never print or commit it.
- On a 401, run `node scripts/burq.mjs check` (expiry, no call, no token printed) and ask for a fresh token. Don't retry.
- In a live `playwright-cli` session you can still call the API from the page (`run-code` → `page.evaluate(fetch…)`
  with the localStorage token), which keeps the token in the browser.

### Read-only client: `scripts/burq.mjs`

```bash
S=.claude/skills/vannbros-burq/scripts
node $S/burq.mjs check                                        # token expiry + user, no call
node $S/burq.mjs packets 110 --status 3 --size 10              # Transactions rows for a dataflow (errors only)
node $S/burq.mjs packets 110 --search HT-290-JJZIQ-26 --full   # with the parsed GET/POST/UPDATE run record
node $S/burq.mjs get /api/v1/DataPacket/dataPackets Id=4711    # one packet by its ID column
node $S/burq.mjs get /api/v1/Dataflows/options WorkspaceId=12
node $S/burq.mjs get /api/v1/CrossRefs/types                   # YHS_GROWER, YHS_FIELD, YHS_VARIETY, …
```

- GET only. It refuses non-QA hosts and the **side-effecting GETs**: `DynamicMapping/SaveJson`, `Webhook/generate/*`,
  `Notification/SkipNotifications`, `identity/user/confirm-email`, `ConnectorScaling/test-*`, `AzureAd` (returns a
  credential) and `/connect/*`.
- Every POST / PUT / DELETE is off-limits for QA: they resync or re-queue packets (`PUT DataPacket/{Id}`), start or stop
  dataflows, change cron, cross refs, connections, users and settings, or scale connector pods.
- Useful reads: `DataPacket/dataPacketsByParentId`, `/dataPacketsCountByStatus`, `/dailyErrorGroups`,
  `PacketLogs/ByMessageId`, `Logs/ByMessageId`, `DebugLogs/FilteredDebugLogs`, `Dataflows/{id}` (cron, steps),
  `Dataflows/{id}/orchestration`, `CrossRefs/all` (about 6,200 source ↔ destination id pairs; filter client-side).

### Refreshing

```bash
.claude/skills/vannbros-burq/scripts/refresh.sh            # download + regenerate
.claude/skills/vannbros-burq/scripts/refresh.sh --offline  # regenerate from the local copy
```

`refresh.sh` downloads `https://vannbros-qa.burqio.site/swagger/v1/swagger.json` (no auth needed), checks it is
Swagger 2.0, then runs `scripts/generate.mjs` (Node ≥ 20, no dependencies). It warns about tags missing from
`scripts/tag-summaries.json`; add a one-liner for each. Reference files for removed tags are deleted.

Burq also serves an MCP endpoint with OAuth (`/connect/*`, `/.well-known/oauth-protected-resource/mcp`). This skill
doesn't use it; the token file and `burq.mjs` cover QA reads.

## Known findings (QA, 2026-10-19, Harvest Central 19 = field 290 / NONPAREIL)

- **Wrong transport data in WMS: the Farm App sends wrong external refs (ADO #26706).**
  - Packet 4711 (Farm 977, HT-290-JJZIQ-26 → WMS 6073) sent fleet 104, driver 8, truck 12, trailers 17/16. The ticket's
    own fleet, driver, truck and trailers are Valley Farm Transport (WMS 82), Chavez, Antonio, 9F33028 (WMS 6) and TRL-104/103.
  - Packet 4717 (Farm 696, HT-290-40N8N-26 → WMS 6077) sent 44 / 87 / 175 / 3280, while the correct WMS ids are 22 / – / 169 / 3154.
  - The offsets are constant per entity. These records predate Burq: the WMS rows are `SEED_DRV_20260630` / `SEED_20260630`,
    and only 33 drivers and 2 fleets ever went through Burq. So the bad cross-refs come from the 2026-06-30 seed, not from the live flow.
  - **Scope (2026-10-20, against AgriAdmin, the master for these ids):**
    - The Farm App holds most records twice: a seed copy (low ids, fleets with `code: null`) and a Burq copy (high ids).
    - The pickers choose the seed copy first. Of 28 distinct tickets that ever synced, 24 sent a wrong fleet and truck;
      the 3 on Burq copies were right.
    - Details: `vannbrosphasetwo-yhs` → `references/agriadmin.md`, FINDINGS #75.
- **No fleet, no sync (ADO #26707).** Packet 4714 (Farm 711, HT-290-SC57Y-26) failed with `'Fleet External Ref Id' must not be empty.`
  The ticket stays `wmsSyncStatus 1`, and the Farm App shows no error.
- **Manual ticket length (ADO #26709).** Packet 4710 (Farm 576) failed with `'Fleet External Ref Id' must not be empty.; The length of
  'Manual Ticket Number' must be 50 characters or fewer. You entered 61 characters.` (both rules, per the API on 2026-10-20). The Farm
  App accepts up to 64 (ADO #26704).
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

## Tag index

<!-- BEGIN TAG INDEX (generated) -->
_40 tags · 183 operations · 158 paths · 300 definitions · spec sha256 `c0b02e915e2b`_

| Tag | Ops | What it covers |
|---|---|---|
| [Account Management](reference/Account-Management.md) | 4 | Own account: update profile, change password, profile picture (read/upload). |
| [Aggregate](reference/Aggregate.md) | 1 | Aggregated data query. |
| [Application Management](reference/Application-Management.md) | 3 | Apps (connected systems) — list, categories, configurations. |
| [AppServices](reference/AppServices.md) | 4 | App services (the connector services behind dataflows) — list, read, create, delete. |
| [Audit Trails](reference/Audit-Trails.md) | 1 | Audit trail records — paged, filtered (`/AuditTrails/ByAll`, the Audit Trails screen). |
| [Audit Utilities](reference/Audit-Utilities.md) | 2 | Current user's audit records and Excel export. |
| [Authentication](reference/Authentication.md) | 4 | Token login (`/api/identity/token`), verify / resend the 2FA code, refresh. Don't script these; use the token file (see SKILL.md). |
| [Authorization](reference/Authorization.md) | 3 | OAuth authorization endpoint (consent / code), used by the Burq MCP connector. |
| [AzureAd](reference/AzureAd.md) | 1 | Azure AD token for the tenant (returns a credential; don't call). |
| [Batch History](reference/Batch-History.md) | 2 | Message counts per dataflow by status for a time window. |
| [Cache](reference/Cache.md) | 3 | Cache status; clear all or one key (DELETE, writes). |
| [ClientRegistration](reference/ClientRegistration.md) | 1 | OAuth dynamic client registration (MCP connector). |
| [Connection Management](reference/Connection-Management.md) | 7 | Connections (credentials + endpoints per app) — list, by app, read, create, update, delete, test. |
| [Connector Configuration](reference/Connector-Configuration.md) | 6 | Tenant connector settings (GET + PUT): email quota, batch summary email, dataflow resync. |
| [ConnectorScaling](reference/ConnectorScaling.md) | 5 | Connector pod deployments: names, status, test, scale (scale is a write). |
| [CrossRefs](reference/CrossRefs.md) | 13 | Cross references (source id ↔ destination id per type, e.g. YHS_FIELD) and their rules — list, types, export, add/update/delete. |
| [Dashboard](reference/Dashboard.md) | 1 | Home dashboard statistics. |
| [Data Packet Management](reference/Data-Packet-Management.md) | 11 | Data packets (the Transactions grid): Elasticsearch search (`dataPackets`, filter by `Id`, `ServiceIds`, `Status`, `SearchString`), children by parent, counts over time / by status, daily error groups and report; PUT status / data (writes). No GET by id. |
| [Database Health](reference/Database-Health.md) | 1 | Message counts grouped by status and dataflow (monitoring). |
| [Dataflow Management](reference/Dataflow-Management.md) | 31 | Dataflows: list, options, manage, read, configurations, transformations, orchestration, system jobs; start/stop, cron, copy, import/export (writes). |
| [DebugLogs](reference/DebugLogs.md) | 3 | Debug logs (Info/Debug/Error) — all, filtered, count since a time (Debug Logs screens). |
| [DynamicMapping](reference/DynamicMapping.md) | 4 | JSON mapping editor: read maps and metadata; `SaveJson` (a GET that writes) and `SaveJsonAtaQuery`. |
| [Email Configurations](reference/Email-Configurations.md) | 5 | Email delivery profiles — list, create, update, delete, activate. |
| [Feature](reference/Feature.md) | 1 | Feature flag status. |
| [Health Monitoring](reference/Health-Monitoring.md) | 1 | Overall success percentage of transactions. |
| [Logs Management](reference/Logs-Management.md) | 3 | Per-dataflow / per-message / per-workspace processing logs. |
| [Meta Information](reference/Meta-Information.md) | 1 | App meta: version, build, system info. |
| [Notification Management](reference/Notification-Management.md) | 3 | In-app notifications — count, list, skip. |
| [OAuthSession](reference/OAuthSession.md) | 2 | Pending OAuth request details for the consent screen (MCP connector). |
| [Packet Logs](reference/Packet-Logs.md) | 4 | Packet logs (Packet Logs screens) by correlation id, message id, id, or filtered/paged. |
| [PowerBi](reference/PowerBi.md) | 1 | Power BI report embedding. |
| [ProtectedResourceMetadata](reference/ProtectedResourceMetadata.md) | 2 | OAuth protected-resource metadata for the MCP endpoint. |
| [Role Claim Management](reference/Role-Claim-Management.md) | 5 | Role claims and registered permissions. |
| [Role Management](reference/Role-Management.md) | 7 | Roles and their permissions — CRUD. |
| [System Information](reference/System-Information.md) | 2 | Version info (app and JSONata playground). |
| [Testing](reference/Testing.md) | 3 | Ping (no auth), server info, Swagger redirect. |
| [User Management](reference/User-Management.md) | 15 | Users — list, search, filter, read, roles, export, CRUD, confirm email. |
| [User Preferences](reference/User-Preferences.md) | 1 | Save the current user's UI preferences. |
| [Webhook Management](reference/Webhook-Management.md) | 2 | Generate an inbound webhook URL per dataflow (a GET that writes) and receive webhook posts. |
| [Workspace Management](reference/Workspace-Management.md) | 14 | Workspaces: list, options, manage, read, CRUD, import/export, cloud copies. |
<!-- END TAG INDEX -->
