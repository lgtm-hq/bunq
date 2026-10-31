#!/usr/bin/env bash
set -euo pipefail

assert_clean() {
	local workspace_status
	workspace_status="$(git status --porcelain)"
	if [[ -n "$workspace_status" ]]; then
		printf '%s\n' "Workspace source drift detected:" "$workspace_status" >&2
		exit 1
	fi
}

bun install --frozen-lockfile
node --test tests/merge-message.test.mjs
bun run generate
# Generated metadata must be committed. Regenerate instead of maintaining mirrors.
assert_clean
bun run typecheck
bun run build
bun run test:workspace
bun run verify:packages
assert_clean
