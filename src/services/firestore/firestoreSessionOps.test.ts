import { describe, expect, it } from "vitest";
import { parseSessionOpsMitigation } from "./firestoreSessionOps";

describe("parseSessionOpsMitigation", () => {
  it("accepts a complete mitigation payload", () => {
    expect(
      parseSessionOpsMitigation({
        id: "mit-1",
        type: "soft_reload",
        appliedAt: "2026-07-26T12:00:00.000Z",
        appliedByUid: "ops-1",
        incidentId: "inc-1",
        note: "reload clients",
      }),
    ).toEqual({
      id: "mit-1",
      type: "soft_reload",
      appliedAt: "2026-07-26T12:00:00.000Z",
      appliedByUid: "ops-1",
      incidentId: "inc-1",
      note: "reload clients",
    });
  });

  it("rejects incomplete or unknown payloads", () => {
    expect(parseSessionOpsMitigation(null)).toBeUndefined();
    expect(parseSessionOpsMitigation({ id: "x" })).toBeUndefined();
    expect(
      parseSessionOpsMitigation({
        id: "mit-1",
        type: "explode",
        appliedAt: "2026-07-26T12:00:00.000Z",
        appliedByUid: "ops-1",
        incidentId: "inc-1",
      }),
    ).toBeUndefined();
  });
});
