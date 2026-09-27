# Smoke checklist wiring: working notes (2026-09-27, in progress)

Raw findings from the live exploration. To be folded into FINDINGS.md and deleted.

- SIGNIN: first sign-in pass always bounces; FE reads custumToken, gateway sends customToken (+ no `user`). Second pass works.
- MAPS-DATE: WO Date Range picker locked to 1 Jan 1900 (only that day enabled, month nav disabled); layers stuck on default week.
- MAPS-TASK: Filter Type Task -> operation list empty until a WO filter type chosen first. MP-08 fails on it.
- HARNESS-LOADER: app mounts 2 #f3-overlay-loader; waitForLoaderGone was a silent no-op (fixed).
- HARNESS-GMAPS: maps.googleapis.com flaky from this network (TLS resets ~40%); route now retries + caches.
- API-HOST: app API calls go to agrierp-authgateway-qa-api.folio3.site/api/... (check api/client.mts host).
- MAPS-LAYERS: Maps Control now has a Variety layer (not in MAP_LAYERS list; harmless).
- DATA: no In Progress/Done inspection in the current week window -> MP-04/05 partial.
- MOBILE-ROLES: Settings > User Management > Mobile User Role Permissions shows "No Record Found" (user/rolePermissions returns []).
- OPERATIONS-GRID: Settings > Tasks / Operations never loads - Operation/getOperationsPaginated is aborted and not re-issued. Existing ST-033 fails on it.
- ST-002: "Default Location" field not found on User Settings - not yet investigated.
- DRIFT: Resources last column now "Action"; Operations column now "Task Type Name".
- TM-WIZARD-DROPDOWNS: opening the Material Template Create/Edit/Clone wizard fires `GET /api/metadata/MaterialsV2?page=1&limit=99999...` which returns **500**; the sibling metadata GETs (ParentOperations, applicationmethods, NozzleTypes, sometimes DropletSize) are then aborted (NS_BINDING_ABORTED / net::ERR_ABORTED), so the wizard pickers (Operation*, Select Product, Select Problem, Mix Method, Rate Unit, Application Method, Nozzle Type, Droplet Size) render blank or empty. Verified 2026-09-27 on Firefox and Chromium with a single click and no request interception. The list's Set Filters > Operation (same widget) populates fine. Effect: Operation can never be set, Save never enables, no Material Template can be created via the UI.
- TM-EDIT-CLONE-BLANK: Edit Material Template and Clone Material Template both open with a completely blank form (Edit's heading reads "Edit Material Template", but Material Title is empty) instead of pre-filling from the source template (confirmed on "Fertilization", id 31, via row icons and the detail page's own Edit button).
- TM-REFRESH-I18N: Material Template list Refresh button's title/accessible name is the untranslated i18n key `Modules.templatemgmt.pages.activitydetails.refreshmaterialtemplates`.
- TM-CLOSE-LABEL: Set Filters aside close (X) icon has accessible name "Close User" (mislabeled, reused component).
- TM-UNIT-CONCAT: Application Details `Total Application Rate`/`Tank Size` render label+unit with no space — "Total Application Rategal/acre*", "Tank SizeGal*".
- TM-CREATE-ALERT: opening the Material Template Create wizard reliably raises a transient alert "The input string '' was not in a correct format." that self-dismisses in ~2-3s.
- TM-KB-DRIFT: knowledge base (templates.md) calls the wizard's 2nd tab "View Details" and the Basic Details task field "Task*" only — live app (and the smoke checklist itself) calls the tab "Material Details" and the field renders as either "Task*" or "Operation*" depending on build (same Task/Operation drift already documented elsewhere in this repo).
