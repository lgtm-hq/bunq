import assert from "node:assert/strict";
import { spawnSync } from "node:child_process";
import { readFile } from "node:fs/promises";
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

it("rejects installing the workspace through npm", () => {
  const result = spawnSync(process.execPath, ["scripts/check-toolchain.mjs"], {
    cwd: new URL("../", import.meta.url),
    encoding: "utf8",
    env: { ...process.env, npm_config_user_agent: "npm/11.0.0" },
  });
  assert.equal(result.status, 1);
  assert.match(result.stderr, /bun install --frozen-lockfile/);
});

it("rejects a Bun version other than the canonical pin", () => {
  const result = spawnSync(process.execPath, ["scripts/check-toolchain.mjs"], {
    cwd: new URL("../", import.meta.url),
    encoding: "utf8",
    env: { ...process.env, npm_config_user_agent: "bun/0.0.0" },
  });
  assert.equal(result.status, 1);
  assert.match(result.stderr, new RegExp(config.packageManager.replace(".", "\\.")));
});
