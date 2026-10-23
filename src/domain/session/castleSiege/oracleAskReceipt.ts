import type { CastleSiegeCompassCardinal } from "./compassAsk";

/** Oracle receipt shapes (V4): answers only, never enemy coords. */
export type CastleSiegeOracleReceipt =
  | { kind: "radar"; answer: "yes" | "no" }
  | { kind: "matching"; answer: "yes" | "no" | "null" }
  | { kind: "measuring"; answer: "closer" | "further" }
  | { kind: "tentacle"; answer: string }
  | { kind: "photo"; answer: "mirror"; mirror: { required: true; categoryId: string } }
  | { kind: "compass"; answer: CastleSiegeCompassCardinal };

const COORD_KEY = /(?:^|[^a-z])(?:lat|lng|longitude|latitude)(?:[^a-z]|$)/i;

/** Player-facing summary for confirm-send (Survey Field Book copy). */
export function formatOracleAskReceiptLabel(receipt: CastleSiegeOracleReceipt): string {
  switch (receipt.kind) {
    case "radar":
      return receipt.answer === "yes" ? "Inside · Yes" : "Inside · No";
    case "matching":
      if (receipt.answer === "null") return "Match · None";
      return receipt.answer === "yes" ? "Match · Yes" : "Match · No";
    case "measuring":
      return receipt.answer === "closer" ? "Measure · Closer" : "Measure · Further";
    case "tentacle":
      return receipt.answer === "out-of-reach"
        ? "Tentacle · Out of reach"
        : `Tentacle · ${receipt.answer}`;
    case "photo":
      return `Photo · Mirror ${receipt.mirror.categoryId}`;
    case "compass":
      return `Compass · ${receipt.answer}`;
  }
}

/**
 * Soft guard for UX/tests: receipt JSON must not carry raw lat/lng keys or numeric
 * coordinate-looking fields named like enemy position.
 */
export function oracleReceiptLeaksEnemyCoords(receipt: CastleSiegeOracleReceipt): boolean {
  const blob = JSON.stringify(receipt);
  if (COORD_KEY.test(blob)) return true;
  if (/"lat"\s*:|"lng"\s*:/.test(blob)) return true;
  return false;
}
