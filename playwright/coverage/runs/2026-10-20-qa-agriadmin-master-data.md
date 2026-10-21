# Truck, driver and carrier data check: Farm App vs AgriAdmin (QA, 20 Oct 2026)

AgriAdmin is the main list of carriers, drivers, trucks and trailers. The warehouse system (WMS) uses the same list. I compared it with what the Farm App's Harvest Central offers when someone fills in a harvest ticket.

## Summary

| # | What we checked | Result | What it means |
|---|---|---|---|
| 1 | Is every AgriAdmin carrier, driver, truck and trailer in the Farm App? | ✅ Yes | Nothing is missing. |
| 2 | Does each truck show the same carrier in both apps? | ✅ Almost all (515 trucks) | One truck, `9G07695`, has no carrier in the Farm App but FEDORA FARMS in AgriAdmin. |
| 3 | Does the Farm App list each item once? | ❌ No | Most items appear twice under the same name. |
| 4 | When a ticket goes to the warehouse, does it arrive with the right carrier and truck? | ❌ Mostly no | 24 of the 28 tickets sent so far arrived with the wrong carrier and truck. |
| 5 | Does the Farm App have items that AgriAdmin doesn't? | ⚠️ Yes | These are old test or sample entries with no match in AgriAdmin. |
| 6 | Does every AgriAdmin truck have a carrier? | ⚠️ No: 186 of 472 trucks have none | A ticket that uses one of these trucks never reaches the warehouse, and nobody is told. |

## Items listed twice in the Farm App

| Type | In AgriAdmin | Shown in the Farm App | Names that appear twice |
|---|---:|---:|---:|
| Carriers | 105 | 198 | 86 |
| Drivers | 357 | 666 | 112 |
| Trucks | 472 | 773 | 299 |
| Trailers | 4,172 | 8,058 | 3,849 |

Each item exists as an **old copy** (loaded in June as sample data) and a **new copy** (added later from AgriAdmin). The lists show both under the same name and pick the old copy first. The old copy points to the wrong record in the warehouse system.

## Example: one of today's tickets (HT-311-BI1PU-26)

| | Farm App ticket says | Warehouse received |
|---|---|---|
| Carrier | Emerald Farms | Manzano |
| Driver | Bravo, Ricardo | Rybakov, Ivan Pavlovich |
| Truck | 9D46925 | 9E49938 |
| Front trailer | 4AY1373 | 4BW2834 |

7 of the 9 tickets we completed today for field 311 / BUTTE carry the wrong carrier and truck in the warehouse. The weights and postings are correct.

## Items only in the Farm App

| Type | How many | Examples |
|---|---:|---|
| Carriers | 6 | QAHasan3, QAHasan4, QAHasan 5, UAT-QA-CARRIER-2026-08-11, Grizzly Nut, Bill Amarel Trucking |
| Drivers | 197 | Castillo, Jesus · Chavez, Antonio · Lopez, Hector · John |
| Trucks | 2 | TRK-0001234, 9G86593 |
| Trailers | 37 | TRL-100 to TRL-1xx, LP-1123, TRL-234 |

## Duplicates inside AgriAdmin

AgriAdmin itself has no exact duplicates. Every carrier, driver, truck and trailer has its own id and its own name or plate, and none are inactive or blank.

| Type | Records | Exact duplicates |
|---|---:|---:|
| Carriers | 105 | 0 |
| Drivers | 357 | 0 |
| Trucks | 472 | 0 |
| Trailers | 4,172 | 0 |

A looser check (ignoring spaces, commas and name order) found two records that look like the same thing entered twice, and one shared placeholder licence:

| Type | Records | Why it looks like a duplicate | Our view |
|---|---|---|---|
| Driver | #94 `Saavedra, Antonio` (licence B7477883, added 30 Jun) and #234 `Antonio Saavedra` (licence B747783, added 16 Aug) | Same name in a different order; licence numbers differ by one digit | Likely the same person twice, with a typo in one licence |
| Trailer | #3 `102A` and #2542 `102 A` (both added 30 Jun) | Same plate apart from a space | Likely the same trailer twice |
| Driver | #251 `YHS Driver` (licence `0123456`) and #252 `Jared Morrison` (licence `0123456.`) | Licence numbers differ only by a dot | Two different people; both licences look like placeholders |

This check compared names, plates and driver licences only. Phone numbers and addresses were not compared, and only active records were checked.

## Suggested fixes

| # | Fix | Who |
|---|---|---|
| 1 | Remove the old duplicate copies from the Farm App, or correct where they point | Dev / data team |
| 2 | Remove test-only carriers, drivers, trucks and trailers from the Farm App lists | Dev / data team |
| 3 | Show each carrier, driver, truck and trailer once in the ticket form | Dev |
| 4 | Give every truck in AgriAdmin a carrier, or let the ticket form ask for one | YHS admin / Dev |
| 5 | Fix the carrier and truck on the 7 tickets from today that went to the warehouse wrong | Agree with the team first |
| 6 | Merge driver #94 / #234 and trailer #3 / #2542 in AgriAdmin, and replace the placeholder licences on #251 / #252 | YHS admin |

Related bug: ADO #26706 (wrong transport details in the warehouse). This check shows the problem is much wider than first reported.
