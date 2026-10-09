# Test Plan — Distribute Total Acres Equally Across Selected Users (iOS)

- **ADO:** [#25969](https://dev.azure.com/AgriERPProduct/Vann%20Brothers/_workitems/edit/25969) — Enhancement, "Total acres option that divides it to all the selected resources" (state `New` on 2026-10-09)
- **Work item copy:** `resources/work-items/25969-total-acres-distribute-equally.md` (description, dev note, product answers)
- **Build under test:** iOS build that contains branch `bugfix/25969-total-acres-option-that-divides-it-to-all-the-sele`, commit `ad8056e5b`. Record the build number in the run log. The dev notes say the change "hasn't been built or run" yet, so confirm the commit is in the build before you start.
- **Workbook:** `work-orders-distribute-acres-ios.xlsx` (same cases, with Result column)
- **Spec:** _none, manual only_ (native iOS UI; Playwright does not cover it)
- **Automation status:** Manual
- **Source of truth:** product answers received 2026-10-09 (see [Product decisions](#product-decisions-2026-10-09)) override the developer's handover notes on #25969 where they differ. No PSD or mock-up is attached to the ticket. Mobile execution and role rules: `vannbrosphasetwo-knowledge` (SKILL.md role table, `references/work-orders.md`)
- **Last updated:** 2026-10-09

## Scope

On the mobile **Pause Job** / **Save Progress** / **End Job** screen for a block, the **Progress** tab gets an **Individual | Distribute equally** switch:

- **Individual** (default): area is typed for each selected user, as before.
- **Distribute equally**: a **Total Acres** field and the hint `Distributed equally across N selected users`. Each selected user's area fills in automatically to 2 decimals and is read-only. The shares recalculate when users are selected or unselected.
- **Rounding** (per dev notes, *product to confirm*): round down to 2 decimals and give the leftover 0.01s to the last user(s), so the shares always add up to the total.
- **Work order types:** all types **except Inspection** (product, 2026-10-09). So Planned, Tank Mix and Harvest WOs must show the switch. The dev notes say the harvesting end-job and percentage-progress screens were **not** changed, so those cases may fail: raise the gap on #25969.
- **Shown only** with multiple resources on the block, and always opens in **Individual** (product, 2026-10-09). **Hidden** on the Materials tab, for rows/beds blocks, inspection WOs, single-resource blocks and the Finops app.
- **No upper limit:** Total Acres may exceed the block's remaining area ("overdue allowed", product, 2026-10-09).
- App-only change: each user's area is saved separately, as before. No web or backend change.

## Preconditions and test data (QA env, VBS tenant)

| Item | Value |
|---|---|
| Device | iPhone with the build above. Also an iPhone SE (or the smallest screen available) for the layout case |
| Mobile login | A **Supervisor** resource. Supervisors can start and end WOs for themselves and others. Check the resource group on web before filing a "switch missing" bug (a Farm Hand gets a different screen) |
| WO A | Planned WO, `In Progress`, one **area-based (acres)** plot/block, Supervisor + **3 Farm Hands** started on the job |
| WO B | Same as A but with **2 blocks** (for multi-block End Job) |
| WO C | Planned WO with a **rows/beds** block and 2+ users (regression) |
| WO D | WO with an area-based block and **1** user only (regression) |
| WO E | Inspection WO with 2+ users (regression) |
| WO F | Tank Mix WO, `In Progress`, area-based block, 2+ users |
| WO G | Harvest WO, `In Progress`, area-based block, 2+ users |
| WO H | Planned WO whose **End Date is in the past** (overdue), `In Progress`, area-based block, 2+ users |
| Web check | QA web → **Work Orders** → WO → eye icon (View) → **Plots** grid (`Progress`, `Operational Area - ac`) and the Supervisor **View Spent Hours** |

Note the block's remaining area before each saving case. Totals above it are allowed, so you will need it to judge totals.

## Test cases

### Display and default

| ID | Title | Pri | Steps | Expected result | Type |
|---|---|---|---|---|---|
| DIST-001 | Switch shows with Individual as default | P1 | WO A → tap **Pause Job** → **Progress** tab | **Individual \| Distribute equally** switch appears below the Progress / Materials tabs, **Individual** is selected, each user row has an editable area field (as before the change) | Smoke |
| DIST-002 | Same switch on Save Progress | P1 | WO A → **Save Progress** → **Progress** | Same as DIST-001 | Functional |
| DIST-003 | Individual mode unchanged | P1 | In Individual mode, enter 1.5 / 2 / 0.5 for the 3 users → save | Saved exactly as typed. Nothing is auto-filled | Regression |
| DIST-004 | Switch hidden on Materials tab, state kept | P2 | Distribute equally, Total Acres 6 → **Materials** tab → back to **Progress** | Switch is not on Materials. Back on Progress: still **Distribute equally**, Total Acres still 6, shares still 2.00 each | Functional |
| DIST-005 | Mode not remembered between openings | P3 | Save in Distribute equally → reopen Pause Job | Screen opens in **Individual**. Confirmed by product: default view is always Individual | Functional |

### Distribution and rounding (Distribute equally)

| ID | Title | Pri | Test data (Total Acres / selected users) | Expected shares (read-only) | Type |
|---|---|---|---|---|---|
| DIST-010 | Total Acres field and hint appear | P1 | Tap **Distribute equally** | **Total Acres** field shows, hint reads `Distributed equally across 3 selected users`, per-user area fields become read-only (no keyboard on tap) | Smoke |
| DIST-011 | Even split | P1 | 6 / 3 | 2.00, 2.00, 2.00 | Functional |
| DIST-012 | Uneven split, 2 users | P1 | 4.75 / 2 | 2.37, 2.38 (sum 4.75) | Functional |
| DIST-013 | Uneven split, 3 users | P1 | 10 / 3 | 3.33, 3.33, 3.34 (sum 10.00) | Functional |
| DIST-014 | Remainder over 2 users | P2 | 1 / 7 (if you have 7 users), otherwise 0.05 / 3 | 0.14×5 + 0.15×2, or 0.01, 0.02, 0.02. Sum equals the total | Edge |
| DIST-015 | Total smaller than user count × 0.01 | P2 | 0.01 / 3 | 0.00, 0.00, 0.01. Check how 0.00 users are saved (no log or zero log) | Edge |
| DIST-016 | More than 2 decimals typed | P2 | 4.755 / 2 | Field rejects or rounds the 3rd decimal. Shares still sum to what the Total Acres field shows | Negative |
| DIST-017 | Zero, negative, non-numeric | P2 | 0; -5; paste `abc`; `4,75` (EU keypad) | 0 gives no area. Negative and text are blocked (decimal keypad). Note how a comma decimal is handled | Negative |
| DIST-018 | Empty Total Acres | P2 | Leave blank → save | Users get no area, same as empty fields in Individual mode (per dev notes) | Edge |
| DIST-019 | Total above remaining area allowed | P2 | Total larger than the block's remaining area, e.g. remaining + 5 | Accepted, shares split as usual, saves without a blocking error (product: overdue allowed) | Edge |

### Selection changes

| ID | Title | Pri | Steps | Expected result | Type |
|---|---|---|---|---|---|
| DIST-020 | Unselect a user | P1 | 10 / 3 → unselect user 3 | Hint shows `2 selected users`. Shares 5.00, 5.00. Unselected user's area is empty | Functional |
| DIST-021 | Reselect a user | P1 | Continue DIST-020 → reselect user 3 | Back to 3.33, 3.33, 3.34 and `3 selected users` | Functional |
| DIST-022 | Select All toggle | P1 | Toggle **Select All** off, then on | Off: no shares (check the hint at 0 users, no crash or divide-by-zero). On: shares spread over all users again | Functional |
| DIST-023 | Selection through search | P2 | Search a user name → select or unselect from the filtered list → clear search | Count and shares include the change. Users hidden by the search keep their selection and share | Functional |
| DIST-024 | Down to one selected user | P2 | 10 / 3 → unselect two users | Single user gets 10.00. Note whether the switch stays visible (it only shows for blocks with >1 user) | Edge |
| DIST-025 | Supervisor row gets no share | P1 | WO A, Supervisor plus workers listed | Supervisor row has no area field and no share. N in the hint counts workers only | Functional |

### Switching back and saving

| ID | Title | Pri | Steps | Expected result | Type |
|---|---|---|---|---|---|
| DIST-030 | Back to Individual keeps values | P1 | 4.75 / 2 → switch to **Individual** | Fields become editable and still show 2.37 / 2.38. Total Acres field hides | Functional |
| DIST-031 | Pause Job saves distributed values | P1 | 10 / 3 → **Pause Job** | Saved without error. The block's Total Area increases by 10.00. Each user's progress log shows 3.33 / 3.33 / 3.34 | Smoke |
| DIST-032 | Save Progress saves distributed values | P1 | 4.75 / 2 → **Save Progress** | As DIST-031 with 2.37 / 2.38 | Functional |
| DIST-033 | Web reflects mobile values | P1 | After DIST-031, open WO A on QA web → View → **Plots** grid and **View Spent Hours** | Plot progress / area includes the 10.00 total. Per-user split matches mobile. Nothing posts to D365 at this point | Functional |
| DIST-034 | Edit after switch, then save | P2 | Distribute 6 / 3 → Individual → change user 1 to 3 → save | Saved 3 / 2 / 2 (the Individual edits win) | Edge |

### Multi-block End Job

| ID | Title | Pri | Steps | Expected result | Type |
|---|---|---|---|---|---|
| DIST-040 | Switch on each block page | P1 | WO B → **End Job** | Every area-based block page has its own switch, defaulting to Individual | Functional |
| DIST-041 | Blocks are independent | P1 | Block 1: Distribute 4.75 / 2. Block 2: Individual 1 / 1.5 → End Job | Each block saves its own values. Block 1's mode and total don't leak into block 2 | Functional |
| DIST-042 | Paging back keeps state | P2 | Fill block 1 → go to block 2 → back to block 1 | Block 1 still in Distribute equally with the same total and shares | Functional |

### Work order type coverage

| ID | Title | Pri | Steps | Expected result | Type |
|---|---|---|---|---|---|
| DIST-050 | Rows/beds block: hidden | P1 | WO C → Pause Job → Progress | No switch. Rows/beds entry as before | Regression |
| DIST-051 | Single-resource block: hidden | P1 | WO D → Pause Job → Progress | No switch | Regression |
| DIST-052 | Inspection WO: hidden | P1 | WO E → Pause/End Job | No switch (the only WO type excluded) | Regression |
| DIST-053 | Harvest WO: shown | P1 | WO G → Pause Job / Save Progress / End Job → Progress | Switch shown, Individual default, distribution as DIST-012. Dev notes say the harvesting end-job screen wasn't changed: if missing, log against #25969 | Functional |
| DIST-054 | Percentage-progress (general) WO | P2 | General WO with 2+ users → Pause/End Job | Product says all types except Inspection. Dev notes say this screen has no per-user area. Record what shows and confirm with product before filing | Functional |
| DIST-055 | Finops app | P3 | Open the equivalent screen in the Finops app | No switch | Regression |
| DIST-056 | Tank Mix WO: shown | P1 | WO F → Pause Job → Progress → Distribute equally, 4.75 / 2 → Pause Job | Switch shown, Individual default, shares 2.37 / 2.38, saved | Functional |
| DIST-057 | Overdue WO: shown and saves | P2 | WO H → Pause Job → Progress → Distribute equally, 10 / 3 → Pause Job | Switch shown and works as on WO A. No overdue warning blocks the save | Functional |

### UI and language

| ID | Title | Pri | Steps | Expected result | Type |
|---|---|---|---|---|---|
| DIST-060 | Small screen + keyboard | P2 | iPhone SE, Distribute equally, focus Total Acres | Switch, field, hint and first user row are all visible above the keyboard. No clipped text. Keyboard can be dismissed | UI |
| DIST-061 | Large text (Dynamic Type) | P3 | Settings → larger text → repeat DIST-010 | Labels wrap and nothing overlaps | UI |
| DIST-062 | Non-English language | P3 | Switch the app language → open the screen | New labels show English fallback text (`Distribute equally`, `Total Acres`, hint). Known gap: translations still to be added | UI |

## Product decisions (2026-10-09)

1. **WO types:** all except Inspection WO. Covers Planned, Tank Mix and Harvest (DIST-053, DIST-056).
2. **Display:** shown only with multiple resources. Default view is always **Individual**, so the mode is not remembered (DIST-001, DIST-005, DIST-051).
3. **Overdue allowed: yes.** Read as Total Acres above the block's remaining area (DIST-019). Overdue WOs past their End Date are also covered (DIST-057). Confirm which one product meant.

## Open questions for product

1. Rounding rule: 2 decimals, leftover to the last user(s). Matches the mock-up per the dev, but the mock-up isn't attached to the ticket.
2. Translations for the three new labels.
3. Harvest and percentage-progress screens: product says covered, dev notes say not changed (DIST-053, DIST-054).

## Run log

| Date | Build | Device / iOS | Tester | Result | Notes / bugs |
|---|---|---|---|---|---|
| | | | | | |
