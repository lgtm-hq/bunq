import { readFileSync } from "node:fs";
import { spawnSync } from "node:child_process";

const config = JSON.parse(readFileSync(new URL("../package.json", import.meta.url), "utf8"));
const expected = config.packageManager.slice("bun@".length);
const result = spawnSync("bun", ["--version"], { encoding: "utf8" });
if (result.error || result.status !== 0 || result.stdout.trim() !== expected) {
  console.error(
    `This workspace requires ${config.packageManager}. Install that version, then run bun install --frozen-lockfile.`,
  );
  process.exit(1);
}
const agent = process.env.npm_config_user_agent;
if (agent && !agent.startsWith(`bun/${expected} `) && agent !== `bun/${expected}`) {
  console.error(
    `Use ${config.packageManager}, not ${agent.split(" ")[0]}. Run bun install --frozen-lockfile.`,
  );
  process.exit(1);
}
const [major, minor, patch] = process.versions.node.split(".").map(Number);
const isSupported = config.bunqWorkspace.nodeMinimums.some((minimum) => {
  const [requiredMajor, requiredMinor, requiredPatch] = minimum.split(".").map(Number);
  return (
    major === requiredMajor &&
    (minor > requiredMinor || (minor === requiredMinor && patch >= requiredPatch))
  );
});
if (!isSupported) {
  console.error(`Unsupported Node.js ${process.versions.node}; use ${config.engines.node}.`);
  process.exit(1);
}
