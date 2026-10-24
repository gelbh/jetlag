import { describe, expect, it } from "vitest";
import {
  decryptSealPayload,
  encryptSealPayload,
  isSealCipherEnvelopeV1,
  SEAL_CIPHER_ALG,
  SEAL_WRAP_KEY_ID_TEST,
  TEST_SEAL_WRAP_KEY_BYTES,
} from "./sealCipher";
import { canonicalSealPayload } from "./sealHash";

const PLAINTEXT = canonicalSealPayload("Castle", 53.35, -6.26, "s3cret");

describe("encryptSealPayload / decryptSealPayload", () => {
  it("round-trips canonical seal plaintext under a test wrap key", async () => {
    const envelope = await encryptSealPayload(PLAINTEXT, {
      wrappingKey: TEST_SEAL_WRAP_KEY_BYTES,
      keyId: SEAL_WRAP_KEY_ID_TEST,
    });

    expect(isSealCipherEnvelopeV1(envelope)).toBe(true);
    expect(envelope).toMatchObject({
      v: 1,
      alg: SEAL_CIPHER_ALG,
      keyId: SEAL_WRAP_KEY_ID_TEST,
    });
    expect(envelope.ciphertext).not.toContain("Castle");
    expect(envelope.ciphertext).not.toContain("s3cret");

    await expect(
      decryptSealPayload(envelope, { wrappingKey: TEST_SEAL_WRAP_KEY_BYTES }),
    ).resolves.toBe(PLAINTEXT);
  });

  it("produces distinct iv/ciphertext across calls", async () => {
    const a = await encryptSealPayload(PLAINTEXT, {
      wrappingKey: TEST_SEAL_WRAP_KEY_BYTES,
      keyId: SEAL_WRAP_KEY_ID_TEST,
    });
    const b = await encryptSealPayload(PLAINTEXT, {
      wrappingKey: TEST_SEAL_WRAP_KEY_BYTES,
      keyId: SEAL_WRAP_KEY_ID_TEST,
    });

    expect(a.iv).not.toBe(b.iv);
    expect(a.ciphertext).not.toBe(b.ciphertext);
    expect(a.wrappedKey).not.toBe(b.wrappedKey);
  });

  it("rejects empty plaintext and wrong wrap key length", async () => {
    await expect(
      encryptSealPayload("", {
        wrappingKey: TEST_SEAL_WRAP_KEY_BYTES,
        keyId: SEAL_WRAP_KEY_ID_TEST,
      }),
    ).rejects.toThrow(/non-empty/);

    await expect(
      encryptSealPayload(PLAINTEXT, {
        wrappingKey: new Uint8Array(16),
        keyId: SEAL_WRAP_KEY_ID_TEST,
      }),
    ).rejects.toThrow(/32 bytes/);
  });

  it("fails decrypt when wrap key does not match", async () => {
    const envelope = await encryptSealPayload(PLAINTEXT, {
      wrappingKey: TEST_SEAL_WRAP_KEY_BYTES,
      keyId: SEAL_WRAP_KEY_ID_TEST,
    });
    const otherKey = new Uint8Array(TEST_SEAL_WRAP_KEY_BYTES);
    otherKey[0] ^= 0xff;

    await expect(decryptSealPayload(envelope, { wrappingKey: otherKey })).rejects.toThrow();
  });
});

describe("isSealCipherEnvelopeV1", () => {
  it("rejects incomplete envelopes", () => {
    expect(isSealCipherEnvelopeV1(null)).toBe(false);
    expect(isSealCipherEnvelopeV1({ v: 1, alg: SEAL_CIPHER_ALG })).toBe(false);
  });
});
