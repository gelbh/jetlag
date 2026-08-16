import { describe, expect, it } from "vitest";
import {
  tentacleDraftOverlayId,
  tentacleDraftPoiIdFromOverlayId,
} from "./tentacleDraftOverlay";

describe("tentacleDraftOverlay", () => {
  it("round-trips overlay id ↔ poi id", () => {
    expect(tentacleDraftOverlayId("poi-1")).toBe("tentacle-draft-poi-poi-1");
    expect(tentacleDraftPoiIdFromOverlayId("tentacle-draft-poi-poi-1")).toBe(
      "poi-1",
    );
  });

  it("rejects non-tentacle overlay ids", () => {
    expect(tentacleDraftPoiIdFromOverlayId("measuring-draft-1")).toBeNull();
    expect(tentacleDraftPoiIdFromOverlayId("tentacle-draft-poi-")).toBeNull();
  });
});
