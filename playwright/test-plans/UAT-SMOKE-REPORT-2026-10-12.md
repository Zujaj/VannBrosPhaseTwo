# UAT smoke run — coverage report (2026-10-12)

**Environment:** UAT `agrierp-vannbros-web-uat-effee3bwh0amc8ee.westus2-01.azurewebsites.net`, user farmappadmin, **Colusa / Crop Year 2026**, Firefox.  
**Command:** `pnpm test:smoke:uat` (every `@SMK` / `@SMK-partial` test except `@mutating`), branch `feat/uat-smoke-target-env`.  
**Checklist:** `resources/Vann Brother Smoke check list.xlsx`, sheet "Detail Smoke Checklist v2": 162 rows, of which 103 are web-scoped (the denominator below).  
**Not on UAT:** Dummy Resources v2 (ADO #26191). Its specs are excluded on UAT; no smoke-checklist row depends on it.

## Result

- **Web rows exercised:** 73 of 103. **Pass: 68** (41 fully asserted, 27 partly) · **Flaky: 3** (passed on retry) · **Fail: 2**.
- **Not run:** 10 rows automated only by `@mutating` specs, which create templates and WOs. Run them with `pnpm test:smoke:uat:all` once approved.
- **Not automated:** 20 web rows. Manual (mobile, after-mobile, D365): 59 rows, outside this run.
- **Defects found: 2**, both already known on QA (MP-08, TI-04). **No UAT-only defect.**
- **QA bugs that do NOT reproduce on UAT:**
  - Material Template wizard dropdowns load (QA: `MaterialsV2` 500 → empty pickers; TM-08/10/11/13/17/25/28/29).
  - Edit and Clone open pre-filled (QA: blank form; TM-34/35).

## By area

| Area | Module | Web rows | Pass | Flaky | Fail | Not run (@mutating) | Not automated |
|---|---|---:|---:|---:|---:|---:|---:|
| WO | Work Order | 4 | 2 | 0 | 0 | 1 | 1 |
| WI | Work Order | 3 | 1 | 0 | 0 | 1 | 1 |
| MP | Maps | 9 | 7 | 1 | 1 | 0 | 0 |
| US | User Settings | 5 | 5 | 0 | 0 | 0 | 0 |
| ST | Settings | 14 | 5 | 0 | 0 | 0 | 9 |
| TA | Template Management | 10 | 5 | 0 | 0 | 4 | 1 |
| TI | Template Management | 12 | 5 | 1 | 1 | 4 | 1 |
| TM | Template Management | 36 | 36 | 0 | 0 | 0 | 0 |
| PO | POI | 8 | 1 | 0 | 0 | 0 | 7 |
| TK | Tank Mixing | 2 | 1 | 1 | 0 | 0 | 0 |
| **Total** | | **103** | **68** | **3** | **2** | **10** | **20** |

## Failures

- **MP-08** (User can select the Operation): Defect (also on QA): Maps → Set Filters → Filter Type "Task" lists no operations until a work-order Filter Type is chosen first; the Operation filter cannot be applied.
- **TI-04** (Verify Available attribute filters): Defect (also on QA, SMOKE-NOTES TI-ATTR-SEARCH): Inspection Template wizard → Available Attributes search ("Type And Enter") does not filter the list.

## Flaky (passed on retry)

- **MP-07** (User can select the Stages): First attempt hit the 150 s test timeout; passed on retry. It passed first time in the Crop Year 2027 run, so this looks like environment slowness.
- **TI-10** (Verify Clone template from detail screen): First attempt: the clone's Name read `Copy of Inspection Template 001` (lower-case *of*); the retry got `Copy Of Inspection Template 001`. **The clone-name casing is inconsistent on UAT.** Worth a manual look before filing.
- **TK-02** (Validate operation dropdown loads all operations configured in system): First attempt: the `Create New Work Orders` button click timed out after 15 s (button present, click not taken, most likely the loader overlay); passed on retry.

## Data notes (not defects)

- The UAT account defaults to **Crop Year 2027**, which is nearly empty (0 material templates). A first run there had 9 failing tests. 7 failed for lack of data (WI-14, TM-01/02/03/36, PO-05, ST-09). MP-08 is the real defect above, and the TM-08 group passed although marked as an expected failure (the QA bug isn't on UAT). The auth setup now switches every session to Crop Year 2026 (override: `AUTH_SEASON`).
- UAT's material templates are `weed control`, `Tank mixing` and `2nd Leaf Mites`. The template is stored as `"weed control "` (trailing space), so the list shows it trimmed. The specs use `weed control` / `Weed Control` on UAT (`Fertilization` / `Irrigation` on QA).

## Row-by-row (web scope)

| ID | Module | Check | Status | Automated by |
|---|---|---|---|---|
| WO-01 | Work Order | Create,Save as Draft, Submit, Recall and Re-submit Planned WO with Multiple Blocks (By Resource) | Not run (@mutating) | work-orders-planned.spec.ts |
| WO-02 | Work Order | Verify WO Detail screen | Pass (partial) | work-orders-list.spec.ts :: @TC-partial:WP-015 @SMK-partial:WO-02 View Work Order Detail opens a read-only d |
| WO-16 | Work Order | Download PDF for Planned Work Order (By Resource) from Web | Pass | attachments-pdf.spec.ts :: @TC:AP-020 @SMK:WO-16 the export control generates a PDF |
| WO-20 | Work Order | Verify WO Clones succesfully after hitting submit | Not automated |  |
| WI-01 | Work Order | Create,Save as Draft, Submit, Recall and Re-submit Planned Inspection WO from web | Not run (@mutating) | work-orders-inspection.spec.ts |
| WI-02 | Work Order | Verify WO Detail screen | Not automated |  |
| WI-14 | Work Order | Download PDF for Planned Inspection Work Order from Web | Pass | attachments-pdf.spec.ts :: @TC:AP-023 @SMK:WI-14 the inspection PDF carries its inspection detail and progr |
| MP-01 | Maps | User can see Upcoming Work Order | Pass | maps.spec.ts :: @SMK:MP-01 Maps Control shows Upcoming Work Orders |
| MP-02 | Maps | User can see Active Work Order | Pass | maps.spec.ts :: @SMK:MP-02 Maps Control shows Active Work Orders |
| MP-03 | Maps | User can see Completed Work Order | Pass | maps.spec.ts :: @SMK:MP-03 Maps Control shows Completed Work Orders |
| MP-04 | Maps | User can see Active Inspection Work Order | Pass (partial) | maps.spec.ts :: @SMK-partial:MP-04 Maps Control shows Active Inspection Work Orders |
| MP-05 | Maps | User can see Completed Inspection Work Order | Pass (partial) | maps.spec.ts :: @SMK-partial:MP-05 Maps Control shows Completed Inspection Work Orders |
| MP-06 | Maps | User can select the Crop | Pass | maps.spec.ts :: @SMK:MP-06 Set Filters narrows the map to a selected Crop |
| MP-07 | Maps | User can select the Stages | Flaky | maps.spec.ts :: @SMK:MP-07 Set Filters selects the Stages layer |
| MP-08 | Maps | User can select the Operation | Fail | maps.spec.ts :: @SMK:MP-08 Set Filters narrows the map to a selected Operation |
| MP-09 | Maps | User can verify Active Inspection tile in Advance filter | Pass | maps.spec.ts :: @SMK:MP-09 Set Filters offers Active Inspections and applies it |
| US-01 | User Settings | Verify Default Location | Pass (partial) | settings.spec.ts :: @TC-partial:ST-002 @SMK-partial:US-01 the Default Location dropdown lists the en |
| US-03 | User Settings | Verify Default Season | Pass (partial) | settings.spec.ts :: @TC-partial:ST-001 @SMK-partial:US-03 @SMK-partial:US-04 @SMK-partial:US-05 @SMK |
| US-04 | User Settings | Verify Default Language | Pass (partial) | settings.spec.ts :: @TC-partial:ST-001 @SMK-partial:US-03 @SMK-partial:US-04 @SMK-partial:US-05 @SMK |
| US-05 | User Settings | Verify Default Timezone | Pass (partial) | settings.spec.ts :: @TC-partial:ST-001 @SMK-partial:US-03 @SMK-partial:US-04 @SMK-partial:US-05 @SMK |
| US-06 | User Settings | Verify Default page size | Pass (partial) | settings.spec.ts :: @TC-partial:ST-001 @SMK-partial:US-03 @SMK-partial:US-04 @SMK-partial:US-05 @SMK |
| ST-01 | Settings | Verify Assets | Not automated |  |
| ST-02 | Settings | Verify Crop | Pass | settings.spec.ts :: @TC:ST-028 @SMK:ST-02 the Crops page lists configured crops with their attribute |
| ST-03 | Settings | Verify Crop Stages | Not automated |  |
| ST-04 | Settings | Verify Maps Toggle Config | Not automated |  |
| ST-05 | Settings | Verify Materials | Pass | settings.spec.ts :: @TC:ST-025 @SMK:ST-05 the Materials page lists materials with codes and units |
| ST-06 | Settings | Verify Notifications | Not automated |  |
| ST-07 | Settings | Verify Operations | Pass | settings.spec.ts :: @TC:ST-033 @SMK:ST-07 the Operations page lists operations with their attributes |
| ST-08 | Settings | Verify Resources | Pass | settings.spec.ts :: @TC:ST-020 @SMK:ST-08 the Resources page lists resources synced from D365 |
| ST-09 | Settings | Verify Template Management | Pass | template-management.spec.ts :: @TC:TM-001 @SMK:ST-09 the landing page shows a card for each template type |
| ST-10 | Settings | Verify Users on User Management | Not automated |  |
| ST-11 | Settings | Verify Users Groups on User Management | Not automated |  |
| ST-12 | Settings | Verify Users Role on User Management | Not automated |  |
| ST-13 | Settings | Verify Users Enterprise on User Management | Not automated |  |
| ST-14 | Settings | Verify Mobile User Role Permissions | Not automated |  |
| TA-01 | Template Management | Verfiy Create Attribute | Not run (@mutating) | attribute-template.spec.ts |
| TA-02 | Template Management | Verify select attribute on New Attribute Screen | Pass | attribute-template.spec.ts :: @SMK:TA-02 @SMK:TA-03 @SMK:TA-04 select an attribute type, then Next and Back |
| TA-03 | Template Management | Verify Next Button on New Attribute Screen | Pass | attribute-template.spec.ts :: @SMK:TA-02 @SMK:TA-03 @SMK:TA-04 select an attribute type, then Next and Back |
| TA-04 | Template Management | Verify Back Button on New Attribute Screen | Pass | attribute-template.spec.ts :: @SMK:TA-02 @SMK:TA-03 @SMK:TA-04 select an attribute type, then Next and Back |
| TA-05 | Template Management | Verify Save & Add New button on New Attribute Screen | Not run (@mutating) | attribute-template.spec.ts |
| TA-06 | Template Management | Verify close button | Pass | attribute-template.spec.ts :: @SMK:TA-06 Close discards the Add New Attribute panel |
| TA-07 | Template Management | Verify search on Attributes Screen | Pass | attribute-template.spec.ts :: @SMK:TA-07 Search Attributes narrows the deck to matching cards |
| TA-08 | Template Management | Verfiy Enable Attribute on Attributes Screen | Not run (@mutating) | attribute-template.spec.ts |
| TA-09 | Template Management | Verfiy Disable Attribute on Attributes Screen | Not run (@mutating) | attribute-template.spec.ts |
| TA-10 | Template Management | Verify filters | Not automated |  |
| TI-01 | Template Management | Verify create Normal inspection | Not run (@mutating) | inspection-template.spec.ts |
| TI-02 | Template Management | Verify Name | Pass | inspection-template.spec.ts :: @SMK:TI-02 @SMK:TI-03 the General section takes a Name and a numeric Default Loc |
| TI-03 | Template Management | Verify default location | Pass | inspection-template.spec.ts :: @SMK:TI-02 @SMK:TI-03 the General section takes a Name and a numeric Default Loc |
| TI-04 | Template Management | Verify Available attribute filters | Fail (known bug) | inspection-template.spec.ts :: @SMK:TI-04 the Available Attributes search narrows the list |
| TI-05 | Template Management | Verify select attributes | Pass | inspection-template.spec.ts :: @SMK:TI-05 dragging an attribute moves it to Selected Attributes |
| TI-06 | Template Management | Verify Save as Draft Button | Not run (@mutating) | inspection-template.spec.ts |
| TI-07 | Template Management | Verify Save & Publish Button | Not run (@mutating) | inspection-template.spec.ts |
| TI-08 | Template Management | Verify Close Button | Pass | inspection-template.spec.ts :: @SMK:TI-08 Close discards the wizard without saving |
| TI-09 | Template Management | Verify Publish template from detail screen | Not run (@mutating) | inspection-template.spec.ts |
| TI-10 | Template Management | Verify Clone template from detail screen | Flaky (partial) | inspection-template.spec.ts :: @SMK-partial:TI-10 Clone Template opens the wizard pre-filled as "Copy Of <name> |
| TI-11 | Template Management | Verify Edit template from detail screen | Not automated |  |
| TI-12 | Template Management | Verify View detail icon from detial screen | Pass | inspection-template.spec.ts :: @SMK:TI-12 View Detail opens the template detail page |
| TM-01 | Template Management | Verify Filter on Material Template Name | Pass | material-template.spec.ts :: @SMK:TM-01 filtering by Material Template Name narrows the grid to matching rows |
| TM-02 | Template Management | Verify Filter on Operation | Pass | material-template.spec.ts :: @SMK:TM-02 filtering by Operation narrows the grid to matching rows |
| TM-03 | Template Management | Verify Reset button on Filter | Pass | material-template.spec.ts :: @SMK:TM-03 Reset on the filter panel clears the filter and restores the full gri |
| TM-04 | Template Management | Verify Close Button on Filter | Pass | material-template.spec.ts :: @SMK:TM-04 Close on the filter panel discards an unapplied filter |
| TM-05 | Template Management | Verify the Refresh Button on Material Template Name | Pass | material-template.spec.ts :: @SMK:TM-05 Refresh reloads the Material Template grid |
| TM-06 | Template Management | Verify Create New Material Template button | Pass | material-template.spec.ts :: @SMK:TM-06 Create New Material Template opens the wizard on Basic Details |
| TM-07 | Template Management | Verify the Material Title on Basic Details | Pass | material-template.spec.ts :: @SMK:TM-07 @SMK:TM-09 Basic Details: Material Title and Additional Comments |
| TM-08 | Template Management | Verify the operation on Basic Details | Pass (partial) | material-template.spec.ts :: @SMK-partial:TM-08 @SMK-partial:TM-10 @SMK-partial:TM-11 @SMK-partial:TM-13 @SMK |
| TM-09 | Template Management | Verify the Additional Comments on Basic Details | Pass | material-template.spec.ts :: @SMK:TM-07 @SMK:TM-09 Basic Details: Material Title and Additional Comments |
| TM-10 | Template Management | Verify Select Product on Material Details | Pass (partial) | material-template.spec.ts :: @SMK-partial:TM-08 @SMK-partial:TM-10 @SMK-partial:TM-11 @SMK-partial:TM-13 @SMK |
| TM-11 | Template Management | Verify Mix Method on Material Details | Pass (partial) | material-template.spec.ts :: @SMK-partial:TM-08 @SMK-partial:TM-10 @SMK-partial:TM-11 @SMK-partial:TM-13 @SMK |
| TM-12 | Template Management | Verify Rate on Material Details | Pass | material-template.spec.ts :: @SMK:TM-12 @SMK-partial:TM-14 @SMK-partial:TM-15 @SMK-partial:TM-16 Material Det |
| TM-13 | Template Management | Verify Rate Unit on Material Details | Pass (partial) | material-template.spec.ts :: @SMK-partial:TM-08 @SMK-partial:TM-10 @SMK-partial:TM-11 @SMK-partial:TM-13 @SMK |
| TM-14 | Template Management | Verify Per on Material Details | Pass (partial) | material-template.spec.ts :: @SMK:TM-12 @SMK-partial:TM-14 @SMK-partial:TM-15 @SMK-partial:TM-16 Material Det |
| TM-15 | Template Management | Verify Save & Add New Button on Material Details | Pass (partial) | material-template.spec.ts :: @SMK:TM-12 @SMK-partial:TM-14 @SMK-partial:TM-15 @SMK-partial:TM-16 Material Det |
| TM-16 | Template Management | Verify Delete Button on Material Details | Pass (partial) | material-template.spec.ts :: @SMK:TM-12 @SMK-partial:TM-14 @SMK-partial:TM-15 @SMK-partial:TM-16 Material Det |
| TM-17 | Template Management | Verify Select Problem on Problem Details Screen | Pass (partial) | material-template.spec.ts :: @SMK-partial:TM-08 @SMK-partial:TM-10 @SMK-partial:TM-11 @SMK-partial:TM-13 @SMK |
| TM-18 | Template Management | Verify Stage on Problem Details Screen | Pass (partial) | material-template.spec.ts :: @SMK-partial:TM-18 @SMK-partial:TM-19 @SMK:TM-20 @SMK-partial:TM-21 @SMK:TM-22 @ |
| TM-19 | Template Management | Verify Severity on Problem Details Screen | Pass (partial) | material-template.spec.ts :: @SMK-partial:TM-18 @SMK-partial:TM-19 @SMK:TM-20 @SMK-partial:TM-21 @SMK:TM-22 @ |
| TM-20 | Template Management | Verify Infestation on Problem Details Screen | Pass | material-template.spec.ts :: @SMK-partial:TM-18 @SMK-partial:TM-19 @SMK:TM-20 @SMK-partial:TM-21 @SMK:TM-22 @ |
| TM-21 | Template Management | Verify Infestation Unit on Problem Details Screen | Pass (partial) | material-template.spec.ts :: @SMK-partial:TM-18 @SMK-partial:TM-19 @SMK:TM-20 @SMK-partial:TM-21 @SMK:TM-22 @ |
| TM-22 | Template Management | Verify Description on Problem Details Screen | Pass | material-template.spec.ts :: @SMK-partial:TM-18 @SMK-partial:TM-19 @SMK:TM-20 @SMK-partial:TM-21 @SMK:TM-22 @ |
| TM-23 | Template Management | Verify Save Button on Problem Details Screen | Pass (partial) | material-template.spec.ts :: @SMK-partial:TM-18 @SMK-partial:TM-19 @SMK:TM-20 @SMK-partial:TM-21 @SMK:TM-22 @ |
| TM-24 | Template Management | Verify Delete Button on Problem Details Screen | Pass (partial) | material-template.spec.ts :: @SMK-partial:TM-18 @SMK-partial:TM-19 @SMK:TM-20 @SMK-partial:TM-21 @SMK:TM-22 @ |
| TM-25 | Template Management | Verify Application Method on Application Details Screen | Pass (partial) | material-template.spec.ts :: @SMK-partial:TM-08 @SMK-partial:TM-10 @SMK-partial:TM-11 @SMK-partial:TM-13 @SMK |
| TM-26 | Template Management | Verify Total Application Rate on Application Details Screen | Pass | material-template.spec.ts :: @SMK:TM-26 @SMK:TM-27 @SMK:TM-30 @SMK:TM-31 @SMK-partial:TM-32 Application Detai |
| TM-27 | Template Management | Verify Tank Size on Application Details Screen | Pass | material-template.spec.ts :: @SMK:TM-26 @SMK:TM-27 @SMK:TM-30 @SMK:TM-31 @SMK-partial:TM-32 Application Detai |
| TM-28 | Template Management | Verify Nozzle Type on Application Details Screen | Pass (partial) | material-template.spec.ts :: @SMK-partial:TM-08 @SMK-partial:TM-10 @SMK-partial:TM-11 @SMK-partial:TM-13 @SMK |
| TM-29 | Template Management | Verify Droplet Size on Application Details Screen | Pass (partial) | material-template.spec.ts :: @SMK-partial:TM-08 @SMK-partial:TM-10 @SMK-partial:TM-11 @SMK-partial:TM-13 @SMK |
| TM-30 | Template Management | Verify Preharvest (PHI) Days on Application Details Screen | Pass | material-template.spec.ts :: @SMK:TM-26 @SMK:TM-27 @SMK:TM-30 @SMK:TM-31 @SMK-partial:TM-32 Application Detai |
| TM-31 | Template Management | Verify Band Percentage for Each Row to Apply on Application Details Screen | Pass | material-template.spec.ts :: @SMK:TM-26 @SMK:TM-27 @SMK:TM-30 @SMK:TM-31 @SMK-partial:TM-32 Application Detai |
| TM-32 | Template Management | Verify Save Button on Application Details Screen | Pass (partial) | material-template.spec.ts :: @SMK:TM-26 @SMK:TM-27 @SMK:TM-30 @SMK:TM-31 @SMK-partial:TM-32 Application Detai |
| TM-33 | Template Management | Verify Close Button on Application Details Screen | Pass | material-template.spec.ts :: @SMK:TM-33 Close on Application Details discards the wizard without saving |
| TM-34 | Template Management | Verify Edit of Material Template on View Detail Page | Pass (partial) | material-template.spec.ts :: @SMK-partial:TM-34 Edit opens the wizard pre-filled from an existing template |
| TM-35 | Template Management | Verify Clone of Material Template | Pass (partial) | material-template.spec.ts :: @SMK-partial:TM-35 Clone opens the wizard pre-filled from an existing template |
| TM-36 | Template Management | Verify View Detail Page | Pass | material-template.spec.ts :: @SMK:TM-36 View Detail shows the full saved record |
| PO-01 | POI | Verify that manager can access POI under the map config screen . | Not automated |  |
| PO-02 | POI | Verify that user must be able to categorize different types of pin categories with different icons and pin colours as a setup table | Not automated |  |
| PO-03 | POI | Verify that after configuring the setup, the map view should show pins on the block | Not automated |  |
| PO-04 | POI | Verify that point of interest should be filter under Point of interest tab as per the selected season. | Not automated |  |
| PO-05 | POI | Verify that POI details get open when user clicks on details icon. | Pass | observations.spec.ts :: @TC-partial:WB-005 @SMK:PO-05 the observation detail opens from the row action |
| PO-06 | POI | Verify that user can redirected to create wo through point of interset(observation) detail screen | Not automated |  |
| PO-12 | POI | If user change the pin color in configuration then all previous pin's color should remain same as previous. | Not automated |  |
| PO-13 | POI | Add the logs to track the POI category changes. | Not automated |  |
| TK-01 | Tank Mixing | Verify user can navigate to create a new work order | Pass | work-orders-planned.spec.ts :: @TC-partial:WP-016 @SMK:TK-01 opens the Create New Work Order form with the Plan |
| TK-02 | Tank Mixing | Validate operation dropdown loads all operations configured in system | Flaky (partial) | work-orders-create-form.spec.ts :: @TC-partial:WP-024 @SMK-partial:TK-02 the task list is populated with coded task |
