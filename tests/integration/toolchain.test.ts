import { spawnSync } from "node:child_process";
import { mkdtemp, readFile, rm, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { expect, it } from "vitest";

const config = JSON.parse(await readFile(new URL("../../package.json", import.meta.url), "utf8"));

it("rejects an npm user agent when the toolchain hook runs", () => {
  const result = spawnSync(process.execPath, ["scripts/check-toolchain.mjs"], {
    cwd: new URL("../../", import.meta.url),
    encoding: "utf8",
    env: { ...process.env, npm_config_user_agent: "npm/11.0.0" },
  });
  expect(result.status).toBe(1);
  expect(result.stderr).toMatch(/not npm\/11\.0\.0/);
  expect(result.stderr).not.toMatch(/This workspace requires/);
  expect(result.stderr).toMatch(/bun install --frozen-lockfile/);
});

it("rejects a Bun executable reporting a version other than the canonical pin", async () => {
  const temporary = await mkdtemp(join(tmpdir(), "bunq-toolchain-test-"));
  try {
    await writeFile(join(temporary, "bun"), "#!/bin/sh\nprintf '0.0.0\\n'\n", { mode: 0o755 });
    const result = spawnSync(process.execPath, ["scripts/check-toolchain.mjs"], {
      cwd: new URL("../../", import.meta.url),
      encoding: "utf8",
      env: { ...process.env, PATH: `${temporary}:${process.env.PATH}` },
    });
    expect(result.status).toBe(1);
    expect(result.stderr).toContain(`This workspace requires ${config.packageManager}.`);
    expect(result.stderr).toMatch(/bun install --frozen-lockfile/);
  } finally {
    await rm(temporary, { recursive: true, force: true });
  }
});
