import assert from "node:assert/strict";
import { spawnSync } from "node:child_process";
import { cp, mkdtemp, mkdir, readFile, rm, symlink, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import { dirname, join } from "node:path";
import { fileURLToPath, pathToFileURL } from "node:url";

const sourceRoot = new URL("../", import.meta.url);
const sandbox = await mkdtemp(join(tmpdir(), "bunq-test-gates-"));
const root = pathToFileURL(`${sandbox}/`);
const temporary = join(sandbox, ".test-gates");
const uncovered = join(sandbox, "packages", "gate-probe");
const cases = [
  ["fetch", 'await fetch("https://network.invalid")'],
  ["http", 'http.get("http://network.invalid")'],
  ["https", 'https.request("https://network.invalid")'],
  ["http2", 'http2.connect("https://network.invalid")'],
  ["socket", 'new net.Socket().connect(443, "network.invalid")'],
  ["tls", 'tls.connect(443, "network.invalid")'],
  ["udp", 'dgram.createSocket("udp4").send("probe", 53, "network.invalid")'],
  ["dns", 'dns.lookup("network.invalid", () => {})'],
  ["dns-promise", 'await dns.promises.lookup("network.invalid")'],
  ["dns-resolver", 'new dns.Resolver().resolve4("network.invalid", () => {})'],
  ["dns-promise-resolver", 'await new dns.promises.Resolver().resolve6("network.invalid")'],
  ["assertionless", ""],
];
try {
  // Copy current source, including uncommitted tests, without ignored secrets,
  // dependencies or reports. Probe mutations never enter the working checkout.
  const files = spawnSync("git", ["ls-files", "--cached", "--others", "--exclude-standard", "-z"], {
    cwd: sourceRoot,
    encoding: "utf8",
  });
  if (files.error) throw files.error;
  assert.equal(files.status, 0, files.stderr);
  for (const file of files.stdout.split("\0").filter(Boolean)) {
    const destination = join(sandbox, file);
    await mkdir(dirname(destination), { recursive: true });
    try {
      await cp(join(fileURLToPath(sourceRoot), file), destination);
    } catch (error) {
      // Unstaged deletions are current source state, not files to resurrect.
      if (!(error instanceof Error && "code" in error && error.code === "ENOENT")) throw error;
    }
  }
  await symlink(
    fileURLToPath(new URL("node_modules", sourceRoot)),
    join(sandbox, "node_modules"),
    "dir",
  );
  await mkdir(temporary);
  await writeFile(
    `${temporary}/negative.test.ts`,
    `
import { it, expect } from "vitest";
import http from "node:http";
import https from "node:https";
import http2 from "node:http2";
import net from "node:net";
import tls from "node:tls";
import dgram from "node:dgram";
import dns from "node:dns";
${cases
  .map(
    ([name, code]) =>
      `it(${JSON.stringify(name)}, async () => {
    try { ${code}; } catch { /* A swallowed error must still fail teardown. */ }
    ${name === "assertionless" ? "" : "expect(1 + 1).toBe(2);"}
  });`,
  )
  .join("\n")}
`,
  );
  async function run({ include, coverage = false, thresholds = true, expectedStatus = 1 }) {
    // Missing reports must fail; a previous probe is never evidence for this run.
    await rm(`${temporary}/results.json`, { force: true });
    await rm(`${temporary}/coverage`, { recursive: true, force: true });
    await writeFile(
      `${temporary}/config.ts`,
      `
import base from "../vitest.config.ts";
export default {
  ...base,
  test: { ...base.test, include: ${JSON.stringify(include)},
    coverage: { ...base.test.coverage, enabled: ${coverage},
      ${thresholds ? "" : "thresholds: {},"}
      reportsDirectory: ${JSON.stringify(`${temporary}/coverage`)} },
  },
};
`,
    );
    const result = spawnSync(
      process.execPath,
      [
        fileURLToPath(new URL("node_modules/vitest/vitest.mjs", root)),
        "run",
        "--config",
        `${temporary}/config.ts`,
        "--reporter=json",
        `--outputFile=${temporary}/results.json`,
      ],
      { cwd: root, encoding: "utf8", timeout: 60_000 },
    );
    if (result.error) throw result.error;
    assert.equal(result.status, expectedStatus, result.stdout + result.stderr);
    return result;
  }
  const negative = await run({ include: [`${temporary}/negative.test.ts`] });
  const report = JSON.parse(await readFile(`${temporary}/results.json`, "utf8"));
  const assertions = report.testResults.flatMap((suite) => suite.assertionResults);
  for (const [name] of cases) {
    const test = assertions.find((entry) => entry.title === name);
    assert.equal(test?.status, "failed", `${name} incorrectly passed`);
    assert.match(
      test.failureMessages.join("\n"),
      name === "assertionless" ? /assertion/i : /Unexpected network attempts/,
    );
  }
  assert.doesNotMatch(negative.stderr, /ENOTFOUND|ECONNREFUSED/);
  await writeFile(
    `${temporary}/teardown.test.ts`,
    `
import { afterAll, it, expect } from "vitest";
it("normal assertion before teardown", () => expect(2 + 2).toBe(4));
afterAll(async () => {
  try { await fetch("https://network.invalid"); }
  catch { /* Swallowed suite-cleanup attempts must also fail the run. */ }
});
`,
  );
  await run({ include: [`${temporary}/teardown.test.ts`] });
  const teardown = JSON.parse(await readFile(`${temporary}/results.json`, "utf8"));
  assert.equal(teardown.numPassedTests, 1);
  assert(
    teardown.testResults.some(
      (suite) => suite.status === "failed" && /Unexpected network attempts/.test(suite.message),
    ),
  );
  await run({ include: [`${temporary}/absent.test.ts`] });
  const empty = JSON.parse(await readFile(`${temporary}/results.json`, "utf8"));
  assert.equal(empty.numTotalTests, 0);
  assert.equal(empty.success, false);
  await writeFile(
    `${temporary}/focused.test.ts`,
    'import { it, expect } from "vitest"; it.only("focused", () => expect(2 + 2).toBe(4));\n',
  );
  await run({ include: [`${temporary}/focused.test.ts`] });
  const focused = JSON.parse(await readFile(`${temporary}/results.json`, "utf8"));
  assert.equal(focused.numPassedTests, 0);
  const focusedAssertions = focused.testResults.flatMap((suite) => suite.assertionResults);
  assert.equal(focusedAssertions.length, 1);
  assert.equal(focusedAssertions[0].status, "failed");
  assert(
    focusedAssertions[0].failureMessages.some((message) =>
      message.startsWith("Error: [Vitest] Unexpected .only modifier."),
    ),
  );
  await mkdir(`${uncovered}/src`, { recursive: true });
  await writeFile(
    `${uncovered}/src/uncovered.ts`,
    "export function missingCoverage(value: boolean) { return value ? 1 : 0; }\n",
  );
  await run({
    include: ["packages/*/test/**/*.test.ts", "tests/**/*.test.ts"],
    coverage: true,
  });
  const coverage = JSON.parse(await readFile(`${temporary}/results.json`, "utf8"));
  assert.equal(coverage.numFailedTests, 0);
  assert(coverage.numPassedTests > 0);
  for (const suite of coverage.testResults) {
    assert.equal(suite.status, "passed", suite.message);
  }
  const summary = JSON.parse(await readFile(`${temporary}/coverage/coverage-summary.json`, "utf8"));
  const missing = Object.entries(summary).find(([path]) => path.endsWith("/src/uncovered.ts"));
  assert(missing, "Unimported shipped source disappeared from coverage");
  assert.equal(missing[1].statements.pct, 0);
  // The same files and coverage collection must pass when only thresholds change.
  await run({
    include: ["packages/*/test/**/*.test.ts", "tests/**/*.test.ts"],
    coverage: true,
    thresholds: false,
    expectedStatus: 0,
  });
  console.log(
    "Test gates rejected network attempts, assertionless/focused/empty tests and uncovered source.",
  );
} finally {
  await rm(sandbox, { recursive: true, force: true });
}
