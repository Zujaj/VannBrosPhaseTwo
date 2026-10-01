---
name: production-sync-console-error-logger
description: >-
  Read-only error report from the PRODUCTION AgriERP Sync Console (vann-farms.agrierp.com).
  Signs in, opens Message Stats with "Errors Only" on to find every job with errors, then pulls each
  Error message from Sync Console > Messages with its Request Sessions (the wifi icon: request and
  response), and writes an Excel workbook: an Overview tab plus one tab per failing job. Use whenever
  someone asks to log, export, report, list or monitor sync errors / failed messages / FinOps or
  Firebase sync failures on production, e.g. "report the prod sync console errors", "what's failing
  in the sync console", "export the PlanningLinePostingMaterialJob errors to Excel". Never retries
  messages. Not for the QA env.
---

# Production Sync Console error logger

Production, not QA: `https://vann-farms.agrierp.com`. **Read-only.** Never click **Retry** (the
`fa-repeat` row icon) or change anything, even when asked to "fix" errors. Just report them.

## Run it

From `playwright/`:

```bash
pnpm prod:sync-errors                    # writes AgriERP_SyncConsole_Errors_<YYYY-MM-DD_HHmm>.xlsx in the repo root
pnpm prod:sync-errors --out <dir>        # somewhere else
pnpm prod:sync-errors --headed           # watch the browser
```

It takes about 30 s and prints the failing jobs, how many messages each has, and the report path.
Give the user the path and a short readout: jobs, counts and the common root cause from the Error
Message / Detail text. **If it fails, report the error. Don't loop on reruns.**

**Credentials** come from `PROD_SYNC_EMAIL` / `PROD_SYNC_PASSWORD`, else the gitignored
`playwright/.auth/production_farmappadmin_credentials.json` (`{"email": "...", "password": "..."}`). If neither is
set, ask the user. Don't write credentials to disk yourself, and never commit or echo them.

## What the script does (`playwright/scripts/sync-console-errors.mts`)

1. Signs in through the Microsoft SSO login in Firefox: Email → **Login** → password → **Sign in**
   → "Stay signed in?" **No**. The app is ready only once it lands on `/maps`.
2. **Sync Console > Message Stats** (`/sync-console/stats`): clicks the **Errors Only** label (the
   checkbox input is hidden, so `check` on it does nothing), then **Tabular**. The toggle filters
   in the browser to rows with Error > 0; the script reads the same rows from the API.
3. **Sync Console > Messages** (`/sync-console/messages`): for each failing job it lists the Error
   messages and fetches each message's Request Sessions.
4. Builds the workbook with ExcelJS.

### Workbook layout

- **Overview**: errors only. Store Name, Job Name, Error (from the Errors Only stats row) and a link
  to the job's tab. A console warning flags any job whose extracted count differs from Error.
  It ends with a SUM total row and a source note.
- **One tab per failing job**, named after the Service Name (max 31 chars). It has the agreed
  columns: `#`, Message ID, Store Name, Service Name, Status, Date, Request Session ID, Response
  Code, Error Message, Request (`doc: Object` + JSON), Response (`Key: "value"` lines with the full
  Detail and stack trace). There is one row per request session, newest first. Dates are in the
  local machine's time zone, as the web app shows them.

## API notes (gateway `https://authgateway.agrierp.com/api`, Bearer token taken from the page)

| Purpose | Call |
|---|---|
| Stats per job | `GET /Message/stats?page=1&limit=1000`. The page's earlier `&connectionID=0` call is always empty; ignore it |
| Status ids | `GET /metadata/ComAXMessageStatus`: 1 Pending, 2 ReAttempt, 3 InProcess, 4 Success, 5 Skip, 6 Error |
| Error messages of a job | `GET /Message?page=N&limit=100&jobIDs=<jobID>&messageStatus=6`. Only `jobIDs` and `messageStatus` filter; `jobID`, `status` and `statusID` are ignored |
| One message | `GET /Message?page=1&limit=10&messageID=<id>` |
| Request Sessions (wifi icon) | `GET /Message/<id>/RequestResponse` returns `[{id, request, response, requestDateTime}]` |
| View details | `GET /Message/<id>/Payload` (the full source entity; not in the report) |

`jobName` sometimes has a leading space (e.g. `" WorkOrdersJob"`), so trim it. The gateway
occasionally returns an empty 200 body; the script re-reads that GET up to 3 times. That is a
re-read of the log, not a sync retry.

## Extending

For a richer per-job breakdown (like the Summary tab made by hand for
PlanningLinePostingMaterialJob: WO, project, item, location, qty requested vs available), parse the
`request` JSON and the `Detail` warning in a new tab. Keep the base columns unchanged.
