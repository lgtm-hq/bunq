import assert from "node:assert/strict";
import { mkdtemp, mkdir, readFile, rm, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join, resolve } from "node:path";
import { spawnSync } from "node:child_process";
import { fileURLToPath } from "node:url";

const root = fileURLToPath(new URL("../", import.meta.url));
const config = JSON.parse(await readFile(join(root, "package.json"), "utf8"));
const clientName = `@${config.bunqWorkspace.scope}/bunq-client`;
const mcpName = `@${config.bunqWorkspace.scope}/bunq-mcp`;
const archiveDirectory =
  process.argv[2] === "--archives" && process.argv[3] ? resolve(process.argv[3]) : undefined;
if (process.argv.length > 2 && !archiveDirectory)
  throw new Error("Usage: verify-packages.mjs [--archives directory]");
const temporary = await mkdtemp(join(tmpdir(), "bunq-package-contract-"));

function run(command, args, cwd = temporary) {
  const result = spawnSync(command, args, { cwd, encoding: "utf8" });
  if (result.error) throw result.error;
  assert.equal(
    result.status,
    0,
    `${command} ${args.join(" ")}\n${result.stdout}\n${result.stderr}`,
  );
  return result.stdout;
}

try {
  const tarballs = [];
  for (const directory of ["client", "mcp"]) {
    const archive = join(archiveDirectory ?? temporary, `${directory}.tgz`);
    if (!archiveDirectory)
      run(
        "bun",
        ["pm", "pack", "--ignore-scripts", "--filename", archive],
        join(root, "packages", directory),
      );
    const entries = run("tar", ["-tf", archive]).trim().split("\n");
    assert(entries.includes("package/LICENSE"));
    assert(entries.some((entry) => entry.endsWith(".d.ts")));
    assert(
      entries.every((entry) => !/\.(?:tsbuildinfo|ts)$/.test(entry) || entry.endsWith(".d.ts")),
    );
    tarballs.push(archive);
  }

  // No workspace symlinks or development dependencies in this consumer.
  const consumer = join(temporary, "consumer");
  await mkdir(consumer);
  await writeFile(
    join(consumer, "package.json"),
    JSON.stringify({ private: true, type: "module" }),
  );
  run(
    "npm",
    [
      "install",
      "--offline",
      "--ignore-scripts",
      "--no-audit",
      "--no-fund",
      "--package-lock=false",
      ...tarballs,
    ],
    consumer,
  );
  const installedClient = JSON.parse(
    await readFile(join(consumer, "node_modules", clientName, "package.json"), "utf8"),
  );
  const installedMcp = JSON.parse(
    await readFile(join(consumer, "node_modules", mcpName, "package.json"), "utf8"),
  );
  assert.equal(installedClient.version, config.version);
  assert.equal(installedMcp.dependencies[clientName], config.version);
  assert.deepEqual(installedClient.dependencies ?? {}, {});
  const installedLicense = await readFile(
    join(consumer, "node_modules", clientName, "LICENSE"),
    "utf8",
  );
  assert.equal(installedLicense, await readFile(join(root, "LICENSE"), "utf8"));

  await writeFile(
    join(consumer, "consumer.mjs"),
    `
    import assert from "node:assert/strict";
    import { assertSupportedNodeRuntime } from "${clientName}";
    import { createRequire } from "node:module";
    assertSupportedNodeRuntime();
    await assert.rejects(import("${clientName}/dist/runtime-support.js"), { code: "ERR_PACKAGE_PATH_NOT_EXPORTED" });
    assert.throws(() => createRequire(import.meta.url)("${clientName}"), { code: "ERR_PACKAGE_PATH_NOT_EXPORTED" });
  `,
  );
  run(process.execPath, ["consumer.mjs"], consumer);

  await writeFile(
    join(consumer, "consumer.mts"),
    `
    import { assertSupportedNodeRuntime } from "${clientName}";
    const check: (version?: string) => void = assertSupportedNodeRuntime;
    check();
    // @ts-expect-error runtime versions must be strings
    assertSupportedNodeRuntime(22);
  `,
  );
  run(
    process.execPath,
    [
      join(root, "node_modules/typescript/bin/tsc"),
      "--noEmit",
      "--strict",
      "--target",
      "ES2022",
      "--module",
      "NodeNext",
      "--moduleResolution",
      "NodeNext",
      "consumer.mts",
    ],
    consumer,
  );

  const binary = join(consumer, "node_modules/.bin", config.bunqWorkspace.binary);
  assert.equal(run(binary, ["--version"], consumer).trim(), config.version);
  assert.match(run(binary, ["--help"], consumer), /not implemented/);
  const unavailable = spawnSync(binary, [], { cwd: consumer, encoding: "utf8" });
  assert.equal(unavailable.status, 1);
  assert.equal(unavailable.stdout, "");
  assert.match(unavailable.stderr, /MCP transport is not implemented/);
  console.log(
    `Packed consumer contract passed on ${process.platform} Node ${process.versions.node}.`,
  );
} finally {
  await rm(temporary, { recursive: true, force: true });
}
