import { createHash } from "node:crypto";
import { describe, expect, it } from "vitest";
import { canonicalSealPayload, hashSealPayload, verifySealReveal } from "./sealHash";

const ANCHOR = "Castle";
const LAT = 53.35;
const LNG = -6.26;
const SECRET = "s3cret";

function nodeSha256Hex(payload: string): string {
  return createHash("sha256").update(payload, "utf8").digest("hex");
}

describe("canonicalSealPayload", () => {
  it("joins anchorName|lat|lng|secretPhrase with pipe separators", () => {
    expect(canonicalSealPayload(ANCHOR, LAT, LNG, SECRET)).toBe("Castle|53.35|-6.26|s3cret");
  });
});

describe("hashSealPayload", () => {
  it("returns lowercase SHA-256 hex of the canonical UTF-8 payload", async () => {
    const payload = canonicalSealPayload(ANCHOR, LAT, LNG, SECRET);
    const hex = await hashSealPayload(payload);

    expect(hex).toBe(nodeSha256Hex(payload));
    expect(hex).toMatch(/^[0-9a-f]{64}$/);
  });

  it("changes when any seal field changes", async () => {
    const base = await hashSealPayload(canonicalSealPayload(ANCHOR, LAT, LNG, SECRET));
    const renamed = await hashSealPayload(canonicalSealPayload("Keep", LAT, LNG, SECRET));
    const moved = await hashSealPayload(canonicalSealPayload(ANCHOR, 53.349999, LNG, SECRET));
    const rephrased = await hashSealPayload(canonicalSealPayload(ANCHOR, LAT, LNG, "other"));

    expect(renamed).not.toBe(base);
    expect(moved).not.toBe(base);
    expect(rephrased).not.toBe(base);
  });
});

describe("verifySealReveal", () => {
  it("accepts a reveal that matches the committed hash", async () => {
    const committed = await hashSealPayload(canonicalSealPayload(ANCHOR, LAT, LNG, SECRET));

    await expect(
      verifySealReveal(committed, {
        anchorName: ANCHOR,
        lat: LAT,
        lng: LNG,
        secretPhrase: SECRET,
      }),
    ).resolves.toEqual({ ok: true });
  });

  it("flags an audit hash_mismatch when reveal does not match committed hash", async () => {
    const committed = await hashSealPayload(canonicalSealPayload(ANCHOR, LAT, LNG, SECRET));
    const computed = await hashSealPayload(canonicalSealPayload(ANCHOR, LAT, LNG, "tampered"));

    await expect(
      verifySealReveal(committed, {
        anchorName: ANCHOR,
        lat: LAT,
        lng: LNG,
        secretPhrase: "tampered",
      }),
    ).resolves.toEqual({
      ok: false,
      flag: {
        kind: "hash_mismatch",
        committedHash: committed,
        computedHash: computed,
      },
    });
  });
});
