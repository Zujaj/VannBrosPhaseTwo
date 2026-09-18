# Screenshots

Static screenshots for the VannBrosPhaseTwo documentation site, organised by module and user journey. Folders mirror `documentation/docs/` so a screenshot's path tracks the page that references it.

## Directory Structure

```
screenshots/
├── work-orders/
│   ├── create-planned-work-order.webp
│   ├── create-inspection-work-order.webp
│   ├── create-tank-mix-work-order.webp
│   ├── submit-work-order.webp
│   └── approve-work-order.webp
├── templates/
│   ├── create-inspection-template.webp
│   ├── create-material-template.webp
│   ├── create-attribute-template.webp
│   └── enable-clone-inspection-template.webp
├── observations/
│   ├── configure-poi-categories.webp
│   └── create-work-order-from-observation.webp
├── communication/
│   └── chat-and-communications.webp
├── finance/
│   ├── review-postings.webp
│   ├── review-transfer-journals.webp
│   └── review-return-item-journal.webp
└── administration/
    ├── set-up-users-roles-groups.webp
    ├── create-resources.webp
    └── create-resource-groups.webp
```

## Specifications

- **Format**: `.webp` preferred (PNG / JPG fallback acceptable)
- **Source**: capture from the QA env `https://agrierp-vann-qa.folio3.site` (Vann Brothers / VBS tenant)
- **Width**: minimum 1280px for web screens; crop to the relevant panel
- **Naming**: lowercase, hyphenated, matching the doc page slug (e.g. `approve-work-order.webp`)

## What to Capture

- Each step of the work order lifecycle — create, submit, approve (planned, inspection, tank-mix)
- Template builders — inspection, material, attribute; enable/clone inspection template
- Observations / POI — category config and create-WO-from-observation flow
- Journal & posting review — transfer, return item, postings
- User / role / resource setup screens
- Success toasts and status chips (the success signal each page documents)

## Hygiene

- Use seeded QA / VBS test accounts — never real users.
- Blur or replace any PII (real names, emails, phone numbers).
- Keep the browser chrome and zoom consistent across the set.

## How to Reference Screenshots

Inside `.mdx` files:

```mdx
<div align="center">
  <img src="/screenshots/work-orders/approve-work-order.webp" alt="Approve Work Order" width="700" />
  <div align="center" style={{fontSize: '0.95em', marginTop: '8px'}}>Approve Work Order</div>
</div>
```

Use the `static/`-rooted path (`/screenshots/...`) — Docusaurus serves `static/` at the site root.

## Status

VannBrosPhaseTwo UI screenshots are still being produced. Many image references in the documentation site currently render as placeholders. As screenshots are captured, drop them into the matching path here and they will appear automatically — no doc changes required.
