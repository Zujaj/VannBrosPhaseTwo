# Journals & Postings (D365 review)

Source manuals: *Review Postings*, *Transfer journal review*, *Return Transfer journal review*, *Return Item Journal Review* — Vann Brothers / VBS, V1.0.

These are **review/verification** flows inside **Microsoft Dynamics 365 Finance & Operations**, company context `VBS | VANN BROTHERS`. VannBrosPhaseTwo field activity (consumption, dispatch, returns) is synced to D365 by a **batch job**, which **posts** the journals. The reviewer confirms what the integration posted — these manuals do **not** cover data entry, approval clicks, or validation rules.

Journal/voucher IDs are prefixed `VBS-` (e.g. `VBS-000086`, `VBS-000546`, `VBS-000908`, `VBS-IB-001491`).

## Journal types at a glance

| Type | What it records | Navigation | Identifier / cue |
|---|---|---|---|
| **Posting (Item Journal)** | Item/material consumption against a Project | Project Management And Accounting > Journals > Item | Description "Project Item Journal"; Show = Posted |
| **Posting (Expense Journal)** | Expense consumption against a Project | Project Management And Accounting > Journals > Expense | Name PEJ/PEJ2; has Approval + Rejected by |
| **Transfer (dispatch)** | Moves inventory OUT of shed/source when dispatched | Inventory Management > Journal entries > Items > Transfer | **Name = INV-ISSUE**, Posted = Yes |
| **Return Transfer** | Moves leftover inventory BACK to shed | (same Transfer screen) | **Name = INV-RECV**, Posted = Yes |
| **Return Item** | Reverses item consumption; returns stock | Project Management And Accounting > Journals > Item | **Negative Quantity / Cost amount** on lines |

## Common review pattern (all flows)

1. Open the journal list for the type.
2. Change the showing view to **posted**: Item/Expense use the **Show** dropdown (`All` / `Not posted` / **`Posted`**); Transfer uses the **Posted** column filter (operator "is exactly", value **Yes**).
3. **Search the journal number**, OR sort the `Journal` column **Z to A** to surface the latest posted journal.
4. Open the journal → inspect **Line details**.

## Item Journal / Expense Journal (Postings)

- **Item journal** path: PM&A > Journals > Item. Business case (verbatim): "Item and expense consumption will be posted through VannBrosPhaseTwo and sync with D365 through batch job and Item journal and expense journal will be posted according to their respective job."
- List columns (item): `Name`, `Journal`, `Description` ("Project Item Journal"), `Lines`, `Posted`, `In...`. Tabs: Overview, General, Setup, Blocking, History, Store inventory.
- **Expense journal** path: PM&A > Journals > Expense. Columns: `Journal batch number`, `Name` (PEJ/PEJ2), `Description` ("Project Expense Journal"), `Posted`, `Posted on`, `Log`, `Modified by`, `Rejected by`. Has **Approval** action + **Rejected by** state. Checkbox "Show user-created only".
- Filter cue: sort `Journal` (item) or `Journal batch number` (expense) Z to A for the latest.

## Transfer Journal (dispatch)

- Path: Inventory Management > Journal entries > Items > Transfer.
- Business case: "transfer journal is posted whenever inventory is dispatch from the inventory app."
- List columns: `Journal`, `Name` (**INV-ISSUE**), `Description` ("Item transfer"), `Lines`, `Posted`, `Workflow approval status` (shown `None`).
- Open journal → Line details → **Inventory dimensions** tab, split **FROM INVENTORY DIMENSIONS** / **TO INVENTORY DIMENSIONS**: `Site` (01), `Warehouse`, `Batch number` (LOT-…), `Location` (e.g. CHMCLSHED → Staging), etc. Dispatch moves stock OUT of the shed (`CHMCLSHED`) → `Staging`.
- Action bar: Edit, New, Delete, Validate, Post, Functions, View postings, Print, Unlock, Workflow, Options.

## Return Transfer Journal

- Same navigation and screen as Transfer. Sole differentiator (verbatim): "Journal name must be **'INV-RECV'** for the return transfer journal."
- Direction is reversed: FROM `Staging` → TO `CHMCLSHED` (returns leftover stock to the shed).

## Return Item Journal

- Path: PM&A > Journals > Item.
- Business case: returned item consumption synced from VannBrosPhaseTwo "will create a line in the item journal with the negative quantity."
- Line columns: `Project date`, `Project ID` (PRJ_…), `Item number`, **`Quantity` (negative, e.g. -0.50)**, `Line property`, `Cost price`, **`Cost amount` (negative)**, `Activity` (e.g. Irrigation), `Log`.
- Verification cue: the **negative quantity / cost amount** line marks it as a return.

## Relationships

VannBrosPhaseTwo field activities → batch-job sync → D365 journals.
- Item/Expense journals tie to **Projects** (Project ID, Activity) under PM&A.
- Transfer / Return-transfer journals tie to **inventory locations/warehouses** (shed ↔ staging) under Inventory Management.
- Returns are expressed either as a **negative-quantity item-journal line** or a **reverse-direction (INV-RECV) transfer journal**.

## Scope note

V1.0 manuals document only review of already-posted journals. They do not document approval-button clicks, state-transition rules, validation logic, error messages, or URLs.
