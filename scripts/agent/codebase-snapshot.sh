#!/usr/bin/env bash
# codebase-snapshot.sh — Project orientation in one call
# Usage: bash scripts/agent/codebase-snapshot.sh

source "$(dirname "$0")/_common.sh"
cd "$PROJECT_ROOT"

header "Project Structure"
find . -maxdepth 3 \
  -not -path '*/node_modules/*' \
  -not -path '*/.git/*' \
  -not -path '*/.git' \
  -not -path '*/dist/*' \
  -not -path '*/.vite/*' \
  -not -path '*/coverage/*' \
  -not -name '*.lock' \
  -not -name 'package-lock.json' \
  \( -type f -o -type d \) | sort | head -120

header "File Counts by Type"
echo "TypeScript (.ts):"
find . -name '*.ts' | grep -vE "$EXCLUDE_DIRS" | wc -l
echo "JavaScript (.js):"
find . -name '*.js' | grep -vE "$EXCLUDE_DIRS" | wc -l
echo "JSON (config):"
find . -maxdepth 2 -name '*.json' | grep -vE "$EXCLUDE_DIRS" | wc -l
echo "Shell scripts:"
find . -name '*.sh' | grep -vE "$EXCLUDE_DIRS" | wc -l

header "Recent Git History (last 15 commits)"
git log --oneline -15 2>/dev/null || dim "(not a git repo)"

header "Package Scripts"
if [ -f "package.json" ]; then
  node -e "
    const pkg = require('./package.json');
    if (pkg.scripts) {
      Object.entries(pkg.scripts).forEach(([k,v]) => console.log('  ' + k + ': ' + v));
    } else {
      console.log('  (no scripts)');
    }
  " 2>/dev/null || dim "  (could not parse)"
fi

header "Key Config Files"
for f in tsconfig.json .env.example Dockerfile fly.toml; do
  if [ -f "$f" ]; then
    echo "  ✓ $f"
  fi
done

header "Database Schema"
if [ -f "src/db/schema.ts" ]; then
  # Extract table creation patterns from better-sqlite3 schema
  grep -E "CREATE TABLE|db\.exec|tableName" src/db/schema.ts 2>/dev/null | head -20
  # Also show the full schema file if it's short
  line_count=$(wc -l < "src/db/schema.ts")
  if [ "$line_count" -le 50 ]; then
    echo ""
    cat -n src/db/schema.ts
  fi
else
  dim "  (schema file not found)"
fi

header "Route Definitions"
for route_file in src/routes/*.ts; do
  [ -f "$route_file" ] || continue
  rel="${route_file#./}"
  echo -e "  ${CYAN}$rel${RESET}"
  grep -nE "\.(get|post|put|patch|delete)\(" "$route_file" 2>/dev/null | while IFS= read -r line; do
    echo "    $line"
  done
done

echo ""
dim "Snapshot generated from $PROJECT_ROOT"
