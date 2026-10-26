#!/usr/bin/env bash
set -euo pipefail

bun install --frozen-lockfile
bun run generate
# Generated metadata must be committed. Regenerate instead of maintaining mirrors.
git diff --exit-code
bun run typecheck
bun run build
bun run test:workspace
bun run verify:packages
