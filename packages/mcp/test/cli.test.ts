import { afterEach, describe, expect, it, vi } from "vitest";
import { BINARY_NAME, PACKAGE_VERSION } from "../src/package-info.js";

const originalArgv = process.argv;
const originalExitCode = process.exitCode;
afterEach(() => {
  process.argv = originalArgv;
  process.exitCode = originalExitCode;
});

describe("foundation CLI status", () => {
  async function run(args: string[]) {
    vi.resetModules();
    process.argv = [process.execPath, "cli.js", ...args];
    process.exitCode = undefined;
    const stdout = vi.spyOn(console, "log").mockImplementation(() => undefined);
    const stderr = vi.spyOn(console, "error").mockImplementation(() => undefined);
    try {
      await import("../src/cli.js");
      return {
        stdout: stdout.mock.calls.map((call) => call.join(" ")),
        stderr: stderr.mock.calls.map((call) => call.join(" ")),
        exitCode: process.exitCode,
      };
    } finally {
      stdout.mockRestore();
      stderr.mockRestore();
    }
  }
  it("prints the package version without errors", async () => {
    expect(await run(["--version"])).toEqual({
      stdout: [PACKAGE_VERSION],
      stderr: [],
      exitCode: undefined,
    });
  });
  it("describes the unimplemented transport in help", async () => {
    expect(await run(["--help"])).toEqual({
      stdout: [
        `${BINARY_NAME} --version | --help`,
        "Workspace foundation only. The MCP transport and banking tools are not implemented.",
      ],
      stderr: [],
      exitCode: undefined,
    });
  });
  it.each([
    { args: [] },
    { args: ["--unknown"] },
    { args: ["--version", "extra"] },
    { args: ["--help", "extra"] },
  ])("fails closed for arguments $args", async ({ args }) => {
    expect(await run(args)).toEqual({
      stdout: [],
      stderr: [
        `${BINARY_NAME}: MCP transport is not implemented. Use --help for the current package status.`,
      ],
      exitCode: 1,
    });
  });
});
