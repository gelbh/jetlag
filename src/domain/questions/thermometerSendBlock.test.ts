import { describe, expect, it } from "vitest";
import { type ThermometerSendBlockInput, thermometerSendBlockReason } from "./thermometerSendBlock";

const clear: ThermometerSendBlockInput = {
  walkingActive: false,
  canSubmitQuestion: true,
  distanceAvailableForSession: true,
  distanceUnused: true,
  travelTooShort: false,
  liveTravelMeters: null,
};

describe("thermometerSendBlockReason", () => {
  it("returns null when nothing blocks the send", () => {
    expect(thermometerSendBlockReason(clear)).toBeNull();
  });

  it("names the first blocking gate before a walk", () => {
    expect(thermometerSendBlockReason({ ...clear, canSubmitQuestion: false })).toBe(
      "open_question",
    );
    expect(thermometerSendBlockReason({ ...clear, distanceAvailableForSession: false })).toBe(
      "distance_unavailable",
    );
    expect(thermometerSendBlockReason({ ...clear, distanceUnused: false })).toBe("distance_used");
    expect(thermometerSendBlockReason({ ...clear, travelTooShort: true })).toBe("travel_too_short");
  });

  it("only waits on GPS during a walk, even though the walk is an open question", () => {
    const walking = { ...clear, walkingActive: true, canSubmitQuestion: false };
    expect(thermometerSendBlockReason(walking)).toBe("gps_waiting");
    expect(thermometerSendBlockReason({ ...walking, liveTravelMeters: 12 })).toBeNull();
  });
});
