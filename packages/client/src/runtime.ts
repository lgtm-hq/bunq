import { NODE_MINIMUMS, NODE_RANGE } from "./runtime-support.js";

/** Reject unsupported Node releases before a consumer begins banking work. */
export function assertSupportedNodeRuntime(version = process.versions.node): void {
  const match = /^(\d+)\.(\d+)\.(\d+)$/.exec(version);
  if (match) {
    const major = Number(match[1]);
    const minor = Number(match[2]);
    const patch = Number(match[3]);
    const isSupported = NODE_MINIMUMS.some(
      ([requiredMajor, requiredMinor, requiredPatch]) =>
        major === requiredMajor &&
        (minor > requiredMinor || (minor === requiredMinor && patch >= requiredPatch)),
    );
    if (isSupported) return;
  }
  throw new Error(`Unsupported Node.js ${version}; bunq requires ${NODE_RANGE}.`);
}

assertSupportedNodeRuntime();
