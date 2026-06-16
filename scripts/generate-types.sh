#!/bin/bash
# Generate Supabase TypeScript types from the database schema
# Usage: ./scripts/generate-types.sh
#
# For local development: uses local Supabase instance
# For remote: link project first with `supabase link --project-ref <id>`

set -euo pipefail

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
PROJECT_ROOT="$(dirname "$SCRIPT_DIR")"
OUTPUT_FILE="$PROJECT_ROOT/apps/web/src/types/database.ts"

echo "Generating Supabase types..."

if supabase status > /dev/null 2>&1; then
  echo "Using local Supabase instance"
  supabase gen types typescript --local > "$OUTPUT_FILE"
else
  echo "Using linked remote project"
  supabase gen types typescript --linked > "$OUTPUT_FILE"
fi

echo "Types written to: $OUTPUT_FILE"
echo "Done!"
