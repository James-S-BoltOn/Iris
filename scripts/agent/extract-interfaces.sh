#!/usr/bin/env bash
# extract-interfaces.sh — Extract type signatures for agent consumption
# Usage: bash scripts/agent/extract-interfaces.sh <file-or-dir>

source "$(dirname "$0")/_common.sh"
cd "$PROJECT_ROOT"

TARGET="${1:-}"

if [ -z "$TARGET" ]; then
  err "Usage: extract-interfaces.sh <file-or-dir>"
  exit 1
fi

# Resolve target relative to project root
if [ ! -e "$TARGET" ]; then
  if [ -e "$PROJECT_ROOT/$TARGET" ]; then
    TARGET="$PROJECT_ROOT/$TARGET"
  else
    err "Not found: $TARGET"
    exit 1
  fi
fi

TARGET="$(cd "$(dirname "$TARGET")" && pwd)/$(basename "$TARGET")"

header "Interface Extraction"

# ── Extract via tsc --declaration ──
extract_tsc() {
  local file="$1"
  local rel_path="${file#$PROJECT_ROOT/}"

  if [ ! -f "$PROJECT_ROOT/tsconfig.json" ]; then
    warn "No tsconfig.json found, falling back to AWK"
    extract_awk "$file"
    return
  fi

  local tmp_dir="$PROJECT_ROOT/.tmp-extract-$$"
  mkdir -p "$tmp_dir/out"
  trap "rm -rf '$tmp_dir'" RETURN

  local rel_to_root="${file#$PROJECT_ROOT/}"

  cat > "$tmp_dir/tsconfig.tmp.json" <<TSCEOF
{
  "extends": "../tsconfig.json",
  "compilerOptions": {
    "declaration": true,
    "emitDeclarationOnly": true,
    "noEmit": false,
    "skipLibCheck": true,
    "outDir": "./out"
  },
  "include": ["../$rel_to_root"]
}
TSCEOF

  (cd "$tmp_dir" && npx tsc --project tsconfig.tmp.json 2>/dev/null)

  local dts_file
  dts_file=$(find "$tmp_dir/out" -name "*.d.ts" -type f 2>/dev/null | head -1)

  if [ -n "$dts_file" ] && [ -f "$dts_file" ]; then
    echo "=== Interfaces: $rel_path ==="
    echo "(via tsc --declaration)"
    echo ""
    cat "$dts_file"
    echo ""
  else
    warn "tsc produced no output for $rel_path, falling back to AWK"
    extract_awk "$file"
  fi
}

# ── Extract via AWK ──
extract_awk() {
  local file="$1"
  local rel_path="${file#$PROJECT_ROOT/}"

  echo "=== Interfaces: $rel_path ==="
  echo "(via AWK signature extraction)"
  echo ""

  local sigs
  sigs=$(extract_signatures "$file")
  if [ -n "$sigs" ]; then
    echo "$sigs"
  else
    dim "  (no exported signatures found)"
  fi
  echo ""
}

# ── Process ──
process_file() {
  local file="$1"
  # Skip test files
  if [[ "$file" == *.test.* ]] || [[ "$file" == *.spec.* ]] || [[ "$file" == */__tests__/* ]]; then
    return
  fi
  if [[ "$file" != *.ts ]]; then
    return
  fi

  extract_tsc "$file"
}

if [ -f "$TARGET" ]; then
  process_file "$TARGET"
elif [ -d "$TARGET" ]; then
  local_count=0
  while IFS= read -r file; do
    process_file "$file"
    local_count=$((local_count + 1))
  done < <(find "$TARGET" -type f -name '*.ts' \
    ! -name '*.test.*' ! -name '*.spec.*' ! -path '*/__tests__/*' \
    ! -path '*/node_modules/*' ! -path '*/dist/*' 2>/dev/null | sort)

  if [ "$local_count" -eq 0 ]; then
    dim "No TypeScript files found in $(basename "$TARGET")"
  else
    dim "Processed $local_count files"
  fi
else
  err "Target is neither file nor directory: $TARGET"
  exit 1
fi

echo ""
dim "Interface extraction complete"
