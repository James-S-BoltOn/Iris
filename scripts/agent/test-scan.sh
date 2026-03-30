#!/usr/bin/env bash
# test-scan.sh — Test gap analysis
# Usage: bash scripts/agent/test-scan.sh

source "$(dirname "$0")/_common.sh"
cd "$PROJECT_ROOT"

header "Test Gap Analysis"

# ── Helpers ──
count_in_file() {
  local file="$1"
  local pattern="$2"
  local count
  count=$(grep -cE "$pattern" "$file" 2>/dev/null) || true
  echo "${count:-0}"
}

# ── Source ↔ Test Coverage ──
subheader "Source ↔ Test Coverage"

SRC_DIR="src"
TEST_DIR="src/__tests__"

untested=()
tested=()

# Scan routes
if [ -d "$SRC_DIR/routes" ]; then
  for src_file in "$SRC_DIR"/routes/*.ts; do
    [ -f "$src_file" ] || continue
    base=$(basename "$src_file" .ts)
    if ls "$TEST_DIR"/${base}*.test.ts 2>/dev/null | grep -q .; then
      tested+=("routes/$base")
    else
      untested+=("routes/$base")
    fi
  done
fi

# Scan services
if [ -d "$SRC_DIR/services" ]; then
  for src_file in "$SRC_DIR"/services/*.ts; do
    [ -f "$src_file" ] || continue
    base=$(basename "$src_file" .ts)
    if ls "$TEST_DIR"/${base}*.test.ts 2>/dev/null | grep -q .; then
      tested+=("services/$base")
    else
      untested+=("services/$base")
    fi
  done
fi

# Scan db
if [ -d "$SRC_DIR/db" ]; then
  for src_file in "$SRC_DIR"/db/*.ts; do
    [ -f "$src_file" ] || continue
    base=$(basename "$src_file" .ts)
    if ls "$TEST_DIR"/${base}*.test.ts 2>/dev/null | grep -q .; then
      tested+=("db/$base")
    else
      untested+=("db/$base")
    fi
  done
fi

total=$(( ${#tested[@]} + ${#untested[@]} ))
echo "  Modules with tests:    ${#tested[@]} / $total"
if [ ${#untested[@]} -gt 0 ]; then
  echo -e "  ${RED}Untested modules:${RESET}"
  for m in "${untested[@]}"; do
    echo "    - $m"
  done
else
  echo -e "  ${GREEN}All modules have test files${RESET}"
fi

# ── Mock Density ──
subheader "Mock Density"
if [ -d "$TEST_DIR" ]; then
  for test_file in "$TEST_DIR"/*.test.ts; do
    [ -f "$test_file" ] || continue
    base=$(basename "$test_file")
    mock_count=$(count_in_file "$test_file" "vi\.(mock|fn|hoisted|spyOn)")
    test_count=$(count_in_file "$test_file" "^\s*(it|test)\(")
    if [ "$test_count" -eq 0 ]; then test_count=1; fi
    ratio=$(awk "BEGIN { printf \"%.2f\", $mock_count / $test_count }")
    flag=""
    if awk "BEGIN { exit !($ratio > 2.0) }"; then
      flag=" ${RED}<- high mock ratio${RESET}"
    fi
    printf "  %-40s mocks: %-3s tests: %-3s ratio: %s%b\n" "$base" "$mock_count" "$test_count" "$ratio" "$flag"
  done
else
  dim "  No test directory found at $TEST_DIR"
fi

# ── Weak Assertions ──
subheader "Assertion Quality"
weak_total=0
strong_total=0
if [ -d "$TEST_DIR" ]; then
  for test_file in "$TEST_DIR"/*.test.ts; do
    [ -f "$test_file" ] || continue
    weak=$(count_in_file "$test_file" "toBeTruthy|toBeFalsy|toBeDefined|toMatchSnapshot")
    strong=$(count_in_file "$test_file" "toBe\(|toEqual|toStrictEqual|toContain|toHaveLength|toThrow|toHaveBeenCalled|toMatchObject|toHaveProperty")
    weak_total=$((weak_total + weak))
    strong_total=$((strong_total + strong))
  done
  echo "  Strong assertions: $strong_total"
  echo "  Weak assertions:   $weak_total"
  if [ "$weak_total" -gt 0 ] && [ "$strong_total" -gt 0 ]; then
    pct=$(awk "BEGIN { printf \"%.0f\", ($weak_total / ($weak_total + $strong_total)) * 100 }")
    if [ "$pct" -gt 20 ]; then
      echo -e "  ${YELLOW}Weak assertion ratio: ${pct}% (target: <20%)${RESET}"
    else
      echo -e "  ${GREEN}Weak assertion ratio: ${pct}%${RESET}"
    fi
  fi
fi

# ── Error Path Coverage ──
subheader "Error Path Coverage"
src_throws=0
test_throws=0
if [ -d "$SRC_DIR" ]; then
  src_throws=$(grep -rE "throw new|\.catch\(" "$SRC_DIR" --include='*.ts' \
    --exclude-dir=__tests__ --exclude='*.test.ts' 2>/dev/null | wc -l)
fi
if [ -d "$TEST_DIR" ]; then
  test_throws=$(grep -rE "toThrow|rejects\." "$TEST_DIR" --include='*.ts' 2>/dev/null | wc -l)
fi
echo "  Error throws in source:    $src_throws"
echo "  Error assertions in tests: $test_throws"
if [ "$src_throws" -gt 0 ] && [ "$test_throws" -eq 0 ]; then
  echo -e "  ${RED}No error path testing detected${RESET}"
elif [ "$src_throws" -gt 0 ]; then
  coverage=$(awk "BEGIN { printf \"%.0f\", ($test_throws / $src_throws) * 100 }")
  echo -e "  Approximate error coverage: ${coverage}%"
fi

# ── Vague Descriptions ──
subheader "Vague Test Descriptions"
if [ -d "$TEST_DIR" ]; then
  vague_count=0
  while IFS= read -r line; do
    if [ -n "$line" ]; then
      echo "  $line"
      vague_count=$((vague_count + 1))
    fi
  done < <(grep -rnE "it\(['\"]should (work|handle|return|do) " "$TEST_DIR" --include='*.ts' 2>/dev/null | head -20)
  if [ "$vague_count" -eq 0 ]; then
    echo -e "  ${GREEN}No vague descriptions found${RESET}"
  else
    echo -e "  ${YELLOW}Found $vague_count vague test descriptions${RESET}"
  fi
fi

echo ""
dim "Test scan complete"
