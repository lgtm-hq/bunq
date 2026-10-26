import assert from "node:assert/strict";
import { spawnSync } from "node:child_process";
import { mkdtemp, mkdir, readFile, rm, writeFile } from "node:fs/promises";
import { fileURLToPath } from "node:url";

const root = new URL("../", import.meta.url);
const temporary = await mkdtemp(fileURLToPath(new URL(".test-gates-", root)));
const uncovered = await mkdtemp(fileURLToPath(new URL("packages/gate-probe-", root)));
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
  async function run({ include, coverage = false }) {
    await writeFile(
      `${temporary}/config.ts`,
      `
import base from "../vitest.config.ts";
export default {
  ...base,
  test: { ...base.test, include: ${JSON.stringify(include)},
    coverage: { ...base.test.coverage, enabled: ${coverage},
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
    assert.equal(result.status, 1, result.stdout + result.stderr);
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
  assert.match(JSON.stringify(focused), /only|allowOnly/);
  await mkdir(`${uncovered}/src`);
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
  const summary = JSON.parse(await readFile(`${temporary}/coverage/coverage-summary.json`, "utf8"));
  const missing = Object.entries(summary).find(([path]) => path.endsWith("/src/uncovered.ts"));
  assert(missing, "Unimported shipped source disappeared from coverage");
  assert.equal(missing[1].statements.pct, 0);
  console.log(
    "Test gates rejected network attempts, assertionless/focused/empty tests and uncovered source.",
  );
} finally {
  await rm(temporary, { recursive: true, force: true });
  await rm(uncovered, { recursive: true, force: true });
}
