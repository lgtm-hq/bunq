import assert from "node:assert/strict";
import { spawnSync } from "node:child_process";
import { mkdtemp, readFile, rm, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { describe, it } from "node:test";
import { assertSupportedNodeRuntime } from "../packages/client/dist/runtime.js";

const config = JSON.parse(await readFile(new URL("../package.json", import.meta.url), "utf8"));

describe("supported consumer runtime boundary", () => {
  for (const version of ["22.14.0", "22.22.1", "24.0.0", "26.0.0"]) {
    it(`accepts supported Node ${version}`, () => {
      assert.doesNotThrow(() => assertSupportedNodeRuntime(version));
    });
  }
  for (const version of [
    "20.19.0",
    "22.13.9",
    "23.0.0",
    "25.0.0",
    "27.0.0",
    "22.14",
    "22.14.0-nightly",
    "unknown",
  ]) {
    it(`rejects unsupported or malformed Node ${version} with remediation`, () => {
      assert.throws(
        () => assertSupportedNodeRuntime(version),
        /Unsupported Node.js .*bunq requires/,
      );
    });
  }
});

it("rejects an npm user agent when the toolchain hook runs", () => {
  const result = spawnSync(process.execPath, ["scripts/check-toolchain.mjs"], {
    cwd: new URL("../", import.meta.url),
    encoding: "utf8",
    env: { ...process.env, npm_config_user_agent: "npm/11.0.0" },
  });
  assert.equal(result.status, 1);
  assert.match(result.stderr, /bun install --frozen-lockfile/);
});

it("rejects a Bun executable reporting a version other than the canonical pin", async () => {
  const temporary = await mkdtemp(join(tmpdir(), "bunq-toolchain-test-"));
  try {
    await writeFile(join(temporary, "bun"), "#!/bin/sh\nprintf '0.0.0\\n'\n", { mode: 0o755 });
    const result = spawnSync(process.execPath, ["scripts/check-toolchain.mjs"], {
      cwd: new URL("../", import.meta.url),
      encoding: "utf8",
      env: { ...process.env, PATH: `${temporary}:${process.env.PATH}` },
    });
    assert.equal(result.status, 1);
    assert(result.stderr.includes(`This workspace requires ${config.packageManager}.`));
    assert.match(result.stderr, /bun install --frozen-lockfile/);
  } finally {
    await rm(temporary, { recursive: true, force: true });
  }
});
