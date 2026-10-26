# Workspace and package contract

The workspace is buildable scaffolding. It implements no banking API calls,
authentication or MCP transport. Packages remain private until release
onboarding (#23 and #29); building or packing never publishes them.

## Package boundaries

- `@lgtm-hq/bunq-client`: ESM entry point, declarations and package metadata.
  No runtime dependencies.
- `@lgtm-hq/bunq-mcp`: `lgtm-bunq-mcp` binary and package metadata.
  Consumes the client through its public entry point.

The client currently exports `assertSupportedNodeRuntime()`. Importing it also
checks the current runtime. Its internal modules are hidden by the exports map.
The MCP binary supports `--version` and `--help`; starting the unimplemented
transport fails on stderr with a nonzero exit and emits no protocol output.
There is no placeholder success response or banking capability.

The npm namespace is maintained by LGTM HQ. The scoped package names avoid the
unrelated existing `bunq` and `bunq-mcp` packages. Availability lookups are name
checks, not proof of account ownership. No registry credential is needed to
install public development dependencies or validate local package tarballs.

## Canonical values and development

The root `package.json` owns the package version, Bun pin and supported Node
minimums. `bun run generate` derives `.bun-version`, workspace manifests,
consumer runtime requirements and CLI version metadata. Generated files are
committed; edit their source values and regenerate instead of changing copies.
The generator also derives `.prettierignore` from the outputs it writes, so
formatters leave generated metadata unchanged. The workspace compiler is
pinned separately from downstream consumers; packed declarations must remain
compatible with their supported toolchains.

Install the Bun version named by `packageManager`, plus a Node release allowed
by `engines.node`. The toolchain hook rejects other Bun versions and package
manager user agents with an actionable command. npm may reject `workspace:`
dependencies before that hook runs; use Bun for workspace installation.
Consumers need Node only.

```sh
bun install --frozen-lockfile
bun run generate
bun run typecheck
bun run build
bun run test:workspace
bun run verify:packages
```

`typecheck` checks all workspace source without emitting or requiring built
declarations. `build` cleans ignored `dist` directories, checks project
references in dependency order, emits JavaScript and declarations, copies the
root MIT licence and makes the CLI executable. No Bun API or runtime is embedded
in the output.

The [quality guide](development.md) documents locked uv-managed lintro, native
tool setup and the full formatting/check commands. The workspace boundary
tests use Node's test runner and rebuild first to avoid stale output; full
behavioural coverage onboarding remains #14.

## Packed consumer validation

`verify:packages` packs each workspace with Bun, then installs both tarballs in
a fresh npm consumer offline with scripts disabled and no workspace links. It
checks runtime imports, declaration resolution, hidden subpaths, CLI execution,
exact client dependency replacement, package contents and retained legal text.
npm is used here to test an independent downstream consumer, not as the
workspace package manager. Temporary consumers are removed after the run.

For a copied pair of `client.tgz` and `mcp.tgz`, the same checks can run without
Bun using `node scripts/verify-packages.mjs --archives <directory>`; the copied
checkout must provide the root manifest, licence and pinned TypeScript compiler.
This allows testing Node-only installations on another OS.

The initial compatibility proof installed packed artifacts in macOS and Ubuntu
Node consumers and built a temporary Raycast extension with `@raycast/api`
1.104.1. ESM imports and strict declaration checking passed. The extension used
`type: module`, full relative import extensions and Node16 resolution, following
[Raycast's ESM guidance][raycast-esm]. ESM-only output is intentional; a duplicate
CJS build has no demonstrated consumer requirement. Future Raycast migration
must carry these consumer settings and repeat the proof for real API exports.

## CI scope

The Workspace workflow derives Node minimum versions from the manifest and
runs frozen install, generation drift, typecheck, build, boundary tests and
packed consumer checks on macOS and Ubuntu. PRs share cancellation groups;
main and merge-group runs use unique run IDs. No draft skip or secret forwarding
is involved. Linux jobs enforce a narrow project allowlist in block mode;
GitHub-hosted macOS runner egress is not enforced by harden-runner.

Actions are pinned to the versions used by released lgtm-ci v0.78.0. Its custom
Node reusable hardcodes Bun 1.4.2 and has no version override, so this small
workspace job reads the generated pin directly. Full CI onboarding (#17) owns
consolidation when the shared contract can honour workspace pins, alongside
coverage publishing and the remaining organisation checks. This workflow does
not complete that issue or the overall bootstrap.

[raycast-esm]: https://developers.raycast.com/misc/faq#can-i-import-esm-packages-in-my-extension
