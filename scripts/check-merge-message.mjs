import { spawnSync } from "node:child_process";
import { readFileSync } from "node:fs";
import { delimiter } from "node:path";
import { fileURLToPath } from "node:url";

const root = new URL("../", import.meta.url);
const [messageFile, ...extra] = process.argv.slice(2);

try {
  if (!messageFile || extra.length) {
    throw new Error("Usage: node scripts/check-merge-message.mjs <message-file>");
  }
  const message = readFileSync(messageFile, "utf8");
  const [subject, separator] = message.split("\n");
  if (!subject || separator !== "" || message.includes("\r")) {
    throw new Error("Use an LF-only subject, a blank line, then the squash body.");
  }

  // Use the repository's actual rules and prefer its Bun-installed CLI.
  // No package runner: a missing dependency must fail without installing it.
  const result = spawnSync(
    "commitlint",
    ["--config", fileURLToPath(new URL(".commitlintrc.json", root))],
    {
      cwd: root,
      env: {
        ...process.env,
        PATH: [fileURLToPath(new URL("node_modules/.bin/", root)), process.env.PATH].join(
          delimiter,
        ),
      },
      input: message,
      stdio: ["pipe", "inherit", "inherit"],
    },
  );
  if (result.error) throw result.error;
  process.exitCode = result.status ?? 1;
} catch (error) {
  console.error(error.message);
  process.exitCode = 1;
}
