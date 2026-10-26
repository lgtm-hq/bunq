# Behavioural testing

Run `bun install --frozen-lockfile`, then `bun run test`. Vitest executes on
Node with V8 coverage enabled. All `packages/*/src/**/*.ts` files are included,
including unimported and generated modules; there are no source exclusions.
Every file must reach 80% statements, functions and lines, and 75% branches.
Reports go to ignored `coverage/` as text, JSON and LCOV. These are minimums,
not permission to omit a security-critical failure case.

The source compiler also checks tests and Vitest configuration. Package builds
continue to include only shipped source. The V8 provider's exact version is
generated from the canonical Vitest development dependency.

## Suite boundaries

- `packages/*/test/` holds package-source runtime and CLI tests. They import
  source directly; stale build output cannot satisfy these assertions.
- `tests/integration/` holds deterministic OS/process and Node-crypto
  reference tests. Toolchain tests launch real local processes.
- `bun run test:workspace` runs both suites with the full coverage gate on
  every supported Node/OS combination in Workspace CI.
- `bun run verify:packages`, after `bun run build`, installs packed packages
  into an isolated downstream consumer and tests declarations, imports,
  contents and the executable. This remains separate from source coverage.
- No sandbox suite exists yet. Add a separate, explicitly enabled command
  once captured sandbox contracts and authorised credentials are available.
  Default tests and CI never provision banking devices or call production.

The current packages have no banking endpoints, money parser, credential
store or signature implementation. Their contract tests must arrive with those
capabilities. Capture complete, reproducibly redacted sandbox responses under
[issue #18](https://github.com/lgtm-hq/bunq/issues/18), including malformed or
missing values, unknown fields, partial failures and
schema drift. Mutate selected response fields and exact amount values to prove
the corresponding consumer assertions fail. Do not manufacture banking
fixtures to claim those future cases pass.

## Isolation and adapters

`tests/setup.ts` blocks real fetch, HTTP(S), HTTP/2, socket, TLS, UDP and common
DNS calls before importing test modules. Each blocked attempt is recorded;
test and suite teardown fail even when code catches the immediate error. Stack
ordering makes the setup's final hook run after test-file cleanup. This is an
in-process guard, not an operating-system sandbox for child processes.
Integration children are fixed local toolchain commands. Package smoke uses
offline npm installation; CI's Linux runner adds network enforcement.

Inject adapters instead of restoring real network access. Use Vitest's typed
`vi.fn<typeof fetch>()` with queued `Response` objects or rejected promises,
preserving complete captured bodies and HTTP status/headers. Use a fresh `Map`
behind the eventual store interface and Vitest fake timers for an injected
clock. Introduce shared domain fakes when those interfaces exist rather than
defining competing production contracts in test helpers. Restore only spies
and timers owned by the test; keep the network guard active. Await all work.

## Failure gates and high-risk cases

`bun run verify:test-gates` deliberately runs failing selections and checks
their diagnostics. It proves swallowed network attempts, assertionless tests,
focused tests, empty selections and an unimported shipped module below coverage
thresholds fail. Temporary files are removed in `finally`. Every Workspace CI
job runs these probes; their intentional child failures are expected.

Current tests cover runtime lower bounds, unsupported release lines, malformed
versions, CLI argument rejection, executable toolchain mismatch and actionable
error messages. The RSA/SHA-256 public vector checks Node's independent oracle
and rejects changed message/signature bytes. It contains synthetic public
verification material, not a bunq response or evidence of SDK verification.

Banking modules must enumerate their high-risk cases beside their tests:
exact decimal boundaries, signed raw-byte changes, clock/session expiry,
credential isolation, untrusted descriptions, pagination/partial failures and
uncertain writes. Never replace these with array-shape or identifier-only
assertions. Vitest rejects zero assertions; reviewers must still reject
vacuous assertions because counts cannot prove behavioural relevance.

Issue #14 remains open until banking fixture mutation proofs can run against
implemented consumers. Coverage publishing and shared-workflow consolidation
remain part of #17.
