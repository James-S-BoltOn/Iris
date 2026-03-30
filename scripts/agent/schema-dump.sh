#!/usr/bin/env bash
# schema-dump.sh — DB schema + API route map
# Usage: bash scripts/agent/schema-dump.sh

source "$(dirname "$0")/_common.sh"
cd "$PROJECT_ROOT"

SCHEMA_FILE="src/db/schema.ts"
ROUTES_DIR="src/routes"

# ── Database Schema ──
header "Database Schema"

if [ -f "$SCHEMA_FILE" ]; then
  cat -n "$SCHEMA_FILE"
else
  err "Schema file not found: $SCHEMA_FILE"
fi

# ── DB Connection Config ──
header "Database Connection"
if [ -f "src/db/index.ts" ]; then
  cat -n "src/db/index.ts"
else
  dim "  (src/db/index.ts not found)"
fi

# ── API Routes ──
header "API Routes"

if [ -d "$ROUTES_DIR" ]; then
  for route_file in "$ROUTES_DIR"/*.ts; do
    [ -f "$route_file" ] || continue
    rel="${route_file#./}"
    echo -e "\n  ${CYAN}$rel${RESET}"

    # Extract Hono route definitions
    grep -nE "\.(get|post|put|patch|delete)\(" "$route_file" 2>/dev/null | while IFS= read -r line; do
      echo "    $line"
    done
  done
else
  err "Routes directory not found: $ROUTES_DIR"
fi

# ── Types ──
header "Type Definitions"
if [ -f "src/types/index.ts" ]; then
  cat -n "src/types/index.ts"
else
  dim "  (src/types/index.ts not found)"
fi

echo ""
dim "Schema dump complete"
