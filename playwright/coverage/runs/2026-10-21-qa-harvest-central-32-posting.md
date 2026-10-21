# Posting Harvest Central 32 tickets (QA, 21 Oct 2026)

We took the harvest tickets on [Harvest Central 32](https://agrierp-vann-qa.folio3.site/harvest-central/32) that had reached the warehouse system (WMS), weighed them in WMS, and posted them from the Farm App.

- **Field / variety:** 342 / WOOD COLONY (grower Vann Family Two LLC in WMS)
- **Project:** PRJ_000019 · **Season:** Crop Year 2026 · **Site:** Colusa
- **Tickets on the page:** 20, all In Progress at the start, created by Crop Planner

## Summary

| # | What we checked | Result | What it means |
|---|---|---|---|
| 1 | How many tickets reached the warehouse? | ⚠️ 8 of 20 | The other 12 were rejected because their truck has no carrier (see below). |
| 2 | Could the 8 be weighed and given a stockpile in WMS? | ✅ Yes | All 8: gross 62,000 lbs, tare 18,000 lbs, net 44,000 lbs, stockpile 1000-07. |
| 3 | Did the weight come back to the Farm App? | ✅ Yes | All 8 showed Actual Weight 44,000 and moved to Received within about a minute. |
| 4 | Could the 8 be posted from the Farm App? | ✅ Yes | All 8 are Posted, with journals VBS-000531 to VBS-000538. |
| 5 | Are the journals correct in D365? | ✅ Yes | 8 posted Movement journals, one line each, 44,000 of almonds (item 90000, WOOD COLONY) into the YHS location. See below. |
| 6 | Did the warehouse get the right carrier, driver, truck and trailers? | ❌ 1 of 8 correct | 7 tickets arrived with at least one wrong item. This is the known duplicate data problem (ADO #26706). |

## The 8 tickets that reached the warehouse

| Farm ticket | WMS ticket | Gross / Tare / Net (lbs) | Stockpile | Farm status | D365 journal |
|---|---|---|---|---|---|
| HT-342-YWKBU-26 | 6135 (FT-0300087) | 62,000 / 18,000 / 44,000 | 1000-07 | Posted | VBS-000535 |
| HT-342-I144Q-26 | 6136 (FT-0300088) | 62,000 / 18,000 / 44,000 | 1000-07 | Posted | VBS-000533 |
| HT-342-FX7JM-26 | 6137 (FT-0300089) | 62,000 / 18,000 / 44,000 | 1000-07 | Posted | VBS-000536 |
| HT-342-W0E5F-26 | 6138 (FT-0300090) | 62,000 / 18,000 / 44,000 | 1000-07 | Posted | VBS-000531 |
| HT-342-BQBML-26 | 6139 (FT-0300091) | 62,000 / 18,000 / 44,000 | 1000-07 | Posted | VBS-000532 |
| HT-342-O6ZE6-26 | 6140 (FT-0300092) | 62,000 / 18,000 / 44,000 | 1000-07 | Posted | VBS-000537 |
| HT-342-5B2BP-26 | 6141 (FT-0300093) | 62,000 / 18,000 / 44,000 | 1000-07 | Posted | VBS-000534 |
| HT-342-3Z4QR-26 | 6142 (FT-0300094) | 62,000 / 18,000 / 44,000 | 1000-07 | Posted | VBS-000538 |

Page counts after posting: 0 Planned · 12 In Progress · 0 Received · 8 Posted.

## D365 journals

All 8 journals (VBS-000531 to VBS-000538) are posted in company `vbs`, by `Admin`, between 13:04 and 13:10 local time. Each has the same single line:

| Field | Value |
|---|---|
| Journal type | Movement ("Inventory Movement Journal") |
| Item / configuration | 90000 / WOOD COLONY |
| Site / warehouse / location | 01 / 0401 / YHS |
| Batch | WOOD COLONY-342-2026 |
| Quantity | 44,000 (matches the WMS net weight) |
| Date | 21 Oct 2026 |

The lines carry no project, so PRJ_000019 is not on the journal. This is the same as the Harvest Central 27 run and is still an open question for the team.

## The 12 tickets that never reached the warehouse

Each one was rejected by the sync with `'Fleet External Ref Id' must not be empty.` The Farm App takes a ticket's carrier from its truck, and none of these trucks has a carrier, either in the Farm App or in AgriAdmin. The Farm App shows no error; the ticket just stays "Awaiting From Yhs".

| Farm ticket | Truck | AgriAdmin truck | Sync attempt (Burq packet) |
|---|---|---|---|
| HT-342-ETYB5-26 | 9A77616 | #390, no carrier | 15987 |
| HT-342-SLWR3-26 | 9B48681 | #234, no carrier | 15983 |
| HT-342-JZQ2P-26 | 9B48681 | #234, no carrier | 15990 |
| HT-342-1SZ76-26 | 9B48502 | #363, no carrier | 15993 |
| HT-342-5IB70-26 | 9C19063 | #236, no carrier | 15979 |
| HT-342-5DC6E-26 | 65062P3 | #231, no carrier | 15985 |
| HT-342-KCW6A-26 | 9618578 | #402, no carrier | 15986 |
| HT-342-EH178-26 | 9B48691 | #235, no carrier | 15984 |
| HT-342-ENG0W-26 | 26RT | #467, no carrier | 15995 |
| HT-342-HD8GG-26 | 9E25236 | #241, no carrier | 15982 |
| HT-342-3AIKN-26 | 9A77616 | #390, no carrier | 15988 |
| HT-342-02TE4-26 | 9B16725 | #233, no carrier | 15996 |

To get these through, either give these trucks a carrier in AgriAdmin, or let the ticket form ask for a carrier (ADO #26707).

## Wrong transport details in the warehouse

We looked up what the sync sent for each ticket in AgriAdmin, whose ids are the warehouse's ids.

| Farm ticket | WMS | Farm App says | Warehouse received |
|---|---|---|---|
| HT-342-W0E5F-26 | 6138 | Front trailer 1UD7442 | 1Vh5715 |
| HT-342-BQBML-26 | 6139 | Front trailer 1UD7442 | 1Vh5715 |
| HT-342-I144Q-26 | 6136 | Carrier RPAC · Driver Camarena Gonzalez, Jose · Truck 9E27049 · Rear trailer 1UR5851 | JT Ag Services · Montoya, Gregory Jr · 9H02762 · 1VN6449 |
| HT-342-5B2BP-26 | 6141 | Carrier J & H Trucking company · Truck 9B16724 · Front trailer 1UD7442 | Pearl Crop · ZP05558 · 1Vh5715 |
| HT-342-FX7JM-26 | 6137 | Carrier Mezger Trucking, LP · Truck 9D47015 · Front trailer 1UD7442 | RPAC · 9G11005 · 1Vh5715 |
| HT-342-O6ZE6-26 | 6140 | Front trailer 1UD7442 | 1Vh5715 |
| HT-342-3Z4QR-26 | 6142 | Front trailer 1UD7442 | 1Vh5715 |
| HT-342-YWKBU-26 | 6135 | — | All correct |

Trailer 1UD7442 is AgriAdmin #18, but the Farm App's old copy sends #51 (1Vh5715). The same happens for the carriers and trucks above. This matches the duplicate problem in the [AgriAdmin data check](2026-10-20-qa-agriadmin-master-data.md) and ADO #26706. Weights and postings are not affected.

## Other things we noticed

| # | What happened | Impact |
|---|---|---|
| 1 | WMS had no stockpile to recommend for the first 342 / WOOD COLONY load, so we picked one by hand. Later loads were offered 1000-07 automatically. | Expected for a first load. |
| 2 | WMS listed stockpile 1000-023 as empty (0 lbs, no grower), but refused it: `Cannot post inventory at a location that already contains inventory from a different batch.` The next one, 1000-07, worked. | The list shows piles as free when they are not. Staff would have to guess. |
| 3 | Opening the Harvest Central 32 page directly sometimes showed a blank page. Opening Harvest Central first and then the row worked. | Minor; a refresh or going through the list fixes it. |
| 4 | The ticket list shows 10 per page, so 5 of the 8 were on page 2. Post Ticket still worked one at a time after a reload (see the earlier "already posted" problem, FINDINGS #74). | None; noted for testers. |

## Still to do

- Confirm with the team whether the journal lines should carry the project (PRJ_000019).
- Decide what to do with the 12 tickets that cannot sync until their trucks have a carrier.
