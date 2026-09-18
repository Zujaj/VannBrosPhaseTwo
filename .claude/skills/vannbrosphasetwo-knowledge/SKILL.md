---
name: vannbrosphasetwo-knowledge
description: >-
  Authoritative product + domain reference for VannBrosPhaseTwo, the Folio3 agriculture
  ERP (tenant examples "Vann Brothers"/VBS). Use this whenever a task touches
  VannBrosPhaseTwo concepts, screens, or terminology — work orders (planned, tank-mix,
  inspection, harvest) and Harvest Central harvest tickets, template
  management (inspection/material/attribute templates),
  users/roles/resources, journal & posting review in Dynamics 365, observations
  / points of interest (POI), the communication center, attendance, maps,
  planning, or farm terminology. Consult this skill even when the user does not
  say "VannBrosPhaseTwo" but is clearly asking about these screens, flows, exact UI
  labels, navigation paths, entity statuses, or role permissions. The other
  vannbrosphasetwo-* skills (vannbrosphasetwo-docs, vannbrosphasetwo-playwright, vannbrosphasetwo-test-cases) all
  build on the facts captured here.
---

# VannBrosPhaseTwo Knowledge Base

VannBrosPhaseTwo is Folio3's agriculture ERP. It spans two cooperating systems:

1. **VannBrosPhaseTwo Farm App** — a **web** app (planning, work-order authoring, approval, templates, user management, communication, maps) and a **mobile** app (field execution: clock in/out, start/end jobs, record consumption, create observations).
2. **Microsoft Dynamics 365 Finance & Operations (D365 F&O)** — the back-office ERP where resources/resource groups are defined and where VannBrosPhaseTwo-synced consumption/inventory journals are reviewed.

A **batch job** syncs VannBrosPhaseTwo field activity (material/expense consumption, inventory dispatch/return) into D365, which posts the corresponding journals.

This SKILL.md is the index. Read the matching reference file in `references/` for full detail before answering or acting — the references hold the verbatim labels, fields, statuses, and edge cases.

## How to use this skill

1. Identify which domain the task touches (table below).
2. Read that reference file fully — they are short and authoritative.
3. Use **exact** labels/navigation as written. UI wording matters for docs, tests, and QA repro.
4. If facts here contradict the live app, the live app wins — flag the drift to the user rather than silently trusting stale text.

## Reference routing

| If the task is about… | Read |
|---|---|
| Work orders — concept, lifecycle/statuses, list, common create-form fields, approval, toasts (shared hub; links to the per-type flows) | `references/work-orders.md` |
| Creating a **Planned (standard)** WO — plot + materials (Rate/acre) + resources + assets; the `+ Add Plot` plot picker | `references/work-orders-planned.md` |
| Creating a **Tank Mix** WO — Unit/Mix Method/Per, Liquid Application params, Material Template | `references/work-orders-tank-mix.md` |
| Creating an **Inspection** WO — Inspection Template required; plot + resources only | `references/work-orders-inspection.md` |
| Creating a **Harvest** WO — own sub-tab, five harvest operations, no materials; `Target Quantity` / `Harvest Quantity`; plus **Harvest Central** harvest tickets | `references/work-orders-harvest.md` |
| Inspection / Material / Attribute templates; attribute types; enabling, disabling, cloning templates | `references/templates.md` |
| User roles & permissions; users, user groups, user enterprise; D365 resources & resource groups; user mapping | `references/users-resources.md` |
| Reviewing posted journals in D365 (item, expense, transfer, return-transfer, return-item); postings & inventory sync | `references/journals-postings.md` |
| Observations / Points of Interest (POI); POI categories; communication center / chat | `references/observations-chat.md` |

## Roles (the conceptual model)

Five primary functional roles drive role-based access. Concrete permissions are realized as configurable **User Roles** (see `references/users-resources.md`).

| Role | Access | Type | Core job |
|---|---|---|---|
| **Manager** | Web + Mobile | Administrative | Create/manage work orders; approve attendance & field progress; create material/inspection templates & attributes; farm planning; manage harvest orders; control user permissions/roles. Toggles the single responsible person per WO. |
| **Supervisor** | Mobile | Field Leadership | Start/end WOs for self and others; clock in/out others; assign/adjust operators & farmhands; review/update field progress; generate harvest tickets; approve task completions; participate in multiple active WOs. |
| **Responsible Person** | Mobile | Field Coordinator | **One designated person per work order.** Enter progress/completions; clock in/out assigned resources; add/remove team members, machinery, team leads; can start a WO without being clocked in. |
| **Team Lead** | Mobile | (named in role overview) | Field lead grouping; assigned/removed by Responsible Person/Supervisor. |
| **Machine Operator / Farm Hand** | Mobile | Field Worker | Clock in/out; start assigned jobs; add progress; record material consumption; pause/resume; mark completion; chat; create observations & POI. |

Many permissions are gated by **feature toggles**: "(if attendance is enabled)", "(if attendance and break hours is enabled)", "(if harvesting is enabled)".

**Web vs mobile split (critical):** Work orders are *authored, submitted, and approved on web*; they are *executed in the field on mobile*. Observations are *created on mobile*; web *configures POI categories and converts observations into work orders*. Approval on web is the only path to `Done` and it posts consumption to the ERP.

## Global navigation (Farm App web)

Top nav (labels vary slightly by tenant/version):
`Maps | Planning | Work Orders | Template Management | Communication Center | Attendance`
(Older screenshots show `Messaging` instead of `Communication Center`.)

Header right: **Site** selector (e.g. "Vann Location", "VBS Locations", "Colusa"), **Season** selector (e.g. "Crop Year 2026", "2023 Crop…"), a create `+` icon, notifications, **Settings** gear, profile avatar (e.g. "CP" = Crop Planner).

**Settings** gear → left nav: `Crops`, `Crop Stages`, `Machines and Implements`, `Map Toggle Config`, `Materials`, `Notifications`, `Resources`, `Seasons`, `Sites`, `Tasks / Operations`, `Template Management`, `User Management`.

## Work-order lifecycle (status chips)

`All | Queue | Draft | To Do | In Progress | Review | Done | Filter`

Flow: `Draft → Queue → To Do → In Progress → Review → Done`. Created/submitted on web (lands in Queue/To Do) → executed on mobile (In Progress → Review) → approved on web (`Work Order Completed` → `Approve`) → `Done`, which posts material & machine consumption to ERP.

## Tenant / URL pattern

`https://vannbrosphasetwo-<client>-<env>.folio3.site/<route>` — e.g. `https://agrierp-vann-q4.folio3.site/maps`, `agrierp-vann-qa.folio3.site/workorders`. Routes seen: `/workorders`, `/maps`. (Older demo screenshots also show `demo2.folio3.site/#/workorders` and `agrierp-consumer.azurewebsites.net/workorders` — legacy; prefer the `folio3.site` pattern.)

## Glossary (farming terminology)

| Term | Meaning |
|---|---|
| **Task / Operation** | A field activity type (e.g. Irrigation, Fertilization, Pruning/Hedging, Weed Control, Harvest, Almond Preparation, Soil Sampling & Testing). Drives the work-order type. |
| **Machine** | Self-powered unit that works on its own (tractor, combine harvester, excavator). |
| **Implement** | Tool attached to a machine (usually a tractor) for a specific task (plow=tilling, sprayer=spraying, seeder=planting). |
| **Field / Plot** | Land where crops are grown. WOs are executed against selected **plots** (with Plot Area / Operational Area in acres). |
| **Crop** | Plant cultivated for food/fiber/feed/commercial use (e.g. almond, pistachio, walnut, rice, cotton, wheat). |
| **Season** | Time period linked to weather/farming activity (Spring, Summer, Autumn/Fall, Winter); also "Crop Year NNNN". |
| **Tank Mixing** | Combining two or more products (pesticides/herbicides/fungicides/fertilizers) in one spray tank, applied in a single pass instead of separate sprays. |
| **Observation / POI** | A categorized field condition logged on the map (e.g. pest/insect attack, water logging). Created on mobile. |
| **PHI (Preharvest Interval)** | Minimum days between last pesticide application and harvest. |
| **REI (Re-entry Interval)** | Minimum time before workers may safely re-enter a treated field. |
| **Rainfast** | Hours after application a pesticide must stay on before rain won't wash it off. |
| **Stockfeed** | Minimum days before treated crops/pasture can be fed to livestock. |
| **Plantback** | Waiting period before planting another crop in treated soil. |
| **Grazing** | Minimum days livestock must be kept off treated pasture. |
| **Infestation** | Large numbers of harmful organisms damaging crops/soil/grain/livestock. |
| **Water logging** | Excess water in soil reducing root oxygen, harming crops. |

### Rate Unit List

| Unit | Full name | Metric | Common use |
|---|---|---|---|
| 1/2 pt | Half Pint | 236.6 mL | Small liquid measurements |
| cl | Centiliter | 10 mL | Beverage/chemical |
| dl | Deciliter | 100 mL | Lab & agricultural formulations |
| fl. oz | Fluid Ounce (US) | 29.57 mL | Liquid fertilizers, pesticides, additives |
| gal | Gallon (US) | 3.785 L | Large-volume agricultural applications |
| l | Liter | 1,000 mL | Standard metric liquid |
| ml | Milliliter | 0.001 L | Precise dosing/mixing |
| pt | Pint (US) | 473.2 mL | Medium liquid quantities |

## Source material

Derived from `resources/VBPhaseTwo Introduction.pdf` and `resources/user-manuals/*.pdf` (V1.0 manuals, Vann Brothers tenant). When in doubt about a flow, the original PDF for that feature is the ground truth.
