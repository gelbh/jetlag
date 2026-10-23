import { describe, expect, it } from "vitest";
import { readClientSealWrapKey } from "./clientSealWrapKey";
import { TEST_SEAL_WRAP_KEY_BYTES } from "./sealCipher";

function bytesToBase64(bytes: Uint8Array): string {
  let binary = "";
  for (const byte of bytes) {
    binary += String.fromCharCode(byte);
  }
  return btoa(binary);
}

describe("readClientSealWrapKey", () => {
  it("returns undefined when env is missing or empty", () => {
    expect(readClientSealWrapKey(undefined)).toBeUndefined();
    expect(readClientSealWrapKey("")).toBeUndefined();
    expect(readClientSealWrapKey("   ")).toBeUndefined();
  });

  it("decodes a 32-byte base64 wrap key", () => {
    const b64 = bytesToBase64(TEST_SEAL_WRAP_KEY_BYTES);
    const key = readClientSealWrapKey(b64);
    expect(key).toEqual(TEST_SEAL_WRAP_KEY_BYTES);
  });

  it("rejects wrong-length keys", () => {
    expect(readClientSealWrapKey(btoa("short"))).toBeUndefined();
  });
});
