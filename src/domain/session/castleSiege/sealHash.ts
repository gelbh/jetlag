/** Canonical seal string: `anchorName|lat|lng|secretPhrase` (S4). */
export function canonicalSealPayload(
  anchorName: string,
  lat: number,
  lng: number,
  secretPhrase: string,
): string {
  return `${anchorName}|${lat}|${lng}|${secretPhrase}`;
}

export type SealRevealParts = {
  anchorName: string;
  lat: number;
  lng: number;
  secretPhrase: string;
};

/** Client-side audit flag when reveal plaintext does not match the committed hash (V5). */
export type SealHashMismatchFlag = {
  kind: "hash_mismatch";
  committedHash: string;
  computedHash: string;
};

export type SealRevealResult = { ok: true } | { ok: false; flag: SealHashMismatchFlag };

function bytesToHex(bytes: Uint8Array): string {
  let hex = "";
  for (const byte of bytes) {
    hex += byte.toString(16).padStart(2, "0");
  }
  return hex;
}

/** SHA-256 hex (lowercase) of a UTF-8 payload via Web Crypto SubtleCrypto. */
export async function hashSealPayload(payload: string): Promise<string> {
  const data = new TextEncoder().encode(payload);
  const digest = await crypto.subtle.digest("SHA-256", data);
  return bytesToHex(new Uint8Array(digest));
}

/** Recompute seal hash from reveal parts and compare to the committed hash. */
export async function verifySealReveal(
  committedHash: string,
  reveal: SealRevealParts,
): Promise<SealRevealResult> {
  const computedHash = await hashSealPayload(
    canonicalSealPayload(reveal.anchorName, reveal.lat, reveal.lng, reveal.secretPhrase),
  );
  if (computedHash === committedHash) {
    return { ok: true };
  }
  return {
    ok: false,
    flag: {
      kind: "hash_mismatch",
      committedHash,
      computedHash,
    },
  };
}
