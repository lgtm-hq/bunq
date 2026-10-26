#!/usr/bin/env node
import { assertSupportedNodeRuntime } from "@lgtm-hq/bunq-client";
import { BINARY_NAME, PACKAGE_VERSION } from "./package-info.js";

assertSupportedNodeRuntime();
const args = process.argv.slice(2);
if (args.length === 1 && args[0] === "--version") {
  console.log(PACKAGE_VERSION);
} else if (args.length === 1 && args[0] === "--help") {
  console.log(`${BINARY_NAME} --version | --help`);
  console.log(
    "Workspace foundation only. The MCP transport and banking tools are not implemented.",
  );
} else {
  console.error(
    `${BINARY_NAME}: MCP transport is not implemented. Use --help for the current package status.`,
  );
  process.exitCode = 1;
}
