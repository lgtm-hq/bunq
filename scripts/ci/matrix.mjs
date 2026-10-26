import { appendFileSync, readFileSync } from "node:fs";

const config = JSON.parse(readFileSync(new URL("../../package.json", import.meta.url), "utf8"));
if (!process.env.GITHUB_OUTPUT) throw new Error("GITHUB_OUTPUT is required");
const matrix = {
  os: ["ubuntu-24.04", "macos-15"],
  node: config.bunqWorkspace.nodeMinimums,
};
appendFileSync(process.env.GITHUB_OUTPUT, `matrix=${JSON.stringify(matrix)}\n`);
