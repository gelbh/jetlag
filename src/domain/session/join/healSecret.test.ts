import { describe, expect, it } from "vitest";
import { generateHealSecret, hashHealSecret } from "./healSecret";

// Same vector as functions/test/memberProofs.test.mjs.
const ABC_SHA256 = "ba7816bf8f01cfea414140de5dae2223b00361a396177a9cb410ff61f20015ad";

describe("healSecret", () => {
  it("generates 256-bit base64url secrets without padding", () => {
    const first = generateHealSecret();
    const second = generateHealSecret();

    expect(first).toMatch(/^[A-Za-z0-9_-]{43}$/);
    expect(second).toMatch(/^[A-Za-z0-9_-]{43}$/);
    expect(first).not.toBe(second);
  });

  it("hashes the secret string to lowercase hex SHA-256", async () => {
    await expect(hashHealSecret("abc")).resolves.toBe(ABC_SHA256);
  });
});
