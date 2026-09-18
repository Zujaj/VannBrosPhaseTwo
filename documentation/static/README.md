# Static Assets

Static assets for the VannBrosPhaseTwo documentation site. Docusaurus serves this directory at the site root, so a file at `static/logo.svg` is referenced as `/logo.svg`.

## Directory Structure

```
static/
├── README.md          # This file
├── favicon.webp       # Site favicon
├── logo.svg           # VannBrosPhaseTwo logo (light theme)
├── logo-dark.svg      # VannBrosPhaseTwo logo (dark theme)
└── screenshots/       # Doc screenshots, mirrored to docs/ modules (see screenshots/README.md)
    ├── work-orders/
    ├── templates/
    ├── observations/
    ├── communication/
    ├── finance/
    └── administration/
```

## Images

- `favicon.webp` — Site favicon
- `logo.svg` — VannBrosPhaseTwo logo for the navbar (light theme)
- `logo-dark.svg` — VannBrosPhaseTwo logo for the navbar (dark theme)

## Screenshots

`screenshots/` holds the documentation screenshots, organised by module to mirror `documentation/docs/`. See `screenshots/README.md` for the folder layout, capture specs, and reference snippet.

## Usage

These assets are served directly by Docusaurus and can be referenced in your documentation using `static/`-rooted paths like `/logo.svg` or `/screenshots/work-orders/approve-work-order.webp`.
