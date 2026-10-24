import { describe, expect, it } from "vitest";
import {
  type CastleSiegeOracleReceipt,
  formatOracleAskReceiptLabel,
  oracleReceiptLeaksEnemyCoords,
} from "./oracleAskReceipt";

describe("oracleAskReceipt", () => {
  it("formats radar receipt for confirm-send without coords", () => {
    const receipt: CastleSiegeOracleReceipt = { kind: "radar", answer: "yes" };
    expect(formatOracleAskReceiptLabel(receipt)).toBe("Inside · Yes");
    expect(oracleReceiptLeaksEnemyCoords(receipt)).toBe(false);
  });

  it("formats other kinds without leaking lat/lng keys", () => {
    const receipts: CastleSiegeOracleReceipt[] = [
      { kind: "matching", answer: "no" },
      { kind: "measuring", answer: "closer" },
      { kind: "tentacle", answer: "poi-1" },
      { kind: "photo", answer: "mirror", mirror: { required: true, categoryId: "tree" } },
      { kind: "compass", answer: "NE" },
    ];
    for (const receipt of receipts) {
      expect(formatOracleAskReceiptLabel(receipt).length).toBeGreaterThan(0);
      expect(oracleReceiptLeaksEnemyCoords(receipt)).toBe(false);
      expect(JSON.stringify(receipt)).not.toMatch(/"lat"|"lng"/);
    }
  });
});
