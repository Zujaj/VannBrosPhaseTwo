# YHS Receiving ↔ AgriERP Harvest Central

How a harvest ticket captured in the Farm App (**Harvest Central**, `https://agrierp-vann-qa.folio3.site/harvest-central`)
becomes a received load in **AgriWMS Receiving** at YHS (`https://vann-wms-qa.agrierp.com/receiving`), and how the
weight comes back. The Farm App side is in the knowledge skill's `references/harvest-central.md`; this file covers only the link.

> **Provenance.** Four sources, kept apart:
> - **Live QA, 2026-10-19.** Farm App `GET /api/harvestcentral/17` (as admin) and the WMS web UI. WMS data calls were
>   blocked (404 user-not-provisioned, see `agriwms.md` §0), so **no ticket has yet been traced end to end**.
> - **Farm App Swagger.** `WMSIntegration` tag (`vannbrosphasetwo-vann-api-qa`, `reference/WMSIntegration.md`).
> - **AgriWMS PSD V1.2.** `agriwms.md` §3 and §12.
> - **AgriERP Harvesting PSD v2.** Via `harvest-central.md`.

## Verdict

**Yes, they are interlinked.** Evidence by strength:

1. **Live data model.** Each Farm App ticket carries `hullingLocation: "YHS"` and `wmsSyncStatus`. It has
   `actualQuantity` and `actualQuantityReceivedAt`, both `null` until YHS weighs the load. Ticket 550 shows this:
   `HT-150-GQ2RW-26`, field 150 / MONTEREY, `wmsSyncStatus: 1`.
2. **Live form parity.** The WMS **Create Field Ticket** form asks for the same load facts as the Farm App ticket.
   Both have `Manual Ticket #`, Split / Last Load, Driver, Truck, Front / Back trailer plate and Carrier (= Farm App
   Fleet). See the mapping below.
3. **Same platform.** Both apps sign in through `agrierp-authgateway-qa-api.folio3.site`, under client
   `Vann Brothers - QA` (WMS company `YHS`).
4. **Swagger.** The Farm App exposes `/api/WMSIntegration/*` endpoints for AgriWMS to call.
5. **AgriWMS PSD.** For an *intercompany grower*, the Front Office "selects Harvest Ticket (synced via AgriERP)" instead of
   creating one. On `Completed`, "The system updates the quantity in harvest ticket" in AgriERP, and posts an inventory adjustment in F&O.

## Sync contract (Farm App `WMSIntegration` endpoints, called by AgriWMS)

| Direction | Endpoint | Body / params | Meaning |
|---|---|---|---|
| Farm App → WMS (pull) | `GET /api/WMSIntegration/harvest-tickets` | `ModifiedAt`, `LastId`, `Page`, `Limit`, `OrderByFieldName`, `IsASC` | WMS polls new or changed tickets (incremental by modified time / last id) |
| WMS → Farm App | `PATCH …/harvest-tickets/{ticketId}/mark-as-synced` | `{ wmsTicketRefId }` | WMS stores its own ticket id on the Farm App ticket |
| WMS → Farm App | `PUT …/harvest-tickets/{ticketId}` | `{ actualQuantity, manualTicketNumber, capturedAt }` | Weight (net) and capture time come back; Farm App shows Actual Weight |
| WMS → Farm App | `POST …/harvest-tickets/{ticketId}/void` | — | Ticket voided at YHS |
| Farm App → WMS | `GET …/harvest-tickets/attachments` | — | WMS pulls the ticket photos |
| WMS → Farm App | `POST …/harvest-tickets/{ticketId}/attachment`, `DELETE …/attachment/{attachmentId}` | `WMSAttachmentPushAPIModel` | Weight certificate and other YHS documents |
| WMS → Farm App (master data) | `POST /api/WMSIntegration/fleets`, `/drivers`, `/trucks`, `/trailer-plates` | `{ refId, name/code…, isActive }` | WMS owns Carriers / Drivers / Trucks / Trailers (PSD: "exist only in WMS"); the Farm App's pickers are fed from here |

**Confirmed live (2026-10-19): the caller is Burq.io, not WMS.** Burq's `YHS_AGRIERP` workspace polls every minute.
- `YHS_HarvestTickets_AGRIERP` does GET harvest-tickets → POST the WMS field ticket → mark-as-synced.
- `YHS_TicketsWeight_AGRIERP` sends the weight back.
- `YHS_Drivers/Fleet/Trucks/Trailers_AGRIERP` push WMS master data, with each WMS id as the Farm `…ExternalRefId`.

Each attempt is a data packet whose GET payload and error text you can read. Use it to tell whether a bad value came from the
Farm App or from WMS. See the **`vannbros-burq` skill**, which also lists the known sync errors: wrong seeded external refs, an
empty fleet ref blocking sync, and the 50-character manual-ticket limit.

## Field mapping (live Farm App ↔ live WMS form)

| Farm App ticket (API / UI) | WMS Field Ticket (live label) | Notes |
|---|---|---|
| `ticketNumber` (`HT-<field>-<rand>-<yy>`) | `Ticket #` | Not yet seen whether WMS keeps the HT number or issues its own (`wmsTicketRefId`) |
| `manualTicketNumber` | `Manual Ticket #` | Paper-ticket cross-reference in both |
| `seasonName` (`Crop Year 2026`) | `Crop Year *` | |
| `growerName` / farm | `Grower Name *` | Grower master data from Grower's Portal in both |
| `fieldName` (`150`) | `Field # *` | |
| `varietyName` (`MONTEREY`) | `Variety Selection *` | |
| `hullingLocation` (`YHS`) | WMS company `YHS` | |
| — | `Handler *` | Farm App PSD: GP field `handler` (`VFO`) |
| `isSplitLoad` + `splitLoadOption` (Front / Rear) | `Split Load` | |
| `isLastLoad` | `Last Load` | |
| — | `Single Load`, `Total Trailers` | WMS only |
| `fleetID` / `fleetName` | `Carrier *` | |
| `driverID` / `driverName` | `Driver Name *` | |
| `truckID` / `truckLicensePlate` | `Truck License # *` | |
| `frontTrailerPlateID` / `rearTrailerPlateID` | `Front Trailer License #` / `Back Trailer License #` | Farm App says **Rear**, WMS says **Back** |
| `standardQuantity` (e.g. 44000) | — | Farm App estimate only |
| `actualQuantity` (read-only, "`Awaiting YHS`") | `Net Weight` (= Gross − Tare) | Returned on WMS `Completed` |
| `attachments` | `Attachments` | Both directions |
| — | `Product Type` (`Field Run Almonds` / `Rejects`), `Farming Type` | WMS only |

## Status lifecycle across both systems (expected, not yet traced live)

| Step | Farm App (Harvest Central) | AgriWMS Receiving |
|---|---|---|
| Planned on web | ticket `Set on site`; Actual Weight blank | — |
| Captured on mobile / web (truck leaves field) | ticket saved; `wmsSyncStatus` pending → synced | ticket appears (intercompany "synced via AgriERP"), status `Planned` |
| Gross weighed, stockpile assigned | — | `Assigned` (stockpile ticket printed) |
| Stockpile QR scanned on tablet | (PSD: `Received`) | `Field Validation Complete` |
| Tare weighed, weight certificate | `Completed` chip; Actual Weight filled; read-only, can't delete | `Completed`; F&O inventory adjustment |
| Posted to project | `Posted` (needs linked project) | — |
| Voided at YHS | void pushed back | `Voided` |

The enum values behind `wmsSyncStatus`, `status`, `ticketState` and `postingStatus` are **not mapped yet**. Ticket 550 has
`status 1`, `wmsSyncStatus 1`, `postingStatus 1` and `ticketState 2`.

## How to verify end to end (once the WMS user is provisioned)

1. Farm App QA: capture a ticket for a YHS field (web `Add New Ticket` or mobile). Note `HT-…` and the API `id`.
2. Read `GET /api/harvestcentral/{headerId}` and check that `wmsSyncStatus` changes once WMS has pulled the ticket.
3. AgriWMS QA `/receiving`: search for the ticket by grower, field or variety. Check that the fields match the mapping table above.
4. Only with dev's OK on QA: capture gross, assign a stockpile, validate on tablet and capture tare. Then confirm the Farm App
   shows Actual Weight = WMS Net Weight and the `Completed` chip, and that edit and delete are blocked.
5. Void on one side and check the other.

Delete only test tickets you created, and only while the Farm App still allows it (before YHS `Completed`).

## Open questions

1. What makes a grower "intercompany" (PSD term)? Likely Vann-owned growers (GP company 260, contract `Y…` = YHS), but this is unconfirmed.
2. Does WMS keep the Farm App `HT-…` number as its `Ticket #`, or does it issue its own? (Spec example `5413-9825`.)
3. What do the `wmsSyncStatus` enum values mean, and which UI label does each map to?
4. Is the WMS `Received` state (Farm App PSD) the same as `Field Validation Complete`, or is it gross capture?
5. Is the returned `actualQuantity` the net weight in lbs? Is it overwritten or added to for split loads?
