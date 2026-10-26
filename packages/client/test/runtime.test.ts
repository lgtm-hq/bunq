import { describe, expect, it } from "vitest";
import { assertSupportedNodeRuntime } from "../src/runtime.js";
import { NODE_RANGE } from "../src/runtime-support.js";

describe("supported consumer runtime boundary", () => {
  it.each(["22.14.0", "22.22.1", "22.14.1", "24.0.0", "24.1.0", "26.0.0"])(
    "accepts Node %s",
    (version) => {
      expect(() => assertSupportedNodeRuntime(version)).not.toThrow();
    },
  );
  it("accepts the executing supported Node runtime by default", () => {
    expect(() => assertSupportedNodeRuntime()).not.toThrow();
  });
  it.each([
    "20.19.0",
    "22.13.9",
    "23.0.0",
    "25.0.0",
    "27.0.0",
    "22.14",
    "22.14.0-nightly",
    "unknown",
    "",
    "v22.14.0",
  ])("rejects Node %s with remediation", (version) => {
    expect(() => assertSupportedNodeRuntime(version)).toThrow(
      new Error(`Unsupported Node.js ${version}; bunq requires ${NODE_RANGE}.`),
    );
  });
});
