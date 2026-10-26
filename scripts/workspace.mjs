import { chmod, cp, rm } from "node:fs/promises";
import { spawnSync } from "node:child_process";
import { fileURLToPath } from "node:url";

const root = new URL("../", import.meta.url);
function run(args) {
  const result = spawnSync(process.execPath, args, { cwd: root, stdio: "inherit" });
  if (result.error) throw result.error;
  if (result.status !== 0) process.exit(result.status ?? 1);
}
const mode = process.argv[2];
if (mode !== "build" && mode !== "typecheck") throw new Error("Expected build or typecheck");
run([fileURLToPath(new URL("scripts/check-toolchain.mjs", root))]);
run([fileURLToPath(new URL("scripts/generate.mjs", root))]);
// Build mode checks both projects in dependency order and emits declarations.
// A clean build prevents stale exports from surviving a renamed source file.
if (mode === "build") {
  for (const directory of ["client", "mcp"]) {
    await rm(new URL(`packages/${directory}/dist/`, root), { recursive: true, force: true });
  }
}
run([fileURLToPath(new URL("node_modules/typescript/bin/tsc", root)), "--build", "--force"]);
if (mode === "build") {
  for (const directory of ["client", "mcp"]) {
    await cp(new URL("LICENSE", root), new URL(`packages/${directory}/LICENSE`, root));
    if (directory === "mcp") await chmod(new URL("packages/mcp/dist/cli.js", root), 0o755);
  }
}
