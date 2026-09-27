# Shared API conventions

Split out of `../SKILL.md` to keep it short; read when the task needs it.

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

