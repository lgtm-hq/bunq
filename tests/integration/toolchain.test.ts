import { spawnSync } from "node:child_process";
import { mkdtemp, readFile, rm, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { expect, it } from "vitest";

const config = JSON.parse(await readFile(new URL("../../package.json", import.meta.url), "utf8"));
if (
  typeof config !== "object" ||
  config === null ||
  !("packageManager" in config) ||
  typeof config.packageManager !== "string" ||
  !config.packageManager.startsWith("bun@")
) {
  throw new Error("Workspace fixture must declare its Bun package manager.");
}
const packageManager = config.packageManager;

async function runHook({ bunVersion, userAgent }: { bunVersion: string; userAgent: string }) {
  const temporary = await mkdtemp(join(tmpdir(), "bunq-toolchain-test-"));
  try {
    await writeFile(
      join(temporary, "bun"),
      "#!/bin/sh\nprintf '%s\\n' \"$BUNQ_TEST_BUN_VERSION\"\n",
      { mode: 0o755 },
    );
    return spawnSync(process.execPath, ["scripts/check-toolchain.mjs"], {
      cwd: new URL("../../", import.meta.url),
      encoding: "utf8",
      env: {
        ...process.env,
        PATH: `${temporary}:${process.env.PATH}`,
        BUNQ_TEST_BUN_VERSION: bunVersion,
        npm_config_user_agent: userAgent,
      },
    });
  } finally {
    await rm(temporary, { recursive: true, force: true });
  }
}

it("rejects an npm user agent when the toolchain hook runs", async () => {
  const result = await runHook({
    bunVersion: packageManager.slice("bun@".length),
    userAgent: "npm/11.0.0",
  });
  expect(result.status).toBe(1);
  expect(result.stderr).toMatch(/not npm\/11\.0\.0/);
  expect(result.stderr).not.toMatch(/This workspace requires/);
  expect(result.stderr).toMatch(/bun install --frozen-lockfile/);
});

it("rejects a Bun executable reporting a version other than the canonical pin", async () => {
  const result = await runHook({ bunVersion: "0.0.0", userAgent: "bun/0.0.0" });
  expect(result.status).toBe(1);
  expect(result.stderr).toContain(`This workspace requires ${packageManager}.`);
  expect(result.stderr).toMatch(/bun install --frozen-lockfile/);
});
