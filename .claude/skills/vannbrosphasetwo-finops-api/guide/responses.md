# FinOps quirks and observed responses

Split out of `../SKILL.md` to keep it short; read when the task needs it.

## Quirks in the Postman folder

`reference/services.md` lists these under "Paths used by more than one request".

- **"F3AgriFarmOperationServices"** (plural) actually calls `F3AgriCropServices/get`, so it's a
  mislabelled copy. The real farm-operation read is **"F3AgriFarmOperationService"**
  → `F3AgriFarmOperationServices/get`.
- **"F3AgriProjectService CreateWBSLines"** posts the plot-field `create` body to
  `F3AgriPlotFieldServices/create`. It is a placeholder, not a WBS service. There's no known
  WBS-lines endpoint yet, so ask the team before assuming one.
- **"itemReturn Copy"** is the same endpoint with a different item (`00017`, qty 12.8). Its saved
  body is also cut off, missing its closing brackets.
- The raw bodies contain `//` comments (the plot-field one annotates each field's Farm App source).
  Postman strips those, but a real JSON client can't send them. Remove them first.
- A few requests set both the collection's bearer auth and an explicit `Authorization` header.
  They are the same token, so it's harmless.

## Observed responses

These were recorded on 2026-09-23 against VBS QA (`vb-qa-…devaos`), using `get` only with `DateTime`
2000 and `PageSize` 10000 unless noted. Add a dated entry when you call something new or when a
shape changes. Never include the token.

**Common to every `get`:**
- The response is a **bare JSON array**, with no wrapper and no total count. Paging doesn't work
  (see "Calling a service"), so one large call returns the whole set.
- Keys are **PascalCase**. This differs from the Farm App API, which uses camelCase.
- Every row ends in `RecId`, `ModifiedDateTime`, `CreatedDateTime`, `Name` and `Code`.
  - `Code` is the business key (item number, season year, resource ID…). Match the Farm App's
    `code` against it.
  - `RecId` is D365's int64 record ID, around 5.6e9. It is safe as a JS number.
- `"$id": "1"`, `"2"`, … appears on every object, nested ones included. It is Newtonsoft
  reference-preservation noise, so ignore it.
- Timestamps are UTC with a `Z`. Unset dates come back as the sentinels `1900-01-01T12:00:00` or
  `1900-01-01T00:00:00Z`.
- Enums come as pairs, a number plus a label (`OperationStatus: 1` with `OperationStatusName:
  "Certified"`).

| Service | Rows | Extra fields beyond the common ones | Notes |
|---|---|---|---|
| `F3AgriSeasonServices` | 16 | `StartDate`, `EndDate` | `Code` 2015–2030, `Name` "Crop Year 2015". Start and end dates are unset. |
| `F3AgriCropServices` | 6 | `ItemGroup` (`04`), `Unit` | Crops are items: 90000 FIELDRUN_ALMOND, 90001 WALNUT, 90002 PISTACHIO, 90003 RICE, 00887, 00910. Returns `[]` when `PageSize` < 100. |
| `F3AgriCropVarietiesServices` | 29 | `ItemId` (the crop's `Code`), `InventTableRecId` | `Code` is `VBS-0000xx`. All 29 are under crop `90000`. |
| `F3AgriMaterialServices` | 215 | `ItemGroup`, `Unit`, `UUOM`, `IsDispatchable` (0/1), `ConversionFactor`, `UnitOfMeasureClass` | `ItemGroup` 01 has 134, 03 has 57, 02 has 12, 06 has 12. 198 of them are dispatchable. `Code` is the item number, e.g. `00215`. |
| `F3AgriCropMaterialGroupServices` | 6 | — | These are item groups, matching `ItemGroup` on materials and crops: `01` Chemicals, `02` Soil Amendments, `03` Fertilizers, `04` Semi Finished Goods (crops), `05` Parts Inventory, `06` Liquid Fertilizers. |
| `F3AgriUOMServices` | 58 | `UnitOfMeasureClass` | `Code` is the unit symbol (`1/2 lb`, `gal`, `oz`). |
| `F3AgriFarmOperationServices` | 27 | `OperationType`/`OperationTypeName`, `OperationStatus`/`OperationStatusName` | Types: 0 Default, 2 Inspection, 3 Tank Mixing, 5 Harvest. Statuses: 0 Open, 1 Certified. `Code` is the operation ID, e.g. `1110`. |
| `F3AgriResourceServices` | 726 (2026-10-01) | `ResourceType`/`ResourceTypeId` (1 Human resources, 2 Machine), `ResourceGroupId`, `ResourceGroupRecId`, `CalendarId`, `UUOM` (`hr`/`ac`), `Worker`, `Vendor`, `ExternalRefId`, `DummyResource`, `WorkingHours`, `StandardHours` | 2026-10-01: 572 machines, 154 people. **Dummy resources come back here too**, with `DummyResource: true` and a `DM`-prefixed `Code` (e.g. `DM00001` "Labour 1", group `AO`, `UUOM` `hr`, `StandardHours` 5.5). |
| `F3AgriResourceGroupServices` | 693 rows, **6 distinct** | `ResourceGroupType`/`ResourceGroupTypeLabel` (1 Machine Operator (HR), 3 Implement, 4 Farm hand (HR)), `SiteId`, `SiteName` | **The rows fan out, one per resource in the group.** De-duplicate them by `RecId`. The groups are Cult, FH, Implement, MO, Machine and Tractors. |
| `F3AgriCustomerServices` | 1033 | `Addresses[]` of `{ Address, RecId, …, Name, Code: "" }` | `Code` is `C-000001`. A small `PageSize` returns fewer rows than asked for (50 gave 48). |
| `F3AgriProjectService` | 126 | `ProjectId` (`PRJ_…`), `ProjectName`, `CustomerId`/`CustomerName`/`CustomerRecId`, `SeasonId`/`SeasonRecId`, `Crop`/`CropRecId`, `PlotId`/`PlotRecId`, `OperationArea`, `StartDate`, `EndDate`, `WBSLines[]` | `Name` and `Code` are empty here, so key projects on `ProjectId`. Each `WBSLines[]` entry is `{ TaskId, TaskName, OperationId, Activity (VBS-…), Materials[], Resources[] of { ResourceId, UsageUOM, Quantity, ResourceRecId, ResourceGroupRecId, ActivityType } }`. Most projects have no WBS lines. `PlotId` is the field code, e.g. `130`. |
| `F3AgriWMSLocationServices` | 168 | `SiteId` (`01`), `SiteName` (`VBS`), `InventLocationId` (warehouse), `InventLocationName` | `Code` is the location, e.g. `130PMPSTN` (field 130 pump station), and `Name` is its type ("Bulk location"). 165 locations are in warehouse `0101` Vann Brothers Chemical Shed. The other three warehouses have one each: `0201` Staging warehouse, `0301` Parts Inventory, `0401` YHS Warehouse. |
| `F3AgriUnitOfConversion` | 404 | — | Not deployed on QA. |

These counts were a snapshot of QA on 2026-09-23. Use them for scale, not for assertions.

