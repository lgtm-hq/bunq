import { createPublicKey, verify } from "node:crypto";
import { describe, expect, it } from "vitest";

import { readFile } from "node:fs/promises";

// This verifies public test material against Node's real RSA/SHA-256 oracle.
// It does not verify an unimplemented SDK signing or response-verification API.
const vector = JSON.parse(
  await readFile(new URL("../fixtures/rsa-sha256.json", import.meta.url), "utf8"),
);
if (
  typeof vector !== "object" ||
  vector === null ||
  !("message" in vector) ||
  typeof vector.message !== "string" ||
  !("publicKeyDerHex" in vector) ||
  typeof vector.publicKeyDerHex !== "string" ||
  !("signatureHex" in vector) ||
  typeof vector.signatureHex !== "string"
) {
  throw new Error("Crypto fixture must contain message, public key and signature strings.");
}
const publicKey = createPublicKey({
  key: Buffer.from(vector.publicKeyDerHex, "hex"),
  format: "der",
  type: "spki",
});
const signature = Buffer.from(vector.signatureHex, "hex");
const message = Buffer.from(vector.message);

describe("independent Node crypto reference", () => {
  it("verifies the captured test signature over the exact message bytes", () => {
    expect(verify("RSA-SHA256", message, publicKey, signature)).toBe(true);
  });
  it("rejects changed message bytes", () => {
    expect(verify("RSA-SHA256", Buffer.from("changed"), publicKey, signature)).toBe(false);
  });
  it("rejects a changed signature", () => {
    const tampered = Buffer.from(signature);
    tampered[0] = (tampered[0] ?? 0) ^ 1;
    expect(verify("RSA-SHA256", message, publicKey, tampered)).toBe(false);
  });
});
