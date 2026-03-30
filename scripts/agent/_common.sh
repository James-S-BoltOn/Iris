#!/usr/bin/env bash
# _common.sh — Shared utilities for agent scripts
# Sourced by all scripts in scripts/agent/

# ── Project Root ──
SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
PROJECT_ROOT="$(cd "$SCRIPT_DIR/../.." && pwd)"

# ── Colors ──
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[0;33m'
CYAN='\033[0;36m'
DIM='\033[2m'
RESET='\033[0m'

# ── Exclude patterns for grep/find ──
GREP_EXCLUDE="--exclude-dir=node_modules --exclude-dir=dist --exclude-dir=.git --exclude-dir=coverage --exclude-dir=.vite"
EXCLUDE_DIRS="node_modules|dist|\.git|coverage|\.vite"

# ── Output helpers ──
header() {
  echo ""
  echo -e "${CYAN}━━━ $1 ━━━${RESET}"
}

subheader() {
  echo -e "  ${YELLOW}── $1 ──${RESET}"
}

dim() {
  echo -e "${DIM}$1${RESET}"
}

err() {
  echo -e "${RED}ERROR: $1${RESET}" >&2
}

warn() {
  echo -e "${YELLOW}WARN: $1${RESET}" >&2
}

# ── Import extraction (TypeScript) ──
# Returns one import path per line (the string inside from '...' or from "...")
extract_imports() {
  local file="$1"
  grep -oP "from ['\"]([^'\"]+)['\"]" "$file" 2>/dev/null | sed "s/from ['\"]//;s/['\"]$//"
}

# ── Import resolution ──
# Given a directory and an import path, resolve to an actual file
resolve_import() {
  local from_dir="$1"
  local import_path="$2"

  # Skip external packages (no ./ or ../ prefix)
  if [[ "$import_path" != ./* && "$import_path" != ../* ]]; then
    return 1
  fi

  local base="$from_dir/$import_path"

  # Try exact match, then with extensions
  for candidate in "$base" "$base.ts" "$base.tsx" "$base/index.ts" "$base/index.tsx"; do
    if [ -f "$candidate" ]; then
      echo "$(cd "$(dirname "$candidate")" && pwd)/$(basename "$candidate")"
      return 0
    fi
  done

  return 1
}

# ── Signature extraction (AWK-based) ──
# Extracts exported type/interface/function/const signatures from a TS file
extract_signatures() {
  local file="$1"
  awk '
    /^export (type|interface|function|const|class|enum|abstract)/ {
      # Print the line
      print
      # If it opens a brace, print until the brace closes
      if ($0 ~ /{/) {
        depth = 0
        for (i = 1; i <= length($0); i++) {
          c = substr($0, i, 1)
          if (c == "{") depth++
          if (c == "}") depth--
        }
        while (depth > 0 && (getline line) > 0) {
          print line
          for (i = 1; i <= length(line); i++) {
            c = substr(line, i, 1)
            if (c == "{") depth++
            if (c == "}") depth--
          }
        }
        print ""
      }
      next
    }
    /^export default/ { print; next }
  ' "$file" 2>/dev/null
}
