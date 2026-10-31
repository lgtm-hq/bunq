import assert from "node:assert/strict";
import { spawnSync } from "node:child_process";
import { mkdtemp, rm, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { it } from "node:test";
import { fileURLToPath } from "node:url";

const helper = fileURLToPath(new URL("../scripts/check-merge-message.mjs", import.meta.url));

async function check(message) {
  const temporary = await mkdtemp(join(tmpdir(), "bunq-merge-message-"));
  try {
    const messageFile = join(temporary, "squash message.txt");
    await writeFile(messageFile, message);
    return spawnSync(process.execPath, [helper, messageFile], {
      // Config and dependency resolution must work outside the repository too.
      cwd: temporary,
      encoding: "utf8",
    });
  } finally {
    await rm(temporary, { recursive: true, force: true });
  }
}

it("rejects the actual main48f1e6f squash body and footer from PR90", async () => {
  const result = await check(`chore(ci): make bunq runner-switch ready (#90)

* chore(ci): make bunq runner-switch ready

Pin the three lgtm-ci callers to released v0.82.2 and let the direct workspace prepare job honor LGTM_CI_RUNNER with the ubuntu-26.04 fallback. Preserve the compatibility matrix and existing caller contracts.

Refs: lgtm-hq/lgtm-ci#1234 (bunq checklist lane only)

* chore(ci): verify independently reviewed runner head

Fresh non-draft CI head carrying the unchanged tree reviewed by independent Sol, Opus and queue Sonnet at 8c4232168c8bdd5a60268656d467c6b41f0b27e0. All three verdicts APPROVE; optional matrix comment deferred, genuine CI and post-merge acceptance remain required.

---------

Co-authored-by: lgtm-ai-bot[bot] <306309947+lgtm-ai-bot[bot]@users.noreply.github.com>
`);
  assert.equal(result.status, 1, result.stderr);
  assert.match(result.stdout, /\[body-max-line-length\]/);
  assert.match(result.stdout, /\[footer-max-line-length\]/);
});

it("rejects the actual previous main362eb621 squash body from PR89", async () => {
  const result = await check(`ci: restore block egress policy and pin lgtm-ci v0.79.2 (#89)

Reverse the lgtm-ci#1207 audit mitigation now that harden-runner v2.22.3 is pinned upstream and lgtm-ci v0.79.2 ships block egress again.

Closes #88
Refs lgtm-hq/lgtm-ci#1207

Co-authored-by: lgtm-ai-bot[bot] <306309947+lgtm-ai-bot[bot]@users.noreply.github.com>
`);
  assert.equal(result.status, 1, result.stderr);
  assert.match(result.stdout, /\[body-max-line-length\]/);
});

it("accepts an explicit compliant squash message with body and footer", async () => {
  const result = await check(`fix(ci): validate explicit squash messages

Validate the complete merge message against the repository's commitlint rules.
Pass its title and body explicitly when squash merging a reviewed head.

Refs: #91
`);
  assert.equal(result.status, 0, result.stdout + result.stderr);
});

it("uses Conventional Commits rules beyond line lengths", async () => {
  const result = await check("repair squash messages\n\nA short body.\n");
  assert.equal(result.status, 1, result.stderr);
  assert.match(result.stdout, /\[type-empty\]/);
});

for (const message of ["", "fix(ci): missing separator\nbody\n", "fix(ci): crlf\r\n\r\nbody\r\n"]) {
  it(`rejects a message that cannot be split safely: ${JSON.stringify(message)}`, async () => {
    const result = await check(message);
    assert.equal(result.status, 1);
    assert.match(result.stderr, /LF-only subject, a blank line/);
  });
}

it("fails when the message file is missing", () => {
  const result = spawnSync(process.execPath, [helper], { encoding: "utf8" });
  assert.equal(result.status, 1);
  assert.match(result.stderr, /Usage:/);
});
