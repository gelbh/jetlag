/**
 * Castle Siege seal envelope unwrap (Phase 4 / S4).
 *
 * GSM secret param name: `CASTLE_SIEGE_SEAL_WRAP_KEY`
 * (base64 of 32 raw AES-256 wrap-key bytes; never log the value).
 * See CONTRIBUTING.md "Where do env vars go?".
 *
 * Unit tests inject wrap bytes via `wrappingKey` — do not read GSM in tests.
 */

export const SEAL_CIPHER_ALG = "A256GCM";
export const SEAL_WRAP_KEY_ID_V1 = "castle-siege-seal-wrap-v1";
/** Test-only key id; pair with {@link TEST_SEAL_WRAP_KEY_BYTES}. */
export const TEST_SEAL_WRAP_KEY_ID = "castle-siege-seal-wrap-test";

/**
 * Deterministic 32-byte wrap key for unit tests only (not a production secret).
 * Mirrors client `TEST_SEAL_WRAP_KEY_BYTES`.
 */
export const TEST_SEAL_WRAP_KEY_BYTES = new Uint8Array([
  0x63, 0x73, 0x2d, 0x74, 0x65, 0x73, 0x74, 0x2d, 0x73, 0x65, 0x61, 0x6c, 0x2d, 0x77, 0x72, 0x61,
  0x70, 0x2d, 0x6b, 0x65, 0x79, 0x2d, 0x76, 0x31, 0x2d, 0x6f, 0x6e, 0x6c, 0x79, 0x21, 0x21, 0x21,
]);

function bytesToBase64(bytes) {
  return Buffer.from(bytes).toString("base64");
}

function base64ToBytes(value) {
  return new Uint8Array(Buffer.from(value, "base64"));
}

function requireAes256KeyBytes(bytes, label) {
  if (!(bytes instanceof Uint8Array) || bytes.byteLength !== 32) {
    throw new Error(`${label} must be 32 bytes (AES-256).`);
  }
}

async function importAesGcmKey(raw, usages) {
  requireAes256KeyBytes(raw, "AES key");
  return crypto.subtle.importKey("raw", raw, { name: "AES-GCM", length: 256 }, false, usages);
}

export function isSealCipherEnvelopeV1(value) {
  if (!value || typeof value !== "object" || Array.isArray(value)) {
    return false;
  }
  return (
    value.v === 1 &&
    value.alg === SEAL_CIPHER_ALG &&
    typeof value.keyId === "string" &&
    value.keyId.length > 0 &&
    typeof value.iv === "string" &&
    value.iv.length > 0 &&
    typeof value.ciphertext === "string" &&
    value.ciphertext.length > 0 &&
    typeof value.wrappedKey === "string" &&
    value.wrappedKey.length > 0 &&
    typeof value.wrapIv === "string" &&
    value.wrapIv.length > 0
  );
}

/**
 * Decode GSM / env wrap-key material (base64 of 32 bytes).
 * @param {string} encoded
 * @returns {Uint8Array}
 */
export function decodeSealWrapKeyFromEnv(encoded) {
  if (typeof encoded !== "string" || encoded.length === 0) {
    throw new Error("CASTLE_SIEGE_SEAL_WRAP_KEY is missing.");
  }
  const bytes = base64ToBytes(encoded.trim());
  requireAes256KeyBytes(bytes, "CASTLE_SIEGE_SEAL_WRAP_KEY");
  return bytes;
}

/**
 * Resolve wrap key: test inject wins, else decode env/GSM string.
 * @param {{ wrappingKey?: Uint8Array, wrapKeyEnv?: string }} [options]
 */
export function resolveSealWrapKey(options = {}) {
  if (options.wrappingKey) {
    requireAes256KeyBytes(options.wrappingKey, "wrappingKey");
    return options.wrappingKey;
  }
  return decodeSealWrapKeyFromEnv(options.wrapKeyEnv ?? process.env.CASTLE_SIEGE_SEAL_WRAP_KEY);
}

export async function encryptSealPayload(plaintext, options) {
  if (!plaintext) {
    throw new Error("Seal plaintext must be non-empty.");
  }
  if (!options?.keyId) {
    throw new Error("Seal wrap keyId is required.");
  }

  const wrapKey = await importAesGcmKey(options.wrappingKey, ["encrypt", "decrypt"]);
  const contentKey = await crypto.subtle.generateKey({ name: "AES-GCM", length: 256 }, true, [
    "encrypt",
    "decrypt",
  ]);

  const iv = crypto.getRandomValues(new Uint8Array(12));
  const ciphertextBuf = await crypto.subtle.encrypt(
    { name: "AES-GCM", iv },
    contentKey,
    new TextEncoder().encode(plaintext),
  );

  const rawContent = new Uint8Array(await crypto.subtle.exportKey("raw", contentKey));
  const wrapIv = crypto.getRandomValues(new Uint8Array(12));
  const wrappedKeyBuf = await crypto.subtle.encrypt(
    { name: "AES-GCM", iv: wrapIv },
    wrapKey,
    rawContent,
  );

  return {
    v: 1,
    alg: SEAL_CIPHER_ALG,
    keyId: options.keyId,
    iv: bytesToBase64(iv),
    ciphertext: bytesToBase64(new Uint8Array(ciphertextBuf)),
    wrappedKey: bytesToBase64(new Uint8Array(wrappedKeyBuf)),
    wrapIv: bytesToBase64(wrapIv),
  };
}

/** Decrypt a V1 envelope under the Functions wrap key. */
export async function decryptSealPayload(envelope, options) {
  if (!isSealCipherEnvelopeV1(envelope)) {
    throw new Error("Invalid seal cipher envelope.");
  }

  const wrappingKey = resolveSealWrapKey(options);

  try {
    const wrapKey = await importAesGcmKey(wrappingKey, ["decrypt"]);
    const rawContent = new Uint8Array(
      await crypto.subtle.decrypt(
        { name: "AES-GCM", iv: base64ToBytes(envelope.wrapIv) },
        wrapKey,
        base64ToBytes(envelope.wrappedKey),
      ),
    );
    const contentKey = await importAesGcmKey(rawContent, ["decrypt"]);
    const plaintextBuf = await crypto.subtle.decrypt(
      { name: "AES-GCM", iv: base64ToBytes(envelope.iv) },
      contentKey,
      base64ToBytes(envelope.ciphertext),
    );
    return new TextDecoder().decode(plaintextBuf);
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);
    throw new Error(`Seal decrypt failed: ${message}`);
  }
}
