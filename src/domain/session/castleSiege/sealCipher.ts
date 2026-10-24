/**
 * Castle Siege seal ciphertext (Phase 4 / S4).
 *
 * Key-exchange shape (no production secrets in repo):
 * 1. Client generates an ephemeral AES-256-GCM content key.
 * 2. Encrypts the canonical seal UTF-8 payload → `iv` + `ciphertext`.
 * 3. Wraps the content key with AES-256-GCM under a Functions wrapping key
 *    (`wrappedKey` + `wrapIv`), identified by `keyId`.
 * 4. Persists the envelope on `sessions/{id}/teamSeals/{teamId}.ciphertext`.
 *
 * Functions (Task 3+): load wrap key material from GSM
 * `CASTLE_SIEGE_SEAL_WRAP_KEY` (32 raw bytes), unwrap, decrypt, run oracle.
 * Local/unit tests inject wrap bytes via `encryptSealPayload` / `decryptSealPayload`
 * options (never commit real GSM values).
 */

export const SEAL_CIPHER_ALG = "A256GCM" as const;
export const SEAL_WRAP_KEY_ID_V1 = "castle-siege-seal-wrap-v1";
export const SEAL_WRAP_KEY_ID_TEST = "castle-siege-seal-wrap-test";

/**
 * Deterministic 32-byte wrap key for unit/emulator tests only.
 * Not a production secret; Functions GSM replaces this in Task 3+.
 */
export const TEST_SEAL_WRAP_KEY_BYTES = new Uint8Array([
  0x63, 0x73, 0x2d, 0x74, 0x65, 0x73, 0x74, 0x2d, 0x73, 0x65, 0x61, 0x6c, 0x2d, 0x77, 0x72, 0x61,
  0x70, 0x2d, 0x6b, 0x65, 0x79, 0x2d, 0x76, 0x31, 0x2d, 0x6f, 0x6e, 0x6c, 0x79, 0x21, 0x21, 0x21,
]);

export type SealCipherEnvelopeV1 = {
  v: 1;
  alg: typeof SEAL_CIPHER_ALG;
  keyId: string;
  iv: string;
  ciphertext: string;
  wrappedKey: string;
  wrapIv: string;
};

export type EncryptSealOptions = {
  wrappingKey: Uint8Array;
  keyId: string;
};

function bytesToBase64(bytes: Uint8Array): string {
  let binary = "";
  for (const byte of bytes) {
    binary += String.fromCharCode(byte);
  }
  return btoa(binary);
}

function base64ToBytes(value: string): Uint8Array {
  const binary = atob(value);
  const bytes = new Uint8Array(binary.length);
  for (let i = 0; i < binary.length; i += 1) {
    bytes[i] = binary.charCodeAt(i);
  }
  return bytes;
}

function requireAes256KeyBytes(bytes: Uint8Array, label: string): void {
  if (bytes.byteLength !== 32) {
    throw new Error(`${label} must be 32 bytes (AES-256).`);
  }
}

function asBufferSource(bytes: Uint8Array): BufferSource {
  return bytes.buffer.slice(bytes.byteOffset, bytes.byteOffset + bytes.byteLength) as ArrayBuffer;
}

async function importAesGcmKey(raw: Uint8Array, usages: KeyUsage[]): Promise<CryptoKey> {
  requireAes256KeyBytes(raw, "AES key");
  return crypto.subtle.importKey(
    "raw",
    asBufferSource(raw),
    { name: "AES-GCM", length: 256 },
    false,
    usages,
  );
}

function isSealCipherEnvelopeRecord(value: unknown): value is Record<string, unknown> {
  return Boolean(value) && typeof value === "object" && !Array.isArray(value);
}

export function isSealCipherEnvelopeV1(value: unknown): value is SealCipherEnvelopeV1 {
  if (!isSealCipherEnvelopeRecord(value)) {
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

export async function encryptSealPayload(
  plaintext: string,
  options: EncryptSealOptions,
): Promise<SealCipherEnvelopeV1> {
  if (!plaintext) {
    throw new Error("Seal plaintext must be non-empty.");
  }
  if (!options.keyId) {
    throw new Error("Seal wrap keyId is required.");
  }

  const wrapKey = await importAesGcmKey(options.wrappingKey, ["encrypt", "decrypt"]);
  const contentKey = await crypto.subtle.generateKey({ name: "AES-GCM", length: 256 }, true, [
    "encrypt",
    "decrypt",
  ]);

  const iv = crypto.getRandomValues(new Uint8Array(12));
  const ciphertextBuf = await crypto.subtle.encrypt(
    { name: "AES-GCM", iv: asBufferSource(iv) },
    contentKey,
    new TextEncoder().encode(plaintext),
  );

  const rawContent = new Uint8Array(await crypto.subtle.exportKey("raw", contentKey));
  const wrapIv = crypto.getRandomValues(new Uint8Array(12));
  const wrappedKeyBuf = await crypto.subtle.encrypt(
    { name: "AES-GCM", iv: asBufferSource(wrapIv) },
    wrapKey,
    asBufferSource(rawContent),
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

export async function decryptSealPayload(
  envelope: SealCipherEnvelopeV1,
  options: { wrappingKey: Uint8Array },
): Promise<string> {
  if (!isSealCipherEnvelopeV1(envelope)) {
    throw new Error("Invalid seal cipher envelope.");
  }

  const wrapKey = await importAesGcmKey(options.wrappingKey, ["decrypt"]);
  const rawContent = new Uint8Array(
    await crypto.subtle.decrypt(
      { name: "AES-GCM", iv: asBufferSource(base64ToBytes(envelope.wrapIv)) },
      wrapKey,
      asBufferSource(base64ToBytes(envelope.wrappedKey)),
    ),
  );
  const contentKey = await importAesGcmKey(rawContent, ["decrypt"]);
  const plaintextBuf = await crypto.subtle.decrypt(
    { name: "AES-GCM", iv: asBufferSource(base64ToBytes(envelope.iv)) },
    contentKey,
    asBufferSource(base64ToBytes(envelope.ciphertext)),
  );
  return new TextDecoder().decode(plaintextBuf);
}
