# ADO #25969 — Total acres option that divides it to all the selected resources

Source: [dev.azure.com/AgriERPProduct/Vann Brothers/_workitems/edit/25969](https://dev.azure.com/AgriERPProduct/Vann%20Brothers/_workitems/edit/25969)

| Field | Value |
|---|---|
| Work item type | Enhancement |
| State | New (since 2026-10-06) |
| Priority | 2 |
| Area / Iteration | `Vann Brothers` / `Vann Brothers\Vann Brothers Phase 2` |
| Created by | hammadahmed — 2026-08-20 |
| Assigned to | mhaseebsiddiqui |
| Revision | 7 (last changed 2026-10-07) |
| Spec | None. No PSD, mock-up or attachment on the ticket |
| Related | None linked |

## Scope (ticket description)

On the mobile app, when a user selects **Pause job**, the **Progress** tab gives two options for entering area:

- **Individual** (default): enter the area separately for each selected user.
- **Distribute Equally**: enter the **Total Acres** once, and the system divides it equally among all
  selected users. The distributed area is read-only and updates automatically when users are selected
  or removed.

## Comment (Umair Ahmed Awan, 2026-08-24)

This looks like a new enhancement, not a bug. Asked for the ticket type to be changed and for more
detail or acceptance criteria. Today, progress is added per resource, not as a cumulative total
split across resources.

## Developer note (mhaseebsiddiqui, 2026-10-07 14:49)

iOS change on branch `bugfix/25969-total-acres-option-that-divides-it-to-all-the-sele`, commit
`ad8056e5b`. App-only: each user's area is still saved separately, so no web or backend change.

**Implemented**

- **Individual | Distribute equally** switch below the Progress / Materials tabs on the Pause Job /
  End Job / Save Progress screen for a block. Also on each block page of the multi-block end job screen.
- Shown only for **area-based blocks with more than one user**. Individual is the default and works as before.
- Distribute equally: a **Total Acres** field and the hint `Distributed equally across N selected users`.
  Each selected user's area fills in to 2 decimals and is read-only.
- Rounding: leftover 0.01s go to the last user(s), so shares add up to the total
  (4.75 / 2 → 2.37 + 2.38; 10 / 3 → 3.33 / 3.33 / 3.34).
- Shares recalculate on select / unselect, Select All and search. Unselected users get no area.
  The supervisor row (no area field when there are other workers) gets no share.
- Files: `WorkerSelectionWithRowProgressViewController.swift`,
  `WorkerSelectionWithRowProgressController+BC.swift`, `WorkerSelectionTableViewCell.swift`,
  `RemoteConfigLanguageModel.swift` (new labels).

**Still open (per dev)**

- Rounding rule to be confirmed by product (said to match the mock-up).
- Mode isn't remembered: the screen opens in Individual every time.
- No upper limit: Total Acres isn't checked against the block's remaining area.
- Empty Total Acres: users get no area.
- New labels have English fallbacks only; other languages still to add.
- Not changed: harvesting end-job screen and percentage-progress (general WO) screen.
- Dev notes also mention a "Finops app" regression check. Per Wania there is no such app; dropped.
- Not yet built or run. Layout on a small device and with the keyboard open to be checked.

## Product answers (received by QA, 2026-10-09)

1. **Work order types:** all except Inspection WO.
2. **Display:** only when the block has multiple resources. Default view is always **Individual**.
3. **Platforms (Wania, 2026-10-09):** iOS app and Farm web app only. There is no Finops app,
   and acreage is not posted to D365.
4. **Overdue allowed:** yes. QA reads this as Total Acres may exceed the block's remaining area;
   still to confirm whether overdue WOs (past End Date) were meant.

## QA notes

- Test cases: `playwright/test-plans/authenticated/work-orders-distribute-acres-ios.md` and
  `work-orders-distribute-acres-ios.xlsx` (DIST-001..062, 39 cases, manual iOS + web check).
- **Conflict:** product says all WO types except Inspection. The dev notes say the harvesting end-job and
  percentage-progress screens weren't changed. DIST-053 / DIST-054 cover it; expect a gap on Harvest WOs.
- Ticket is still `New`, but a fix is on a branch. Confirm the iOS build under test contains `ad8056e5b`.
- Only an iOS change is recorded. No D365 / journal checks needed: acreage isn't posted there.
