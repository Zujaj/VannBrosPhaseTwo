#!/usr/bin/env bash
# Re-download the Burq Web API Swagger spec (VANNBROS.QA) and regenerate reference/*.md + the SKILL.md index.
#
#   scripts/refresh.sh             download, validate, replace openapi.json, regenerate
#   scripts/refresh.sh --offline   regenerate from the existing local spec only
#
# Env: SPEC_URL (default: QA swagger.json; must be a Burq QA host), SPEC_OUT (default: <skill>/openapi.json)
set -euo pipefail

SKILL_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
SPEC_URL="${SPEC_URL:-https://vannbros-qa.burqio.site/swagger/v1/swagger.json}"
SPEC_OUT="${SPEC_OUT:-$SKILL_DIR/openapi.json}"

if [[ "${1:-}" != "--offline" ]]; then
  if [[ ! "$SPEC_URL" =~ ^https://[a-z-]*qa[a-z-]*\.burqio\.site/ ]]; then
    echo "refusing non-QA spec URL: $SPEC_URL" >&2
    exit 1
  fi
  tmp="$(mktemp)"
  trap 'rm -f "$tmp"' EXIT
  echo "downloading $SPEC_URL"
  curl -fsSL --max-time 120 -o "$tmp" "$SPEC_URL"
  # Validate before overwriting: must parse and be Swagger 2.0 with paths.
  node -e '
    const d = JSON.parse(require("fs").readFileSync(process.argv[1], "utf8"));
    if (d.swagger !== "2.0" || !d.paths || !Object.keys(d.paths).length) {
      console.error("downloaded file is not a Swagger 2.0 spec with paths"); process.exit(1);
    }' "$tmp"
  mkdir -p "$(dirname "$SPEC_OUT")"
  if [[ -f "$SPEC_OUT" ]] && cmp -s "$tmp" "$SPEC_OUT"; then
    echo "spec unchanged"
  else
    node -e '
      const fs = require("fs");
      const count = (f) => { try { return Object.keys(JSON.parse(fs.readFileSync(f, "utf8")).paths).length; } catch { return 0; } };
      console.log(`spec changed: ${count(process.argv[2])} -> ${count(process.argv[1])} paths`);' "$tmp" "$SPEC_OUT"
    cp "$tmp" "$SPEC_OUT"
  fi
fi

[[ -f "$SPEC_OUT" ]] || { echo "no spec at $SPEC_OUT" >&2; exit 1; }
node "$SKILL_DIR/scripts/generate.mjs" "$SPEC_OUT"
