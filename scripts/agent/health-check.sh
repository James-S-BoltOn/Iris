#!/usr/bin/env bash
# health-check.sh — tsc + vitest + git status + TODO counts
# Usage: bash scripts/agent/health-check.sh

source "$(dirname "$0")/_common.sh"
cd "$PROJECT_ROOT"

header "Health Check"

# ── TypeScript Compilation ──
subheader "TypeScript Compilation"
if [ -f "tsconfig.json" ]; then
  tsc_output=$(npx tsc --noEmit 2>&1)
  tsc_exit=$?
  if [ $tsc_exit -eq 0 ]; then
    echo -e "  ${GREEN}✓ Passed${RESET}"
  else
    echo "$tsc_output" | tail -30
    echo -e "  ${RED}✗ Failed (exit $tsc_exit)${RESET}"
  fi
else
  dim "  (no tsconfig.json found)"
fi

# ── Tests ──
subheader "Tests"
if grep -q "vitest" package.json 2>/dev/null; then
  test_output=$(npx vitest run --reporter=verbose 2>&1)
  test_exit=$?
  echo "$test_output" | tail -40
  if [ $test_exit -eq 0 ]; then
    echo -e "  ${GREEN}✓ Passed${RESET}"
  else
    echo -e "  ${RED}✗ Failed (exit $test_exit)${RESET}"
  fi
else
  dim "  (vitest not configured)"
fi

# ── Git Status ──
subheader "Git Status"
git status --short 2>/dev/null || dim "  (not a git repo)"

# ── TODO/FIXME/HACK counts ──
subheader "Code Markers"
for marker in TODO FIXME HACK XXX; do
  count=$(grep -rE "\b${marker}\b" src/ \
    --include='*.ts' \
    $GREP_EXCLUDE 2>/dev/null | wc -l)
  printf "  %-8s %d\n" "$marker" "$count"
done

echo ""
dim "Health check complete"
