# ADO #26493: Grower's Portal session, blockers and questions

Prepared 2026-10-20 for the session with the Grower's Portal team, to close testing of Enhancement [#26493](https://dev.azure.com/AgriERPProduct/Vann%20Brothers/_workitems/edit/26493). Evidence: `playwright/test-plans/FINDINGS.md` #60 and #61, and the coverage report `playwright/coverage/runs/2026-10-16-qa-ado-26493.md` (rule 1).

## Blockers

1. **The Field list shows plots that aren't Vann's.** Planning offers 69 fields. Only 51 come from Vann Brothers' active contracts (GP grower 260). The other 18 appear only on other growers' contracts, like Salt Creek Orchards and Cortina Brothers. One of them, plot 285, now has 300 planned tickets on QA (285/CARMEL). We can't pass rule 1 until we agree which growers count.
2. **The contract sync pulls every grower's contracts.** The GP contract job brought in 602 contracts across all growers, not just Vann's, and pushed them to the Vann mobile app too. On 10-16 it also logged `Index was outside the bounds of the array`. Its "last fetched" date was still stuck at 10/12 that day.
3. **`Almonds Splits & Meats` shows up with no contract at all.** It's offered in planning but has no varieties.
4. **The old GP Fields and Varieties feeds are switched off (last run 10/09 and 09/16).** If the new lists depend on that data, field and variety changes made in GP may stop reaching us.

## Questions

1. Who is the "Vann Grower"? Only Vann Brothers (260), or also Vann Family Two (261), Vann-Peterson (262) and Carando/Vann Ranch (28)?
2. Should the contract sync only bring in those growers' contracts?
3. How does a GP contract plot get matched to our plot: by name only? Two growers both have a plot called "Shop", for example.
4. What counts as an "active" contract? We assumed status Active for the current crop year, and that closed 2025 contracts drop out. That's how it works today. Is that correct?
5. If a contract is closed or changed in GP, how soon does planning reflect it? Which job carries the change?
6. Are the old GP Fields and Varieties feeds meant to be off now?
7. Can you give us one Vann contract we can change on GP QA? Add a plot, close it, and so on. Then we can check the rule end to end. We stay read-only on GP until you agree.

## Answers

_To be filled in after the session._
