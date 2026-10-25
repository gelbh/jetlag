/** Canonical seal string: `anchorName|lat|lng|secretPhrase` (S4). */
export function canonicalSealPayload(
  anchorName: string,
  lat: number,
  lng: number,
  secretPhrase: string,
): string {
  return `${anchorName}|${lat}|${lng}|${secretPhrase}`;
}

function bytesToHex(bytes: Uint8Array): string {
  let hex = "";
  for (const byte of bytes) {
    hex += byte.toString(16).padStart(2, "0");
  }
  return hex;
}

export async function hashSealPayload(payload: string): Promise<string> {
  const data = new TextEncoder().encode(payload);
  const digest = await crypto.subtle.digest("SHA-256", data);
  return bytesToHex(new Uint8Array(digest));
}
