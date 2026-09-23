# Findings from automating the web regression suite

Behaviour discovered while building the automated suite against the Vann Brothers QA
environment. Each entry is either a **product gap** worth a defect, or an **environment
characteristic** that every test author needs to know about. All verified live on the dates
given, against `https://agrierp-vann-qa.folio3.site`.

---

## 1. The 404 page offers no route back into the application — product gap

**Case:** GN-045. **Verified:** 2026-09-07.

An unknown route (e.g. `/this-route-does-not-exist-9f3a`) renders a bare `404` with **no
header, no navigation and no link back**. The URL is preserved and no framework error leaks,
so the route IS handled — but the workbook requires "the custom 404 page ... **with a working
route back into the application**", and the user's only escape is the browser Back button or
editing the URL.

`global-navigation.spec.ts` asserts the half that holds and is tagged `@TC-partial:GN-045`.
It also asserts the *absence* of the navigation, so if a route back is added the test flips
and the case can be promoted to full coverage.

**Suggested defect:** Medium. 404 page should render inside the app shell, or carry a link home.

---

## 2. The environment serves two different builds of the work-order grid

**Verified:** 2026-09-07, both variants observed minutes apart in one session.

The same grid renders under two different labellings, apparently a build/deploy
inconsistency rather than anything driven by user, season or work-order type:

| Variant A | Variant B |
|---|---|
| `Seq No` | `WO Sequence No.` |
| `Wo Name` | `WO Name` |
| `Blocks` | `Plots` |
| `Operation` | `Task` |
| button title `Search Column Filter` | `Search by column filter` |
| sort icon title `Sort Descending` | `Sort by col...` |
| input placeholder `Type And Enter` | `Type & Enter` |

The drift is not limited to the grid. The same two builds differ across the Template
Management wizard too, on the same axis — one writes conjunctions out, the other uses `&`,
and the casing shifts with it:

| Variant A | Variant B |
|---|---|
| `Save As Draft` | `Save as Draft` |
| `Save And Publish` | `Save & Publish` |
| `Enter Title And Select Attributes` | `Enter Title & Select Attributes` |

So this is a systematic labelling difference between two deployed builds, not a handful of
isolated typos.

Variant B matches the workbook's wording; variant A does not. This is the same drift already
recorded for `Add Plot`/`Add Block` on the create form.

The Create form's plot section drifts on the same axis (both seen 2026-09-11, minutes apart —
a `playwright-cli` browser got B while a test run got A):

| Variant A | Variant B |
|---|---|
| section heading `Select Block` | `Select Plot` |
| grid columns `Block`, `Block Area`, `Activity Area` | `Plot`, `Plot Area`, `Operational Area` |
| counter under the grid `30 Total Fields` | `30 Total Plots` |

Note the counter says **Fields**, not Blocks, on variant A — a third noun for the same thing.

**Consequence for tests:** any spec that hardcodes either spelling passes or fails on which
build it happens to hit. `ListPage` resolves every column through a `COLUMN_VARIANTS` table
and matches controls by their **icon** (`fa-search`, `fa-close`) rather than by title.

**Suggested action:** worth confirming with the team which build QA is meant to be running —
two builds behind one host makes every manual result ambiguous too, not just automated ones.

---

## 3. Column filters are sticky across navigation, sessions and runs

**Verified:** 2026-09-07.

A per-column search survives navigating away and back, and a **fresh browser context started
from the same stored session still has it applied** — a filter set in one test run was still
narrowing the grid in the next. A filtered column swaps its search button (`fa-search`) for a
reset button (`fa-close`), which is how an active filter can be detected without knowing what
was set.

**Consequence for tests:** every grid spec must clear filters before asserting, or it
inherits whatever the previous test — or a human using the shared QA env — left behind.
`ListPage.clearAllColumnFilters()` does this, and the grid specs call it in both `beforeEach`
and `afterEach` so the environment is handed back clean.

**Consequence for manual QA:** the same trap applies. A tester who leaves a filter on will
see it again next session and may read it as missing data.

---

## 4. The grid settles a step behind the action

**Verified:** 2026-09-07, reproducible.

Applying a filter renders the *previous* result set before the new one arrives, and the
footer count lags with it. Measured, from an unfiltered grid of 841 rows:

| Action | Footer immediately after |
|---|---|
| clear all filters | `841 records` (correct) |
| filter Task = Irrigation | `841 records` — the pre-filter total |
| filter Status = To Do | `117 records` — the **Task-only** total |

The rows behave the same way. Nothing is lost — the grid does arrive at the right answer —
but any assertion taken from the first render after an action reads an intermediate state.

**Consequence for tests:** data assertions after a grid action use `expect.poll` so they
assert the state the grid *arrives at*. Adding a dwell inside the settle helper was tried and
made things worse — it pushed specs past their budget while still racing a second fetch.

---

## 5. The grid uses skeleton rows, not the app's loading overlay

**Verified:** 2026-09-07.

The grid does **not** raise the app's `#f3-overlay-loader` truck overlay while fetching. It
renders a full page of placeholder rows — real `<tr>`s whose cells contain
`span.skeleton-box` — and swaps them for data in place.

**Consequence for tests:** `waitForLoaderGone()` returns immediately, and a "first row is
visible" check passes against a skeleton. A spec that proceeds there reads a header with no
data behind it and a footer showing `Page 1 of 0 - Showing 1 - NaN of records`. This is very
likely a contributor to pre-existing flakiness in list-based specs.
`ListPage.waitForGridSettled()` waits for the skeletons to appear and then clear.

Related: opening a column search injects an extra `tr.row-has-search` spacer row into the
same tbody, which inflates naive row counts by one and puts a blank leading value into every
column read. `ListPage.rows` excludes it.

---

## 6. Most "Done" work orders do not show full completion — product/data question

**Case:** WP-013. **Verified:** 2026-09-07.

WP-013 requires that "a Done work order shows full completion and a To Do work order shows
zero; no contradictory combinations exist."

The To Do half holds — every To Do work order is at 0%. The Done half does not. Of the **89
Done work orders** in the tenant:

| Progress | Count |
|---|---:|
| 100% or more | 28 |
| between 0% and 100% | 37 |
| exactly 0% | 24 |

So **61 of 89 (69%)** contradict the expectation, and 24 are Done at zero progress.

This is either a data-integrity problem or a wrong expectation in the workbook — a work order
may legitimately be closed without its full area being completed. That is a product-owner
call, not something a test should decide, so `work-orders-list.spec.ts` asserts the rule that
holds and is tagged `@TC-partial:WP-013`.

**Suggested action:** confirm with the product owner whether Done implies 100%. If it does,
the 24 zero-progress Done work orders are a defect. If it does not, WP-013's expected result
needs rewording.

---

## 7. The work-order detail view has no status-history section

**Case:** WP-015. **Verified:** 2026-09-07.

WP-015 expects the read-only detail to show "general information, plots, materials,
resources, assets **and status history**".

Everything else is present — materials render under the heading **`Inputs`** rather than
"Materials" — but there is no status-history section anywhere on the page. The detail is
genuinely read-only (no editable field in `main`), and offers `Start Work Order` and `Recall`
actions.

`work-orders-list.spec.ts` asserts the sections that exist and is tagged `@TC-partial:WP-015`.

**Suggested action:** decide whether status history was dropped, was never built, or belongs
to a screen the workbook is conflating with this one.

---

## 8. The fourth work-order tab is "Point Of Interests", not "Observations"

**Case:** WP-003. **Verified:** 2026-09-07.

The workbook lists the sub-tabs as Work Orders, Inspection Work Orders, Harvest Work Orders
and **Observations**; live, the fourth is labelled **Point Of Interests** — the same tab under
the product's other name for the concept. Cosmetic, but it makes a manual tester pause, and
the workbook wording should be aligned.

---

## 9. Mid-run failures: the QA backend, not session expiry

**Verified:** 2026-09-10. **This entry corrects an earlier diagnosis.**

Large parallel runs repeatedly failed partway through — a burst of authenticated specs timing
out on `toBeVisible` / `toHaveCount` while the static host stayed healthy. That was originally
recorded here as "the stored session dies mid-run", and re-running `pnpm auth:qa` did clear it,
which made the explanation look right.

It was probably wrong. On 2026-09-10 the same symptom resolved to a **backend outage**: the app
navigates to `/` and renders

```
HTTP Error 500.30 - ASP.NET Core app failed to start
```

The SPA shell still serves (`GET /` returns 200 with the Angular `index.html`) and the auth
gateway is fine (`agrierp-authgateway-qa-api.folio3.site` answers 401, i.e. alive), so every
cheap health check passes while the application is unusable. Four samples eight seconds apart
all returned 500.30.

**Why it looked like session death:** with the backend down, sign-in still completes — Azure AD
authenticates and the app reaches `/maps` — but the app cannot write its Season/Location
context, so `.auth/admin.json` is saved with `refreshToken`, `userInfo` and `isUserLoggedIn`
but **no `seasonId`/`locationId`**. `sessionSeasonValid` then rejects that session, and
`probeAuthenticated` fails, both of which read as "the session expired".

**How to tell them apart:**

```bash
# In a browser with a loaded session — an outage shows the ASP.NET error, expiry shows /login
playwright-cli -s=vb goto https://agrierp-vann-qa.folio3.site/maps
```

A saved session whose localStorage has `isUserLoggedIn` but no `seasonId` points at the backend,
not the token.

**Mitigation in the suite:** `auth.setup.ts` now waits for the app to actually write a live
Season before saving state, rather than sleeping a fixed five seconds. That removes a real race
(the app writes its context a beat after the redirect) and makes a backend outage fail with the
explicit "Season/Location never appeared in storage" line instead of a vague probe failure.

## 10. Harvest Central's list columns have moved on from the workbook

**Cases:** HC-001, HC-010. **Verified:** 2026-09-07.

HC-001 expects the list columns "Field, Variety, **No Of Harvest Tickets, Updated By,
Updated By Date** and Action". Live renders:

| Workbook | Live |
|---|---|
| `No Of Harvest Tickets` | `No Of Planned Tickets` **and** `No Of Actual Tickets` |
| `Updated By` | `Planned By` |
| `Updated By Date` | `Planned On` |

The single ticket count has been split into planned and actual, which is a product change the
workbook has not caught up with — not a defect. HC-003 ("No Of Harvest Tickets matches the
detail view") is consequently ambiguous as written: it does not say which of the two counts it
means, so it is **not** automated pending a decision.

Separately, HC-010 lists `Linked Project` among the Harvest Detail grid columns; live it is a
field on the Information panel instead, and every other column the case names is present.

**Suggested action:** update HC-001, HC-003 and HC-010 to the current column set.

---

## 11. `creds.txt` is stale — 30 of 31 QA accounts cannot sign in

**Verified:** 2026-09-10 by `pnpm triage:accounts`. **This entry corrects an earlier
diagnosis.**

Two accounts were tested by hand and both were blocked, which was recorded here as "QA test
accounts are caught by the tenant's MFA registration policy". That was too narrow a
conclusion from a sample of two. Triaging all 31 accounts in the credentials file gives:

| Outcome | Accounts |
|---|---:|
| **usable** — signs in unattended and reaches the app | **1** (`rffcropplanner`, the admin) |
| `password-change-required` — Azure AD demands a new password | 15 |
| `credential-rejected` — the password on file is simply wrong | 10 |
| `mfa-enrolment-required` — no second factor registered | 4 |
| `unknown` | 1 |

So MFA is the *minority* problem. The dominant one is that **the credentials file is out of
date**: 25 of 31 accounts either carry a wrong password or need one reset. Only the admin
account works, which is why every automated spec runs as admin.

**What this costs:** the 45 permission-scoped web cases — every `Security` case, the whole
`12 Users, Roles & Perms` tab (39 automatable, 25 P1), and the `Permissions` sub-process on
five other modules — cannot be automated at all, because proving a lower-privileged user is
*denied* something requires being that user.

**The cheapest fix is one account, not thirty.** Someone with tenant access needs to:

1. pick any account from the `password-change-required` list,
2. sign in once by hand and set a non-expiring QA password,
3. exclude it from the MFA registration policy (the admin account already is, so the policy is
   not tenant-wide),
4. put the new password in `creds.txt` and run `pnpm creds:import`.

Then assign it a role in `.auth/credentials.json` (ACCOUNTS.md says which roles the workbook
needs; **Supervisor** and **FarmHand** unlock the most) and bootstrap with
`AUTH_ROLES=<role> pnpm auth:qa`.

Re-run `pnpm triage:accounts` afterwards to confirm; it rewrites `ACCOUNT-TRIAGE.md` with the
current state of every account.

**Do not** attempt any of this from automation: setting a password or enrolling a second factor
changes a real person's account, and these are shared.

## 12. Sites: the Name column search does not filter — product defect

**Case:** ST-012. **Verified:** 2026-09-07, reproducible.

On **Settings > Sites** (`/settings/location`, 1,433 records), searching the **Name** column
returns the entire unfiltered list. The app registers the filter — the column swaps its search
button for the reset button, and the input retains the typed value — but the grid does not
narrow and the rows are unchanged.

| Column searched | Term | Records before | Records after |
|---|---|---:|---:|
| `Code` | `YHS` | 1,433 | **1** (correct) |
| `Name` | `140` | 1,433 | **1,433** (unfiltered) |

The `Code` column on the same grid filters correctly, so the search mechanism itself works;
it is the Name column that is broken. The workbook already warns that "sorting has previously
failed on several settings grids" — searching on this grid deserves the same scrutiny.

Sorting, for the record, is **fine** on this grid: both columns order correctly in both
directions (an earlier automated failure here was a defect in the test's own comparator, not
in the product).

`settings.spec.ts` asserts the Code column properly and pins the Name behaviour as a
characterisation, so the test fails — deliberately — once the defect is fixed, which is the
signal to promote ST-012 to full coverage.

**Suggested defect:** Medium. Sites > Name column search returns unfiltered results.

---

## 13. User Settings: the preference controls are not searchable

**Case:** ST-002. **Verified:** 2026-09-07.

ST-002 expects the Default Location list to be "searchable" with "the current default
preselected".

The **preselection works** — the saved default resolves to the location the header is scoped
to (Colusa), and is asserted by the spec. Worth noting for anyone testing this page by hand:
the control renders the placeholder `Choose your option` for a second or two before the saved
value loads, which reads as "no default set" if you look too early. That is what it looked
like on first inspection here.

The **searchable** half is not satisfiable: the control is a native `<select>` inside
`app-f3-dropdown` — not the searchable `app-f3-select` widget the header Site/Season pickers
use — so there is no search box to exercise. With ~1,400 locations in the list, that is a
usability gap worth raising even though it is not a functional defect.

**Suggested action:** confirm whether these preference controls are meant to match the header
pickers. If not, ST-002's wording should drop "searchable".

---

## 14. The Communication Center Send button shows a raw i18n key

**Cases:** GN-046, and encountered while automating CC-016. **Verified:** 2026-09-08.

The Send button in a message thread carries an untranslated resource key as its tooltip:

```html
<button class="btn btn-primary" title="type_message_to_send">Send</button>
```

GN-046 requires that "no raw i18n keys, no 'undefined' labels and no empty tooltips are shown
anywhere in the UI". A scan of Work Orders, Planning and Harvest Central found **no** raw keys,
so this is an isolated miss rather than a systemic localisation problem — which makes it cheap
to fix.

`global-navigation.spec.ts` scans the clean modules properly and pins this one, so the test
fails once the key is translated.

**Suggested defect:** Low. Send button tooltip renders `type_message_to_send`.

---

## 15. The Send button is never disabled, so CC-016 cannot be automated safely

**Case:** CC-016. **Verified:** 2026-09-08.

CC-016 asks that "empty and whitespace-only messages are rejected — no message is sent and no
empty bubble appears in the thread".

The Send button is **enabled at all times**: on an empty composer, on a whitespace-only one,
and with text. So whatever rejection exists happens on click, and the only way to observe it
is to press Send.

That is not a safe automated check on this environment. If the app rejects correctly, nothing
happens; if it does not, an empty message is posted into a real conversation on the shared QA
tenant, under a real person's name, with no teardown. The downside of the test being wrong is
worse than the value of the coverage, so **CC-016 is left manual** — a tester can press Send on
an empty composer in seconds and see the result.

Worth noting for the manual run: disabling Send while the composer is empty or whitespace-only
would make the rule observable without sending anything, and would let this case be automated.

---

## 16. Most of the Communication Center is write-shaped, and stays manual

**Cases:** CC-010, CC-012, CC-015, CC-018..CC-024, CC-029..CC-031, CC-034..CC-040.
**Verified:** 2026-09-08.

Of the module's 44 web cases, the great majority require sending a message, uploading media,
creating or renaming a conversation, adding/removing group members, or flagging a message for a
manager. Every one of those writes into conversations that real named users share, on a tenant
the manual regression cycle is executed against, and none of it can be cleaned up afterwards.

Seven cases were automated (the list, titles, media previews, search, thread history, and the
participant picker). The rest are deliberately left to the manual cycle. Automating them would
need either a disposable tenant or a pair of throwaway accounts that exist only for the suite —
worth considering alongside the non-admin account discussed in ACCOUNTS.md.

---

## 17. The farm/field tree search box does not filter — product defect

**Cases:** MP-035, MP-036 (and the same widget appears in Planning). **Verified:** 2026-09-08,
reproducible.

The sidebar tree search on **Maps** accepts input but never narrows the tree. All 104 field
nodes remain for every term tried, with and without pressing Enter:

| Term | Meaning | Fields before | Fields after |
|---|---|---:|---:|
| `130` | a real field number, visible in the tree | 104 | 104 |
| `FIELDRUN` | a real crop name | 104 | 104 |
| `1` | single digit | 104 | 104 |
| `ZZZZZZ` | matches nothing | 104 | 104 |

The identical box in **Planning** (`/crop-mgmt`) behaves the same way, so this is the shared
tree-search widget being inert rather than anything specific to Maps. With 104 fields under one
farm, the search is the only practical way to reach a given field, which makes this more
painful than the row count suggests.

`maps.spec.ts` asserts what does hold — the box exists and accepts input — and pins the
non-filtering, so MP-035 and MP-036 fail once it works.

**Suggested defect:** Medium. Farm/field tree search does not filter the tree (Maps and
Planning).

---

## 18. Maps: the layer set and the filter panel differ from the workbook

**Cases:** MP-011, MP-028, MP-029, MP-032. **Verified:** 2026-09-08.

**Layers (MP-011).** The Maps Control panel offers eleven layers: Stages, Crops, Task, Active
/ Draft / Completed Inspections, Active / Draft / Upcoming / Completed Work Orders, and Point
Of Interest. The workbook also expects an **Observations** layer, which does not exist; the
product adds **Draft Work Orders**, which the workbook does not list.

**Filter panel (MP-028).** The workbook describes "Upcoming/Active/Completed Work Order tiles,
Active/Completed Inspection tiles, Task/Operation, Season, Farm, Start Date and End Date". The
live "Set Filters" aside instead offers a **WO Date Range** (a start/end pair), a **Filter
Type** dropdown carrying the layer selection the tiles used to represent, plus **Task** and
**Crop** — and no Season or Farm criteria at all.

Consequences: **MP-029** ("each work order status tile filters the map") describes tiles that
no longer exist, and the effect would land on the canvas anyway, so it stays manual.
**MP-032** (Reset) is left unautomated — Reset does not restore the Filter Type control to its
opening value, and what it is meant to clear needs deciding before a test can encode it.

**Suggested action:** update MP-011, MP-028, MP-029 and MP-032 to the current design.

---

## 19. Reading the PDF export needs a library — now resolved

**Cases:** AP-021, AP-023, AP-024, AP-026, AP-027, AP-036, AP-037. **Verified:** 2026-09-08.

The export draws every string as glyph indexes into embedded font subsets (`<0001> Tj` with
`/Encoding /Identity`), and the document carries three subsets that each number their glyphs
from `0001`. Recovering text means resolving each page's `/Resources /Font` entry to that
font's `/ToUnicode` CMap and decoding per font; a merged table decodes most glyphs wrongly,
which an attempt at hand-rolling confirmed — it produced scattered single characters.

**`pdf-parse` has since been added to `playwright/package.json`**, and these seven cases are
now automated against the extracted text. `helpers/pdf.ts` keeps a dependency-free
`readPdfFacts` for the structural checks (is this a PDF, page count, embedded images) and uses
`pdf-parse` for text.

Two gotchas worth carrying into manual testing:

- **The export control accepts clicks before the detail page is wired.** An early click is
  silently swallowed — no download, no dialog, no toast — and reads as a hang. The spec waits
  for the `Work Order:` heading first.
- **Exports must run serially.** Three concurrent generations all exceeded a 120-second
  download timeout; one at a time completes in about five seconds.

### What the export actually contains

| Work-order type | Sections |
|---|---|
| Planned | Plots, Inputs, Resources, Assets, Additional Information, Plots Progress, Plot Map |
| Inspection | Plots, Inspection Detail (attribute/value), Resources, Weather, Inspection Attachments, Plots Progress, Plot Map |
| Harvest | Blocks, Additional Information, Blocks Progress, Block Map |

Note the Plot/Block naming split again: a planned export says "Plots Progress" and "Plot Map"
where a harvest one says "Blocks Progress" and "Block Map".

**AP-024** is partial for a data reason rather than a product one: every harvest work order in
the tenant is a Draft with no resources, assets or picked quantities recorded, so those
sections are absent because there is nothing to print. It needs a harvest work order with
recorded progress to be promoted.

**AP-036** is partial because the material rows are compared against the work order rather
than against the material template's own definition — reaching that means opening Template
Management and reconciling by hand.

---

## 20. Two cases the workbook flags as previously broken now pass

**Cases:** WB-001, SD-012. **Verified:** 2026-09-09.

Both carry warnings in the workbook, and both are fixed:

- **WB-001** — "This tab has previously failed with an unknown error." The Observations
  (`Point Of Interests`) tab loads 50 records with no error surface.
- **SD-012** — "This view has previously failed with an unhandled error." The Sync Console's
  message statistics view (`/sync-console/stats`) renders its own controls (Errors Only,
  Graphical / Tabular).

Both specs assert the page reaches its *own* content rather than merely routing, so a view
that crashed after loading would still fail them.

---

## 21. "Synchronization Frequecy" is misspelled on the Service Status grid

**Case:** SD-004. **Verified:** 2026-09-09.

The Sync Console's Service Status grid renders its fourth column as
**`Synchronization Frequecy`** — missing the second `n`. The workbook spells it correctly
("Synchronization Frequency"), so this is a product typo rather than a workbook error.

`sync-console.spec.ts` asserts the live spelling so the test reflects what ships; correcting
the product will fail it, which is the signal to update the assertion.

**Suggested defect:** Low. Column header misspelled on Sync Console > Service Status.

---

## 22. Sync Console navigation has grown beyond the workbook

**Case:** SD-001. **Verified:** 2026-09-09.

The workbook expects sub-navigation for "Connections, Service Status, Sync History, API Packet
Logs and Messages". Live:

| Workbook | Live |
|---|---|
| Sync History | `Sync History V2` |
| API Packet Logs | `Api Logs` |
| — | `Logs`, `Message Stats`, `User App Version` (all new) |

All five of the workbook's sections exist under one name or another; three more have been
added. SD-001 asserts the five it names, by href, and is tagged partial for the drift.

**Suggested action:** update SD-001 to the current navigation.

---

## 23. SD-006 ("Stop All Services") is deliberately not automated

**Case:** SD-006. **Verified:** 2026-09-09.

SD-006 asks that "Stop All Services" present a confirmation and that cancelling changes
nothing. The case is designed to be safe — the cancel path — and the Service Status page does
carry a `Stop All Services` control above 161 configured services.

It is left manual anyway. The blast radius of getting the selector wrong is every sync service
on the shared QA tenant, and this session has repeatedly turned up controls that were not what
they appeared to be (`menuitemradio` widgets that looked like buttons, three inputs sharing a
placeholder, an export button that accepts clicks it then ignores). A confirmation dialog is
seconds to check by hand and is not worth that risk unattended.

---

## 24. Create-form gotchas: late defaults and unfindable date inputs

**Cases:** WP-017..WP-042. **Verified:** 2026-09-10.

Two things will bite anyone automating the work-order Create form.

**The form applies its defaults after it mounts.** Priority, Operation Type and both date
fields are empty for a beat after the panel opens, so reading them immediately reports "no
default is preselected" for a form that populates correctly a moment later. The specs gate on
Priority becoming non-empty, which is the first default to settle.

**The WO Start/End Date inputs cannot be found the obvious ways.** They are Angular Material
datepicker inputs which:

- carry **no `type` attribute**, so `input[type="text"]` does not match them (their `.type`
  property still reads `"text"`, which is why a DOM dump looks fine);
- are **not Playwright-`:visible`** — their own bounding box is empty because the value is
  painted by a wrapper element, so `input:visible` returns only four inputs on this form and
  none of them is a date.

They must be addressed as `input.mat-datepicker-input`, and editability checked on the element
(`disabled` / `readOnly`) rather than with `toBeEditable`, which requires the visibility these
inputs do not report.

Not to be confused with `input.mat-start-date` / `input.mat-end-date` — those belong to the
**Task Date Range** picker beside the plot section, which is the broken one (min/max stuck at
1900-01-01, documented on `WorkOrdersPage.addFirstFromModal`).

### Observed field behaviour

| Field | Live behaviour |
|---|---|
| Priority | 4 options (Low, Medium, High, Urgent), defaults to **Medium** |
| Farm | scoped to the selected site — one entry for Colusa, each `Name (CODE)` |
| Operation Type | fixed to **Planned** and **disabled** on the Planned form |
| Operation / Task | 12 options, each suffixed with its task code |
| Supervisor | 101 employees as `Name (employeeNumber)`, with a working type-ahead |
| Resource mode | `By Resource` / `By Groups` radio pair |

WP-024 is partial as a consequence: Operation Type cannot be varied on this form, so "selecting
a Task Type populates the Planned Task list" is only observable across the Inspection and
Harvest sub-tabs, which their own specs already cover.

The form also marks **`Inspection Templates*`** required on the Planned form, where the control
is disabled and not applicable. Cosmetic, but it makes the required set misleading.

## 25. The Google Maps script can hang every page load from a browser (environment, not product)

On 2026-09-11 every navigation from Playwright's browsers timed out at `domcontentloaded` —
`auth.setup.ts`'s `/maps` probe included, so the suite could not get past `setup` and a headless
`pnpm auth:qa` sat in its six-minute human-auth wait. The app was healthy throughout.

**Cause:** `index.html` loads `https://maps.googleapis.com/maps/api/js?...` as a synchronous
`<script>` in `<head>`. From this workstation that one request never completes inside a browser,
so the parser never reaches `DOMContentLoaded`, and every `page.goto` stalls with `readyState`
stuck at `loading` and no `<body>`. The other six render-blocking resources (bootstrapcdn, jQuery,
Popper, New Relic, the app stylesheet) load normally.

| Client | Maps script | Page |
|---|---|---|
| `curl -4` (plain, and with the app's Referer + browser `Sec-Fetch-*` headers) | 200 in 1-2 s | — |
| Playwright `request` API (Node side) | 200 in 3 s | — |
| Playwright Chromium, headless (default, `--disable-quic`, desktop UA, `--disable-http2`) | never finishes (150 s) | hangs |
| Playwright Firefox, headless (default) | never finishes (60 s) | hangs |
| Playwright Firefox with `network.http.http2.enabled=false` | finished in 2 of 3 loads | intermittent — not a fix |
| Playwright Chromium, `context.route` serving `maps.googleapis.com` / `maps.gstatic.com` via `route.fetch()` | 2 of 2 loads | `domcontentloaded` in 2.6-4.8 s, Work Orders list usable, `google.maps` defined |
| Playwright Firefox, same routing | 2 of 2 loads | `domcontentloaded` in 2.6-6.2 s, Work Orders list usable, `google.maps` defined |

No proxy variables are set; IPv6 to Google fails fast (not a stall). The browsers' own network
stacks stall on this request while Node's does not; the exact cause is not pinned down (the Chromium
`--disable-http2` flag does not help, and Firefox with HTTP/2 off only sometimes recovers). A browser
that already has the script cached (e.g. a long-lived `playwright-cli` session) loads the app
instantly, which hides the problem during discovery.

**How to tell:** a trace whose `.network` shows the Maps script with status `-1` and every other
resource 200, or a page stuck at `document.readyState === 'loading'` with a null body.

**Adopted in the suite (2026-09-11):** `tests/helpers/googleMaps.ts` fulfils Google Maps requests
through Playwright's Node-side client (`context.route` + `route.fetch()`). The app still receives
the real script; only the transport changes. It is applied to every context the suite creates —
the `context` fixture in `tests/fixtures.ts` (so all fixture-based specs, now including
`public/login.spec.ts`), `probeAuthenticated`, the `auth.setup.ts` sign-in context and the
account-triage tool. A new spec or helper that calls `browser.newContext()` directly must call
`routeGoogleMapsViaNode(context)` too, or it will hang on an affected machine.

## 26. The resources fixture has drifted: seven people are no longer offered

**Verified:** 2026-09-11, live Supervisor dropdown vs `fixtures/resources.json` (captured 2026-08-26).

The live Supervisor list (and the Select Resources panel, "101 records") offers **101** people; the
fixture holds **108**. Every live name is in the fixture — the difference is seven fixture entries
the app no longer offers:

| Missing live | Fixture flags |
|---|---|
| `Agrierp 02 (02)` | active, not blocked, not dummy |
| `Joel Guzman (000012)` | active, not blocked, not dummy |
| `Kel Williams (000171)` | active, not blocked, not dummy |
| `Machine Operator (DM001)`, `Irrigator (DM002)`, `Irrigator 02 (DM003)`, `Dummy Res 04 (DM004)` | dummy resources |

The four dummy resources are plausibly filtered by design (the picker endpoints pass `isDummy=false`);
the three real people changed in D365 after the snapshot.

**What it broke:** `Agrierp 02 (02)` was the shared `SUPERVISOR` in `workOrderScenarios.ts`, so
every create flow (planned, tank-mix, harvest) hung on the Supervisor dropdown until the test
timeout — the search box filters to nothing and `selectFromDropdown` waits for an option that never
renders. The constant now uses `Agrierp 04 (04)`.

**Consequence for tests:** `byLabel` only proves a label is in the snapshot, not that the app still
offers it. When a dropdown pick times out with the search box holding the expected text, compare the
live list before suspecting the locator. Re-capture `resources.json` when this list changes again.

## 27. A QA build shipped mid-run and broke three specs in three different ways

**Verified:** 2026-09-14, live, comparing a passing run against a failing one ~40 minutes later.

A new QA build landed between two runs of the same suite. Nothing was flaky — three specs changed
verdict because the app changed under them:

| Change | Spec affected | How it surfaced |
|---|---|---|
| The Work Orders grid gained a **`Variety`** column (real, populated: "WOOD COLONY", "BUTTE/PADRE") | `WP-002` | "Expected: 14, Received: 15" |
| The D365 shortcut's tooltip became **"Click to navigate Microsoft Dynamics 365 F&O"** (was "Navigate To Erp") | `GN-029` | 90s timeout on `getByRole('link', { name: /Navigate To Erp/i })` — the link carries no text, so its accessible name IS the tooltip |
| `app-f3-mat-date-picker-input` now paints the date into a focusable `div.date-picker-input` and keeps the backing `input.mat-datepicker-input` **hidden and permanently empty** (`datepicker-input-hidden`) | `WP-020` | "WO Start/End Date are not pre-populated" against a form that visibly showed `09/09/2026` / `09/19/2026` |

None of these is a product defect. What each one is, is a lesson about where the suite was brittle:

- **`Variety`** — WP-002 asserted an exact column count, which is stricter than the case ("these 14
  columns are present"). Any column the app adds then fails the test. The enumerated set is now
  asserted for presence and the extras are pinned separately in `UNLISTED_COLUMNS`, so a new column
  still trips the test but reads as "the workbook does not list this" rather than as a defect. The
  workbook's WP-002 enumeration omits `Variety`; that is a gap in the workbook.
- **`GN-029`** — an accessible-name locator on a text-free link is really a locator on a tooltip
  string. It now matches either wording.
- **`WP-020`** — reading `input.value` on a Material datepicker assumes the input is the thing the
  user sees. Here it never was. Assert against what the build paints.

**Consequence for tests:** when several unrelated specs change verdict at once and the failures do
not share a mechanism, check for a deploy before chasing selectors. The tell is that each failure is
internally consistent — a *stale* selector, not a slow one — and that re-running does not help. The
opposite pattern (unrelated specs failing with empty trees, missing header entries and absent
defaults, all recovering on retry) points at the backend instead; see #9.

## 28. The scripted sign-in could re-submit VannBrosPhaseTwo's own login page as if it were Azure AD's

**Verified:** 2026-09-14, live — reproduced on an expired session, fixed and re-run clean.

`helpers/signIn.ts` walks four stages: VannBrosPhaseTwo `/login` → "Choose Environment" → Azure AD →
"Stay signed in?". Stage 3 accepted "whichever of the password or email prompt lands first",
matching the email prompt with `input[type="email"], input[name="loginfmt"]`.

**VannBrosPhaseTwo's own login field is also `input[type="email"]`**, and it stays in the DOM behind the
environment dialog. So the two stages were indistinguishable to that locator. When the dialog took
longer than stage 2's clipped 15s window to appear, the flow:

1. skipped stage 2 (no dialog *yet*),
2. matched the **app's** email field as Azure AD's re-prompt, refilled it and submitted,
3. waited out the remaining budget for a password prompt that was never coming,
4. returned without throwing (`signIn` is best-effort by contract), and
5. left `auth.setup.ts` to fall through to its **human-assisted wait** — which, with no human
   present, burned the whole 360s test timeout and failed the `setup` project.

Every dependent project then reported "did not run", so the symptom is a whole suite that does not
execute, with one six-minute failure at the top and no indication that a *locator* was at fault.

**Fixed** by giving stage 3 an Azure-AD-only locator (`input[name="loginfmt"]`, which Microsoft uses
on every tenant) and letting the dialog have the full step budget instead of a clipped window.
A fresh bootstrap now completes unaided in ~1.2 min.

**Consequence for tests:** a selector that matches the right element on the right page can still be
wrong if it also matches something on the page *before* it. In a multi-product flow, anchor each
stage on a marker unique to that product — not on a field type both of them happen to use.

---

## 29. A large Planned WO save never answers, and leaves two broken copies — product defect

**Verified:** 2026-09-17, reproduced twice with `pnpm seed:planned --count 1 --plots 99
--materials 50 --resources 3 --assets 50`.

The form fills correctly (99 plots, 50 materials, 3 resources, 50 assets in the grids) and the
browser sends **one** `POST /api/workOrder` (95 KB: `activities` 99, `materials` 50,
`resources` 3, `assets` 50). That request gets no response in two minutes and no success toast
appears. Even so, each attempt left **two** work orders with the same name:

| Run | Work orders |
|---|---|
| `Seed Planned WO 1789638946606-1` | WO-1258, WO-1260 |
| `Seed Planned WO 1789639301424-1` | WO-1261, WO-1262 |

All four show an empty Plots column in the list. Opening any of them shows
`Error [2] Index was out of range. Must be non-negative and less than the size of the
collection. (Parameter 'index')` and sends the user back to the list. The same flow with 10
plots, 1 material, 3 resources and 2 assets saves in about 40s (WO-1248 to WO-1252). With 2
plots, 30 materials, 1 resource and 1 asset it also saves (WO-1263). Which of the counts causes
the failure has not been narrowed down.

Since the page sent the request once, the second copy was created by the server or the gateway.
The most likely cause is a retry of the stalled request.

**Direct API, same day.** `pnpm seed:planned --api` sends the same body straight to
`vannbrosphasetwo-vann-api-qa` with no gateway in between. A 1/1/1/1 WO saves in about 7s (WO-1266,
healthy). The 99/50/3/50 WO had its connection dropped after **5 minutes** ("fetch failed")
and left **one** broken copy (WO-1267, `GET /api/WorkOrder/{id}/Detail` answers 500 with the same
"Index was out of range"; it was still broken minutes later and was deleted). With one copy
here, the second copy through the web app most likely came from the gateway retrying the
request.

**Suggested defect:** High. A save that times out should not leave records behind, and one save
must never store two. The four broken WOs above were removed from QA the same day
(`pnpm wo:delete`; WO-1258 and WO-1260 were already gone by then).

**Also found on the way:** Select Materials pages at 50 rows and half of page 1 is "DO NOT USE",
so the seed's `addFromModal` now pages through the panel with "→". Ticks survive moving between
pages, and Save keeps the ticks from every page.

## 30. `Field Code` on the Add Plot form takes 14 characters; the API caps it at 10 — product defect

ADO [#26093](https://dev.azure.com/AgriERPProduct/Vann%20Brothers/_workitems/edit/26093) asks for
field creation "via form **with limitations**". The Farm App's own model caps the code:
`PlotFieldAPIModel.code` is `maxLength 10` (vannbrosphasetwo-vann-api-qa skill).

**Settings → Plot → Add Plot does not enforce it.** Typing 14 characters into `Field Code` leaves
all 14 in the control, and Angular marks it valid — verified live twice, 2026-09-23:

```
locator resolved to <input id="code" type="text" formcontrolname="code"
                     placeholder="Field Code" class="form-control ng-untouched ng-dirty ng-valid"/>
  - unexpected value "12345678901234"
```

The input carries no `maxlength` attribute and the control reports `ng-valid`, so there is neither
a hard cap nor an inline validation message. Covered by `@ADO-26093 Field Code is capped at 10
characters` in `tests/authenticated/settings-plot.spec.ts`, which fails on this.

**Not established:** whether **Save** then fails server-side. Confirming that needs a second form
submission, and the mutating footprint for this work item is deliberately held at one plot on
Colusa — so it was left alone. Either way the form should reject the 11th character at entry
rather than let a user fill in a record that cannot be stored.

**Suggested defect:** Medium. Data-entry validation missing against a known model constraint.

## 31. The Settings → Plot grid is not scoped by the header Site selector

With the header on `Site: Colusa`, the grid still lists plots for `Yolo`, `Vann Brothers`,
`Karmdeep Bains`, `Atkinson Farms II Inc`, `Olive Glen Orchards LLC` and others (verified live
2026-09-23). It is the whole tenant's plot register.

A row's `Site` is a property of its **Farm** (`Vann Farm` → `Colusa`, `Yolo Farm` → `Yolo`), and
the Add Plot form has no Site field at all — only `Farms*`. So "create a plot on Colusa" means
"pick a Colusa farm", not "switch the header first".

Consequence for specs: `Field Code` repeats across farms by design (`12`, `13`, `15`, `130`, `131`
each appear several times), so a uniqueness assertion must be scoped to a farm, or use a code
generated to be tenant-unique. Not a defect — recorded because the opposite was assumed while
writing the plot specs.

## 32. The Settings → Plot grid sets its column `title` to the API field name, not the label

`ListPage` resolves a column through `div.table-header-search[title="<name>"]`. On this grid the
`title` is the backing API field, while the rendered heading is the display label (verified live
2026-09-23):

| Heading | `title` |
|---|---|
| Site | `locationName` |
| Farm | `farmName` |
| Field Code | `code` |
| Field Name | `name` |
| Total Area | `area` |
| Irrigation Method | `irrigationMethodCode` |
| Irrigation Sources | `irrigationSources` |

`expectColumns` reads `thead th` text, so it passes and the grid looks fine. `searchColumn` and
`sortColumn` do not: the locator matched nothing and the click waited out the **full 300s test
timeout** rather than failing fast. Fixed by mapping every one of these in `COLUMN_VARIANTS`
(`tests/pages/list.page.ts`).

Worth noting for future page objects: this is a third labelling convention for the same widget.
Work Orders serves display names, the other Settings grids serve lowercased display names
(`name`, `code`), and this one serves API field names.
