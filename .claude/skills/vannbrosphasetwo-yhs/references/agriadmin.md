# AgriAdmin (YHS master data) and how it reaches Harvest Central

AgriAdmin is the YHS admin web app that owns the transport master data: **carriers, drivers, trucks and trailers**.
AgriWMS reads the same records, and Burq pushes them to the Farm App, where they fill the Harvest Central pickers
(Fleet, Driver Name, Truck License Plate, Front / Rear Trailer Plate).

Live-checked 2026-10-20, v1.2.2. **QA is read-only for us**, so never use `Add Carrier` or edit rows.

## Login and session

- URL `https://vann-admin-qa.agrierp.com`. Any route redirects to `/login` when signed out.
- Login is the same as AgriWMS: `PIN` → 6-digit keypad (click the digits) → `Select Configuration` → `YHS`. Card Scan is
  the alternative.
- PIN file: `playwright/.auth/yhs_agri_admin_credentials.json`, shape `{ QA: { url, Superadmin: { pin, configuration } } }`
  (template in `playwright/auth-templates/`), or the `YHS_AGRIADMIN_PIN` env var, which wins. Never print it. It signs in
  as `Anus Baig`.
- **Session: `pnpm auth:agriadmin`** (in `playwright/`, project `agriadmin-setup`, `tests/agriadmin/agriadmin.setup.ts`,
  helper `tests/helpers/agriAdminAuth.ts`). It writes `.auth/agriadmin-superadmin.json`, reusing a valid session or
  scripting the PIN, with a human fallback in the headed window. The probe checks that `/fleet-master` stays off
  `/login` after the app boots. The session lives in localStorage (`isAuthenticated`, `agriadmin_session`,
  `agriadmin_user`).
- `playwright-cli`: `-s=adm open --browser=firefox`, `state-load .auth/agriadmin-superadmin.json`, then `goto`.
- URLs: `AGRIADMIN_QA_BASE_URL`, `agriAdminRoutes`, `agriAdminUrl()` in `playwright/tests/constants/routes.ts`.

## Screens

Left nav: `Master Data` → **`Fleet Master`** (`/fleet-master`), `Users`, `Labels`, `Number Sequences`, `Logout`.

Fleet Master has the tabs `Carriers · Drivers · Trucks · Trailers`, plus `Add Carrier`. The Carriers grid columns are
`NAME · CONTACT · PHONE · ADDRESS · WEB ADDRESS · EMAIL`.

## API (auth gateway, Bearer from the session)

`GET https://agrierp-authgateway-qa-api.folio3.site/api/v1/{carriers|drivers|trucks|trailers}?pageNumber=1&pageSize=500&sort=…`

- The envelope is `{ success, data: { items, pageNumber, pageSize, totalCount, totalPages, … }, message, errorCode }`.
- Record fields:
  - **carrier:** `id, name, contactName, address{…}, phoneNumberInfo{…}, webAddress, email`;
  - **driver:** `id, name, licenseNumber, address, phoneNumberInfo`;
  - **truck:** `id, licensePlate, defaultTareWeight, carrierId, carrierName, make/model/year`;
  - **trailer:** `id, licensePlate, …`;
  - all of them also have `legalEntity "YHS", isActive, createdAt, createdBy, rowVersion`.
- **These ids are the WMS ids.** They are what the Farm App must send to Burq as `fleet/driver/truck/…ExternalRefId`.
  Verified: WMS ticket 6132 shows exactly the AgriAdmin records behind the ids Burq sent.
- To read the data without exposing the token, call it from the page: in `run-code`, take the `authorization` header off
  the app's own `/api/v1/` request, then `page.evaluate(fetch…)`.

## Live counts (2026-10-20, all active)

| Entity | AgriAdmin | Farm App `Metadata/*` rows | Farm distinct names | Farm duplicated names | Farm only |
|---|---:|---:|---:|---:|---:|
| Carriers / Fleets | 105 | 198 | 111 | 86 | 6 (QA test carriers: `QAHasan3/4/5`, `UAT-QA-CARRIER-2026-08-11`, `Grizzly Nut`, `Bill Amarel Trucking`) |
| Drivers | 357 | 666 | 554 | 112 | 197 (e.g. `Castillo, Jesus`, `Chavez, Antonio`, `Lopez, Hector`, `John`) |
| Trucks | 472 | 773 | 474 | 299 | 2 (`TRK-0001234`, `9G86593`) |
| Trailers | 4,172 | 8,058 | 4,209 | 3,849 | 37 (`TRL-100…`, `LP-1123`, `TRL-234`) |

- **Names:** every AgriAdmin record exists in the Farm App by name or plate, so nothing is missing.
- **Truck → carrier:** 515 Farm trucks have the same carrier as AgriAdmin, and 255 have none on either side. One differs:
  `9G07695` (Farm #264) has no fleet, while AgriAdmin says FEDORA FARMS. **186 of 472 AgriAdmin trucks have no carrier.**
  A Farm ticket that uses one of them gets no fleet and fails the Burq sync (FINDINGS #73, ADO #26707).

## Duplicates and wrong refs (FINDINGS #75, extends ADO #26706)

The Farm App holds most master records **twice**:

- **Seed copy** from 2026-06-30, with low ids: fleets ≤ 88 (`code: null`), trucks ≤ 301, trailers ≤ 3878.
- **Burq copy**, with high ids: fleets ≥ 89 (`code` = name), trucks ≥ 302, trailers ≥ 3891.

The seed copies carry wrong `…ExternalRefId`s, while the Burq copies carry the AgriAdmin/WMS id.

The Harvest Central pickers show both copies under the same label and pick the first, which is the seed copy. Of 28
distinct tickets that ever synced, the 24 on seed copies sent the wrong fleet and truck to WMS, and the 3 on Burq
copies were correct. For example, `9D46925` is AgriAdmin truck #169, but its seed copy (Farm #170) sends 175, so WMS shows
`9E49938`. Likewise `Emerald Farms` is AgriAdmin #22, but the seed fleet 23 sends 44, so WMS shows `Manzano`.

## How to rerun the comparison

1. Run `pnpm auth:agriadmin` and `pnpm auth:qa`, and have a valid Burq token.
2. Pull AgriAdmin with the four GETs above, Farm with `GET /api/Metadata/{Fleets,Drivers,Trucks,TrailerPlates}`
   (`TrailerPlates` is about 8k rows and takes about 6 s; retry if the connection resets), and the synced tickets with
   `burq.mjs packets 110 --status 2 --full`.
3. Compare names and plates case-insensitively. For each packet, resolve its `…ExternalRefId` in AgriAdmin and compare with
   the Farm ticket's `fleetName`, `driverName`, `truckLicensePlate` and `front/rearTrailerLicensePlate`.
