/**
 * Parse canonical seal plaintext: `anchorName|lat|lng|secretPhrase` (S4).
 * @param {string} plaintext
 * @returns {{ anchorName: string, lat: number, lng: number, secretPhrase: string }}
 */
export function parseCanonicalSealPayload(plaintext) {
  if (typeof plaintext !== "string" || plaintext.length === 0) {
    throw new Error("Seal plaintext must be non-empty.");
  }

  const parts = plaintext.split("|");
  if (parts.length !== 4) {
    throw new Error("Seal plaintext must be anchorName|lat|lng|secretPhrase.");
  }

  const [anchorName, latRaw, lngRaw, secretPhrase] = parts;
  const lat = Number(latRaw);
  const lng = Number(lngRaw);

  if (!anchorName || !secretPhrase || !Number.isFinite(lat) || !Number.isFinite(lng)) {
    throw new Error("Seal plaintext fields are invalid.");
  }

  return { anchorName, lat, lng, secretPhrase };
}
