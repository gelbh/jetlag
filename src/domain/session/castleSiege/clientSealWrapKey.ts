/**
 * Client wrap-key material for SealVault ciphertext writes (twin of Functions GSM
 * `CASTLE_SIEGE_SEAL_WRAP_KEY`). Never hardcode production secrets here.
 *
 * Local / Doppler: set `VITE_CASTLE_SIEGE_SEAL_WRAP_KEY_B64` to base64 of 32 raw bytes
 * (same value Functions load from GSM). Tests inject bytes via SealVault `wrappingKey`.
 */

const AES_256_KEY_BYTES = 32;

function decodeBase64ToBytes(value: string): Uint8Array | undefined {
  const trimmed = value.trim();
  if (!trimmed) return undefined;
  try {
    const binary = atob(trimmed);
    if (binary.length !== AES_256_KEY_BYTES) return undefined;
    const bytes = new Uint8Array(AES_256_KEY_BYTES);
    for (let i = 0; i < binary.length; i += 1) {
      bytes[i] = binary.charCodeAt(i);
    }
    return bytes;
  } catch {
    return undefined;
  }
}

/** Resolve optional client wrap key from Vite env (or an explicit inject for tests). */
export function readClientSealWrapKey(
  envB64: string | undefined = import.meta.env.VITE_CASTLE_SIEGE_SEAL_WRAP_KEY_B64,
): Uint8Array | undefined {
  if (typeof envB64 !== "string") return undefined;
  return decodeBase64ToBytes(envB64);
}
