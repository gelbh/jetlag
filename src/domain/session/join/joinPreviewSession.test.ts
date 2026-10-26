import { describe, expect, it } from "vitest";
import { isCastleSiegeSession } from "@/domain/session/castleSiege/mode";
import { buildJoinPreviewSession } from "./joinPreviewSession";

describe("buildJoinPreviewSession", () => {
  it("buildJoinPreviewSession preserves castleSiege mode from the code record", () => {
    const session = buildJoinPreviewSession("sess-1", "ABCD", {
      hostUid: "host",
      mode: "castleSiege",
      seriesLength: 3,
    });
    expect(isCastleSiegeSession(session)).toBe(true);
    expect(session.seriesLength).toBe(3);
  });

  it("defaults seriesLength to 1 when castleSiege mode is present without seriesLength", () => {
    const session = buildJoinPreviewSession("sess-1", "ABCD", {
      hostUid: "host",
      mode: "castleSiege",
    });
    expect(isCastleSiegeSession(session)).toBe(true);
    expect(session.seriesLength).toBe(1);
  });

  it("omits mode for classic code records", () => {
    const session = buildJoinPreviewSession("sess-1", "ABCD", {
      hostUid: "host",
    });
    expect(isCastleSiegeSession(session)).toBe(false);
    expect(session.mode).toBeUndefined();
    expect(session.seriesLength).toBeUndefined();
  });
});
