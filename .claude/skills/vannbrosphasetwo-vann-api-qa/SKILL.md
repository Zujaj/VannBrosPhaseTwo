---
name: vannbrosphasetwo-vann-api-qa
description: >-
  REST API reference for the VannBrosPhaseTwo QA backend (Vann Brothers tenant) at
  agrierp-vann-api-qa.folio3.site — every endpoint, parameter, and request
  schema from its Swagger spec, split by tag (WorkOrder, Activity, Metadata,
  HarvestCentral, Attendance, User, Role, Form, …). Use whenever a task calls,
  scripts, seeds, cleans up, or asserts against VannBrosPhaseTwo data through the API
  instead of the UI — e.g. "look up a work order by sequence number", "delete
  seed leftovers", "what body does POST /api/WorkOrder take", "which endpoint
  lists harvest tickets", extending playwright/api/*.mts or playwright/scripts/,
  or checking a UI result against the backend. Also covers auth (Bearer token
  from a person), pagination, error shapes, and ID conventions.
  
---

# VannBrosPhaseTwo QA API (Vann Brothers)

Swagger 2.0 spec exported by NSwag (`VannBrosPhaseTwo API` v1.0.0). Local copy:
`openapi.json` in this skill's folder. Live UI: <https://agrierp-vann-api-qa.folio3.site/swagger>.

- **Base URL:** `https://agrierp-vann-api-qa.folio3.site`. Every route starts with `/api/`
  (e.g. `GET https://agrierp-vann-api-qa.folio3.site/api/WorkOrder`).
- **Host:** QA only. `playwright/api/client.mts` refuses any base that isn't a
  `vannbrosphasetwo-*qa*.folio3.site` host. Keep that rule.
- **Existing client:** `playwright/api/client.mts` (`ApiClient`: `get`, `post`, `delete`),
  `playwright/api/work-orders.mts` (lookup/delete), and `playwright/api/planned-work-order.mts`
  (builds the exact `POST /api/WorkOrder` body the web form sends, used by
  `pnpm seed:planned --api`). These are ESM `.mts` files, so scripts can import them but
  the CommonJS specs can't. Extend them rather than calling `fetch` by hand.

## How to use this skill

1. Find the tag in the index at the bottom, then open `reference/<Tag>.md`. To go from a
   path to its tag, `grep -l '`/api/Foo/bar`' reference/*.md`.
2. Each reference file lists every operation's method, path, operationId, parameters (with
   the location, type, whether it is required, whether it can be null, and any default) and
   request body. Below that are the schemas those operations use, two levels deep: `allOf`
   is flattened, the required fields are listed, and enums show value → name. Links to
   deeper types point into `reference/_schemas.md`, which holds all definitions and is about
   325 KB. Don't read that file whole; use
   `grep -n 'id="schema-<lowercase name>"' reference/_schemas.md` and read from that line.
3. **Responses are not described in the spec.** NSwag typed every response as
   `file`, so use the shapes below (observed on the live API) and read unfamiliar ones
   defensively (see `rowsOf` / `pick` in `work-orders.mts`).
4. Never hand-edit `reference/*.md` or the index block. Run `scripts/refresh.sh` to
   re-download the spec and regenerate. Only the prose in this file and
   `scripts/tag-summaries.json` are hand-written.

## Authentication

- Security scheme `ApiAuthentication`: an API key in a header. Send
  `Authorization: Bearer <token>`. It applies to **every** operation.
- **Tokens come from a person, not from code.** The token that works is the web app's
  **Firebase ID token**, a JWT of about 1,125 characters, which the user pastes in.
- **Don't use `POST /api/Auth/signin`.** Its body is `SignInAPIModel` (`email`, `password`,
  `rememberMe`). It returns a short base64 token that looks right but gets 401 on every
  endpoint (checked 2026-09-17), and it issues one even for a wrong password.
- **Don't mint or refresh tokens yourself** from `.auth/*.json` sessions or the auth gateway.
  Ask the user for a fresh token.
- Where the client looks for the token, first match wins:
  1. the `VANNBROSPHASETWO_API_TOKEN` env var;
  2. the file `playwright/.auth/qa_refresh_token.txt`, which is gitignored and holds just the token.
     A JSON object with a `token` field is accepted in that file too, so either way of saving it
     works.

  Either may include the `Bearer ` prefix or leave it out. `VANNBROSPHASETWO_API_BASE` overrides the
  base URL, and it still has to be a QA host.
- The token lasts about an hour.
- **Fetching a fresh token** (the user does this, in their browser):
  1. Log in to `https://agrierp-vann-qa.folio3.site/` with `rffcropplanner` and open the QA site.
  2. Open the browser console, go to the **Network** tab and filter to **Fetch/XHR** so it starts
     recording requests.
  3. Visit any existing work order, e.g. `https://agrierp-vann-qa.folio3.site/workorders/31293`.
  4. In the Network tab, open the `31293` request and copy the token from the request's headers
     (`Authorization: Bearer <token>`).
  5. Save it as a single line in `playwright/.auth/qa_refresh_token.txt`, or export it as
     `VANNBROSPHASETWO_API_TOKEN`.
- **On a 401 with an empty body, check the token first.** The token is missing, expired, or
  the wrong kind. Without printing it, check that it is a single line with three `.`-separated
  parts and that its `exp` claim is in the future. Then ask for a fresh token. Don't retry the
  call, and never print or commit the token.
- `GET /api/Hello/Echo` answers 200 even without a valid token, so it is a liveness check
  only. It doesn't prove the token works; use a cheap authed GET for that, e.g.
  `GET /api/Crop?Page=1&Limit=1`.

## Shared conventions

**Route casing.** Routes are mostly PascalCase (`/api/WorkOrder/{id}/Detail`), with some
lower/camel-case exceptions (`/api/attendance/approvals`, `/api/Activity/blocks`,
`/api/HarvestCentral/tickets`). Copy each path exactly from the reference file.

**Pagination.** The list endpoints take the query params `Page` (1-based), `Limit`,
`OrderByFieldName`, and `IsASC` (about 95 operations).
- The paged response envelope, observed on `GET /api/Crop` and `GET /api/WorkOrder`:
  ```json
  { "data": [ … ], "page": null, "count": 2, "recordsTotal": 5 }
  ```
  - `count` is the number of rows in this page.
  - `recordsTotal` is the total across all pages.
  - `page` came back `null`, so don't rely on it.
- **Not every list is paged.** `GET /api/Season?Page=1&Limit=1` returned a **bare array** of
  both seasons. Handle both an array and `{data}`.
- A few endpoints use their own names for these params: `page`/`limit` with defaults 1/10 on
  `/WorkOrder/{id}/HourLogChangeRequests`, and `pageNo`/`pageSize` on
  `/WorkOrder/HourLogChangeRequests/{requestId}/ExistingHourLogs`.
- Some lists take the filter as a POST body instead of query params (`*Filter*APIModel`, e.g.
  `POST /api/Activity/Filter`, `POST /api/Cultivation/GetPaginated`,
  `POST /api/Operation/GetByFilter`).

**Scoping.** Many lists are scoped the way the web app scopes them.
- `GET /api/WorkOrder` needs `LocationID` (Site) and `SeasonID`, plus `Category`.
  - Colusa / Crop Year 2026 is `LocationID=2&SeasonID=13&Category=1`.
  - Filtering by `Name=` is very slow (over 60 s). Use `SequenceNo=` where you can.
- Those params are marked *non-nullable*, but the spec doesn't mark them required. If you
  leave them out, the server binds `0` and the list silently comes back empty or wrong.
- **By-id routes are scoped too.** `GET /api/WorkOrder/{id}/Summary` takes `locationId` and
  `seasonId` as query params (lowercase here, unlike the list's `LocationID`/`SeasonID`).
  Omit them and the bound `0` fails validation with **403** and
  `"Selected site is not valid for this work order!"` — the work order is fine; the scope is
  missing. Pass the same scope you listed it with (checked 2026-09-19 on WO-1269/WO-1270).

**Query arrays.** Array query params use `collectionFormat: multi`, so repeat the key:
`?CropVarietyIDs=1&CropVarietyIDs=2`.

**IDs.**
- **Numeric IDs.** Internal IDs are **int64** (`id`, `workOrderID`, `farmID`, …; 226 of the 229
  path IDs). They are what path params like `/api/WorkOrder/{id}` take.
- **String IDs.** A few path IDs are strings (`/api/Enum/{name}`,
  `/api/Notification/FCMToken/{userID}/{deviceUUID}`).
- **Display identifiers are separate string fields.** Examples: `sequenceNo` (`WO-1221`), and
  `code` (`"00887"` for a crop, `"130"` for a field). Resolve a display ID to its `id` with a
  list filter before calling by-id routes; `work-orders.mts` `findBySequence` does this.
- **Base fields.** Most models extend `BaseAPIModel`: `id`, `name`, `createdBy`,
  `modifiedBy`, `isDeleted`. `id`, `createdBy`, `modifiedBy` and `isDeleted` are required in
  request bodies. Send `id: 0` on create.

**Enums** are sent as integers. The reference schemas list value → name
(`WorkOrderStatus`: 1 Draft, 2 To Do, 3 In Progress, 4 Review, 5 Done, 6 Queue). Responses
often carry both the number and a name (`status: 3`, `statusName: "In Progress"`). The
`GET /api/Metadata/*` lookups return `[{ "text": "Draft", "value": 1 }, …]`.

**Dates.**
- Most date fields are ISO strings with **no offset**, e.g. `"2026-09-19T18:59:59"`.
- Some fields also have a UTC twin with a `ZFormat` suffix, e.g.
  `dueDateZFormat: "2026-09-19T18:59:59.0000000Z"`. Prefer the `ZFormat` field when it
  exists.
- Unset dates can come back as the sentinel `1900-01-01T12:00:00`.

**JSON.** Bodies are sent as `application/json`, and responses use camelCase.

**Errors.** There are three shapes:

| Status | When | Body |
|---|---|---|
| 401 | Token missing, expired, or malformed | empty |
| 400 | Model binding / validation of params (e.g. `GET /api/Crop/abc`) | `application/problem+json`: `{ type, title, status, errors: { field: [msg] }, traceId }` |
| 404 / app errors | Thrown by the application (e.g. `GET /api/Crop/999999999`) | `{ "validationError": null, "errorMessage": ["…NotFoundException…"], "adjustmentErrors": null }` |

A route that exists but not for this method returns **405** with an empty body. The spec
only declares `200` for every operation, so treat any non-2xx as an error and surface its body
(`ApiError` in `client.mts` does).

**Mutations hit a shared tenant.** QA is shared, so there's no teardown and no sandbox.
- Stick to GETs unless the task needs to write. The exception is `POST` filter endpoints,
  which only read.
- Before any create/update/delete, confirm with the user and say exactly what will change.
- `Hello/BulkWorkOrders/{count}` and `Hello/BulkActivityTemplates/{count}` create data in
  bulk, so don't call them casually.
- For deleting work orders, use `pnpm wo:delete` (a dry run unless you pass `--yes`).
- Known trap: a large `POST /api/workOrder` can hang and still create duplicates (see
  `playwright/test-plans/FINDINGS.md`).

## Refreshing

```bash
.claude/skills/vannbrosphasetwo-vann-api-qa/scripts/refresh.sh            # download + regenerate
.claude/skills/vannbrosphasetwo-vann-api-qa/scripts/refresh.sh --offline  # regenerate from the local copy
```

`refresh.sh` downloads `https://agrierp-vann-api-qa.folio3.site/swagger/v1/swagger.json`
(no auth needed) and checks that it is Swagger 2.0 before overwriting
this skill's `openapi.json`. Then it runs `scripts/generate.mjs` (Node ≥ 20, no dependencies).
- **New tags:** the generator warns about tags missing from `scripts/tag-summaries.json`. Add a
  one-liner for each.
- **Removed tags:** their reference files are deleted.

## Tag index

<!-- BEGIN TAG INDEX (generated) -->
_72 tags · 558 operations · 460 paths · 415 definitions · spec sha256 `ba59ef18ae04`_

| Tag | Ops | What it covers |
|---|---|---|
| [ActionQueue](reference/ActionQueue.md) | 3 | Queued background actions (sync jobs) — list, read, and patch status (Pending/Retry/InProgress/Success/Error). |
| [Activity](reference/Activity.md) | 42 | Planned activities (work-order blocks): CRUD, filtering, unplanned/harvest-central blocks, hour logs, tags, forms, and per-activity materials/problems/operations/resources. |
| [ActivityTemplate](reference/ActivityTemplate.md) | 5 | Activity (work-order) templates — list, create, read, update, and their materials. |
| [Asset](reference/Asset.md) | 1 | Asset list (equipment assigned to work orders). |
| [Attachment](reference/Attachment.md) | 1 | Attachments looked up by owning entity. |
| [Attendance](reference/Attendance.md) | 24 | Clock-in/out attendance: lists, detail, today, save/bulk save, approve/unapprove, breaks, shifts, reports, productivity and job stats. |
| [AttendanceApprovals](reference/AttendanceApprovals.md) | 8 | Attendance adjustment approval requests — list, request, save/update (single and bulk), history. Routes are lowercase `/api/attendance/approvals`. |
| [Auth](reference/Auth.md) | 3 | Sign-in (`/signin`, `/powerbi`). Tokens issued here do not work on QA — see SKILL.md Authentication. |
| [Break](reference/Break.md) | 4 | Break definitions — list, read, create, update. |
| [ColorRangeSettings](reference/ColorRangeSettings.md) | 1 | Map colour-range settings. |
| [Connection](reference/Connection.md) | 1 | Dynamics/integration connections list. |
| [Crop](reference/Crop.md) | 5 | Crops and crop varieties — list, read, dropdown list. |
| [Cultivation](reference/Cultivation.md) | 10 | Cultivations (crop on a field for a season): CRUD, paginated/filtered lists, info, end cultivation, change crop/item. |
| [Customer](reference/Customer.md) | 2 | Customers — list and read. |
| [Dashboard](reference/Dashboard.md) | 1 | Dashboard data. |
| [DataImport](reference/DataImport.md) | 4 | Bulk import helpers: fields per farm, activities per cultivation, field geo-coordinates, farm cultivations. |
| [Dynamics365](reference/Dynamics365.md) | 1 | Read a Dynamics 365 record by id. |
| [ELKLog](reference/ELKLog.md) | 2 | ELK logs and API packet logs (integration monitoring). |
| [Enterprise](reference/Enterprise.md) | 6 | Enterprises — CRUD and status toggle. |
| [Enum](reference/Enum.md) | 1 | Resolve a server enum by name (`GET /api/Enum/{name}`). |
| [EventTrail](reference/EventTrail.md) | 1 | Event trail (audit) list. |
| [Farm](reference/Farm.md) | 10 | Farms (sites' farms): CRUD, NDVI, metadata per location, farm cultivation, side navigation (deprecated). |
| [FeatureSet](reference/FeatureSet.md) | 1 | Tenant feature flags. |
| [Field](reference/Field.md) | 8 | Fields (plots): create, update, delete, coordinates, cultivations, activities on map, NDVI. |
| [FileExport](reference/FileExport.md) | 1 | Export a work order to a file. |
| [Form](reference/Form.md) | 15 | Inspection form templates and their input fields — CRUD, status toggles, submissions, field types. |
| [GanttChart](reference/GanttChart.md) | 1 | Planning Gantt chart data. |
| [Grower](reference/Grower.md) | 5 | Growers — list, all, read, create, update. |
| [HarvestCentral](reference/HarvestCentral.md) | 10 | Harvest Central: harvest blocks and harvest tickets — create, update, delete, plan, link project, post. |
| [HarvestId](reference/HarvestId.md) | 7 | Harvest IDs — CRUD, unallocated list, link/de-link. |
| [HarvestTicket](reference/HarvestTicket.md) | 6 | Harvest tickets (legacy route) — CRUD and post tickets. |
| [Hello](reference/Hello.md) | 6 | Diagnostics: `Echo` (liveness, works without a valid token), error/log tests, bulk test-data generators (mutating). |
| [HierarchyLevel](reference/HierarchyLevel.md) | 7 | Organisation hierarchy levels — CRUD, status, bulk save. |
| [HierarchyNode](reference/HierarchyNode.md) | 7 | Organisation hierarchy nodes — CRUD, tree, bulk save. |
| [HistoryLog](reference/HistoryLog.md) | 2 | Entity change history — list and read. |
| [IrrigationMethod](reference/IrrigationMethod.md) | 4 | Irrigation methods — list, read, create, update. |
| [IrrigationSource](reference/IrrigationSource.md) | 4 | Irrigation sources — list, read, create, update. |
| [IrriSAT](reference/IrriSAT.md) | 1 | IrriSAT (satellite irrigation) data. |
| [Job](reference/Job.md) | 2 | Integration jobs — list per connection, update. |
| [Location](reference/Location.md) | 7 | Locations (Sites) — CRUD, resource's locations, tracking logs, all. |
| [Log](reference/Log.md) | 1 | Integration job logs. |
| [Map](reference/Map.md) | 3 | Map layers: cultivation, work-order, and observation details (POST filters). |
| [Material](reference/Material.md) | 8 | Materials — CRUD, paginated lists, certified resources, attachments. |
| [Message](reference/Message.md) | 6 | Integration messages — list, payload, request/response, stats, retry, history. |
| [Metadata](reference/Metadata.md) | 112 | Lookup lists for dropdowns (112 GETs): crops, operations, materials, resources, statuses, units, enums, notification metadata, WMS fleets/drivers/trucks. |
| [Notification](reference/Notification.md) | 17 | Notification placeholders, templates, event configs, and FCM device tokens. |
| [Observation](reference/Observation.md) | 4 | Observations / points of interest — list, read, create, update. |
| [Operation](reference/Operation.md) | 7 | Operations — CRUD, filtered and paginated lists, plan-change filter. |
| [PermissioningModule](reference/PermissioningModule.md) | 1 | Flat list of permission modules (for role editing). |
| [PlotField](reference/PlotField.md) | 2 | Plot fields — list and create. |
| [POICategory](reference/POICategory.md) | 5 | POI (observation) categories — CRUD. |
| [PreStartChecklist](reference/PreStartChecklist.md) | 1 | Pre-start checklist. |
| [Problem](reference/Problem.md) | 4 | Problems (pests/diseases) — list, read, create, update. |
| [ProductAttribute](reference/ProductAttribute.md) | 3 | Product (material) attributes — list, by material. |
| [Resource](reference/Resource.md) | 10 | Resources (people/equipment) — CRUD, types, certified resources, paginated list, site reassignment. |
| [ResourceGroup](reference/ResourceGroup.md) | 1 | Resource groups list. |
| [Role](reference/Role.md) | 7 | Roles — CRUD, enable, disable. |
| [Season](reference/Season.md) | 5 | Seasons (crop years) — list, all, read, create, update. |
| [Settings](reference/Settings.md) | 13 | Tenant settings: general, attendance, cloud functions, material filters, WO sequence, item-group mapping, Dynamics system. |
| [SettingsMapTogglesConfig](reference/SettingsMapTogglesConfig.md) | 3 | Map toggle configuration — list, read, update (under `/api/Settings/SettingsMapTogglesConfig`). |
| [Stage](reference/Stage.md) | 8 | Crop stages — CRUD and the operations attached to a stage. |
| [Team](reference/Team.md) | 3 | Teams — list, read, delete. |
| [User](reference/User.md) | 12 | Users — CRUD, enable/disable, role permissions, shift check, lookup by email, user settings. |
| [UserGroup](reference/UserGroup.md) | 6 | User groups — CRUD and status toggle. |
| [Variety](reference/Variety.md) | 2 | Varieties — list and read. |
| [Weather](reference/Weather.md) | 1 | Current weather by latitude/longitude. |
| [WeatherForecast](reference/WeatherForecast.md) | 1 | Weather forecast. |
| [WMSIntegration](reference/WMSIntegration.md) | 11 | WMS integration: push fleets/drivers/trucks/trailer plates; harvest tickets — list, update, void, mark synced, attachments. |
| [WMSLocation](reference/WMSLocation.md) | 3 | WMS locations — read, create, update. |
| [WorkOrder](reference/WorkOrder.md) | 54 | Work orders: CRUD, detail/summary, status change, recall, end, sync to Dynamics, hour logs and change requests, progress, harvest picks and forecasts, validation. |
| [WorkOrderInventory](reference/WorkOrderInventory.md) | 7 | Work-order inventory: list, meta, material dispatch/return (with validate). |
| [WorkOrderLine](reference/WorkOrderLine.md) | 7 | Work-order lines (blocks) — CRUD and material/hour-log/row history. |
<!-- END TAG INDEX -->
