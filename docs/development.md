# Development quality checks

Bun owns the Node workspace. uv owns the Python tools used for development;
Python and lintro are not dependencies of either published Node package.
Use the runtime and Bun pins in `package.json` and a Python release allowed
by `pyproject.toml`. `uv.lock` pins lintro and its Python dependencies;
`bun.lock` pins the compiler, formatters and other Node development tools.
The Quality caller pins the released Lintro 0.173.1 container by digest;
its release tag and source revision were verified against the registry.

## First checkout

```sh
bun install --frozen-lockfile
uv sync --locked
uv run lintro doctor
```

Lintro reports tool availability and versions. Its manifest owns the native
tool versions; install missing workflow, shell and TOML checkers through it:

```sh
uv run lintro install actionlint shellcheck shfmt taplo --yes
```

Inspect the installation plan with `--dry-run` first when needed. Never count
a skipped applicable tool as a passing check. Layered security onboarding and
CI tool provisioning remain separate work in #21 and #17.

## Daily checks

```sh
uv run lintro fmt
uv run lintro chk
bun run typecheck
bun run test:workspace
bun run build
bun run verify:packages
```

`bun run format` and `bun run lint` use uv's locked mode.
Do not pass a tool filter: the full registry stays enabled. Native tool
configuration controls the relevant file types; unrelated languages have no
matching source. Commitlint uses the Conventional Commits preset. Oxlint
rejects explicit `any`, non-const type assertions, non-null assertions and
TypeScript ignore directives. Expected-error directives require a description.
ESLint disable directives are rejected and cannot suppress Oxlint diagnostics.
Unused Oxlint directives are errors. Any necessary named Oxlint exception
requires a narrow, explicitly justified code review. State-model semantics, including
appropriate discriminated unions, also remain a review responsibility.

TypeScript is strict, including unknown catch values and explicit type-only
imports. The root `tsconfig.json` checks every package source file without
emitting. The generator derives its source mapping from the public client
entry, so checks work before a build. The canonical `typecheck` uses that same
config with library checking enabled. Separate `tsconfig.build.json` files
check the package dependency graph and emit into ignored `dist`; packed
consumer tests verify the actual published exports and declaration resolution.
Bundling alone cannot establish correctness. Financial state models must use
discriminated unions and narrow unknown input; suppressions and casts need
specific justification.

Repository-only declarations in `types/untrusted-json` make `JSON.parse`
return `unknown`, including with a reviver, and `Body.json()` return
`Promise<unknown>`. Both source checking and package builds inherit these
types through the root type configuration. Validate the decoded value before
assigning a domain type; a typed destination is not validation. These ambient
declarations are development inputs and are not copied into published packages.
They do not add runtime validation or replace the response-contract work in #32.

## Formatting and generated files

The generator owns package metadata and its generated TypeScript constants.
It records every output as a root-anchored path in `.prettierignore`; both
Prettier and oxfmt respect that file. Generated paths remain visible to type
and security checks. Edit
their canonical inputs and run `bun run generate` instead of formatting them.
The CI script checks tracked and untracked source drift after generation and
after all build, test and package steps.

`node_modules`, `.venv`, build output and quality reports are disposable and
excluded from source checks. Formatting twice must produce the same bytes;
formatting must also preserve the generator's outputs byte for byte.

The standalone Raycast extension keeps Raycast's formatter and lint rules as
its final authority. This repository does not change that consumer's native
commands. Compiler upgrades must preserve compatible declarations and repeat
the packed-consumer checks; TypeScript 6 initially emits the same declaration
bytes as the preceding TypeScript 5 build.

## Development dependency exception

The root manifest overrides KaTeX for the Markdown tool's math dependency.
`micromark-extension-math` still requests the vulnerable older release line;
the override selects the patched release for
[GHSA-238p-pmpm-9mq7][katex-advisory]. It adds no client runtime dependency.
Valid rendering and malformed-input rejection were checked through the real
Markdown dependency graph, and the complete lint and vulnerability checks pass.
Remove the override when the upstream dependency accepts a patched version.

## Regression probes

Run probes in a disposable checkout, then delete it. A valid JavaScript bundle
containing a deliberate TypeScript assignment error must still fail both
`uv run lintro chk` and `bun run typecheck`. Malformed YAML configuration must
fail the full check. Finally, run formatting twice and compare the source,
generated metadata and lockfiles after each run. Never commit the probe errors
or treat an unrelated tool failure as evidence that a probe was detected.
Also verify that explicit `any`, double assertions, casts of `JSON.parse`,
non-null assertions, TypeScript ignore comments, bare ESLint disables and
unused Oxlint disables produce the intended lint diagnostics. Hand-written
nested fixture manifests must still be formatted; only the generator's exact
root-relative outputs are exempt. Structured reports are written under
`.lintro/artifacts/json/` for checking the specific tool and diagnostic.

[katex-advisory]: https://github.com/advisories/GHSA-238p-pmpm-9mq7
