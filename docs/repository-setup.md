# Repository bootstrap status

The foundation adds a documentation/workflow quality baseline so the first PR
can be reviewed through CI. It does not complete the [bootstrap epic][bootstrap].

## Initial review base

The repository started without commits or an existing default branch. A signed
empty-tree root establishes `main` solely as a GitHub comparison base. It
carries no documentation, workflow, package or banking implementation. All
foundation content is delivered through the reviewed PR. No ruleset is weakened
or bypassed to create this base; effective branch rules were inspected before
onboarding.

## Initial checks

All reusable workflows use the released lgtm-ci v0.78.0 commit, resolved from
the annotated release tag. No deprecated `tooling-ref` override is needed.

- `quality.yml` runs full lintro using the reusable's pinned container on PRs,
  main pushes and merge groups. There is no tool filter or bank credential.
- `ai-review.yml` runs blocking lintro review on same-repository PRs, with
  explicit review/provider secret forwarding and read-only GitHub token
  permissions. Fork PRs cannot access those secrets. Provider/model/transport
  resolve through the organisation's Actions variables. Independent Sol and Opus
  reviews remain separate requirements; a green CI review does not replace them.
- `all-checks-gate.yml` is a separate workflow so it cannot exclude quality jobs
  from its own run. The intended aggregate context is
  `gate / ✅ All Checks Passed`; confirm actual contexts from real runs before
  making them required. Skipped jobs do not prove the underlying work ran.

Following [onboarding][onboarding], the initial audit runs were Quality
`40301431746` and AI Review `40301431779`. Their harden-runner logs showed
GitHub artifact uploads to `results-receiver.actions.githubusercontent.com` and
rotating Azure blob storage. Both callers now use block mode and append only
those artifact endpoints to the canonical presets. Other observed destinations
were already covered by the quality preset or the resolved OpenAI CLI review
preset. Block-mode validation is required; a failed authentication run does not
prove inference works.

The first non-draft run must demonstrate a real, complete lintro review, not a
missing-secret or draft skip. App access and inherited credentials must be
verified from execution; their presence is not inferred from workflow YAML. The
initial AI run authenticated the review App but inference failed with an OpenAI
CLI 401, producing no review. It is not a successful review gate. The repository
now overrides the review variables to `anthropic`, `cli`, `claude-opus-5-5`,
using the existing org CLI credential forwarding. Org defaults are unchanged.
The next CI run must demonstrate actual authentication and complete review;
configuration alone does not satisfy that gate.

## Outstanding gates

Workspace pins (#11), full local lintro/typecheck setup (#13), behavioural tests
and coverage (#14), complete CI/runtime checks (#17), layered security (#21),
review-app/contributor onboarding (#22), live protections (#26) and the final
bootstrap acceptance (#33) remain separate work. The baseline does not claim
these capabilities are complete. The operating agreement follows the org
review policy and adds independent Sol and Opus reviews. Organisation-level
ruleset enforcement is still pending #26; the repo-scoped baseline is active.

A repository-scoped `bootstrap-main` ruleset now protects the default branch
with no bypass actors: PR-only squash merges, resolved threads, signatures,
linear history, deletion/force-push protection, and the observed quality and
aggregate check contexts. Its formal approval count follows the existing org
review ruleset; the independent Sol and Opus contract is additional. This
initial protection does not complete org ruleset registration or release-tag
protection in #26.

## Local foundation validation

Until the uv project is defined, use the installed lintro with
`uv run --no-project lintro fmt` and `uv run --no-project lintro chk`. Run both
without tool filters. `.lintro-ignore` excludes only generated reports and the
reusable's separate pinned tooling checkout; project source remains in scope.
The local tool version is validation evidence, not a committed workspace pin.
There is no application test/build target at this stage; a skipped test runner
must not be reported as a passing suite.

[bootstrap]: https://github.com/lgtm-hq/bunq/issues/2
[onboarding]: https://github.com/lgtm-hq/lgtm-ci/blob/main/docs/onboarding.md
