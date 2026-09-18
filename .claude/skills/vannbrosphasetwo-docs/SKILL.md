---
name: vannbrosphasetwo-docs
description: >-
  Author and maintain the VannBrosPhaseTwo documentation site (the Docusaurus project in
  documentation/). Use whenever the task is to write, update, or restructure
  user-facing or technical docs for VannBrosPhaseTwo — user guides / how-tos for work
  orders, templates, observations, user management, journal review; feature
  overviews; user journeys; setup/architecture pages — including adding .md/.mdx
  pages and wiring them into sidebars.ts. Trigger on phrases like "document the
  work order flow", "write a user guide for inspection templates", "add a docs
  page for POI", "update the docs site", even if "Docusaurus" is not named. Pull
  the product facts (exact UI labels, steps, statuses) from the
  vannbrosphasetwo-knowledge skill so the docs stay accurate.
---

# VannBrosPhaseTwo Documentation

Write docs for the Docusaurus site in `documentation/`. **Read the `vannbrosphasetwo-knowledge` skill first** and base every product statement on it — accurate nav paths, exact button/field labels, statuses, and toasts. Vague or invented UI wording is the main failure mode; the knowledge refs exist to prevent it.

## Repo layout

- **Site root:** `documentation/` (Docusaurus). Config `documentation/docusaurus.config.ts`, sidebar `documentation/sidebars.ts`.
- **Content root:** `documentation/docs/` with sections: `admin/`, `architecture/`, `contributing/`, `development/`, `setup/`, `user-journeys/`, plus top-level `project-overview.mdx`, `project-flow.mdx`.
- **Sidebar:** `documentation/sidebars.ts` (`tutorialSidebar`). Pages are referenced by doc `id` (path without extension, relative to `docs/`). New pages must be added here or they won't appear in the nav.
- **Run locally:** from `documentation/`, the usual Docusaurus scripts (`start`, `build`) in its `package.json`.

> Note: parts of the current `docs/` are an unmodified Docusaurus starter (e.g. ride-sharing architecture pages). When adding VannBrosPhaseTwo content, place it correctly and don't assume the scaffold reflects VannBrosPhaseTwo — replace/extend deliberately.

## Where VannBrosPhaseTwo content belongs

| Content kind | Section |
|---|---|
| End-user how-to for a feature/flow (create a work order, build a template, review a journal) | `docs/user-journeys/` |
| Role/permission and access-setup guides (users, roles, groups, resources) | `docs/admin/` (or `setup/` for environment setup) |
| Conceptual overview of a module or the product | top-level overview pages / a new `docs/<module>/` category |
| Contributor / dev process | `docs/contributing/`, `docs/development/` |

If unsure, prefer `user-journeys/` for task-based guides and propose the placement to the user.

## How to write an VannBrosPhaseTwo feature/how-to page

1. Read the matching `vannbrosphasetwo-knowledge` reference (`work-orders.md`, `templates.md`, `users-resources.md`, `journals-postings.md`, `observations-chat.md`).
2. Open with: what the feature is, **which role** does it (Manager/Supervisor/Responsible Person/Operator), and **web vs mobile** (e.g. WOs authored on web, executed on mobile, approved on web).
3. Give numbered steps using the **exact** nav and labels (e.g. **Work Orders → Inspection Work Orders → Create New Work Orders**; required fields marked `*`).
4. Call out statuses/lifecycle and the success signal (toast text, status chip change).
5. Note gotchas/prerequisites from the reference (e.g. inspection template must be **Enabled** to appear; D365 Resource must exist before assigning to a user).
6. Add the page's doc `id` to `documentation/sidebars.ts` in the right category.

## Page template

```mdx
---
title: <Feature> — <Action>
sidebar_label: <Short label>
---

# <Feature>: <Action>

**Who:** <role(s)>  **Where:** <Web / Mobile>

<One-paragraph purpose.>

## Before you start
- <prerequisites / required permissions / feature toggles>

## Steps
1. Go to **<Nav > Path>**.
2. Click **<Exact Button>**.
3. Fill in **<Field\*>** … (note required fields).
4. Click **<Submit/Save>**.

## Result
You'll see **<exact toast / status chip>**; the <entity> moves to **<status>**.

## Notes & gotchas
- <edge cases from vannbrosphasetwo-knowledge>
```

## Conventions

- Use Docusaurus admonitions (`:::note`, `:::tip`, `:::warning`) for prerequisites and gotchas.
- Bold **UI labels** and use the exact casing from the knowledge refs.
- Keep tenant-specific examples generic where possible; when showing a URL use the pattern `https://vannbrosphasetwo-<client>-<env>.folio3.site/<route>`.
- One task per page; link related pages instead of duplicating steps.
- After adding/renaming pages, update `sidebars.ts` and verify the build.

## When the app contradicts the docs

The live app is the source of truth over the knowledge refs. If you discover drift while documenting, write the doc to the real behavior and flag that `vannbrosphasetwo-knowledge` should be updated.
