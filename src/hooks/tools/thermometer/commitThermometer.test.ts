import { describe, expect, it, vi } from "vitest";
import { milesToMeters } from "@/domain/map/distance";
import { commitThermometerManual } from "./commitThermometer";

describe("commitThermometerManual used-distance guard", () => {
  it("refuses a distance that was already used this session", async () => {
    const setMapError = vi.fn();
    const submitPendingQuestion = vi.fn();
    const createAnnotation = vi.fn();
    const onSuccess = vi.fn();
    const usedMiles = 3;

    await commitThermometerManual({
      thermoA: [51.5, -0.12],
      thermoB: [51.52, -0.1],
      thermoTravelMeters: milesToMeters(4),
      distanceMeters: milesToMeters(usedMiles),
      answer: null,
      pendingQuestions: [],
      awaitHiderAnswer: true,
      submitPendingQuestion,
      sessionId: "s1",
      senderUid: "u1",
      distanceUnit: "imperial",
      cardDraw: 2,
      cardKeep: 1,
      createAnnotation,
      setMapError,
      onSuccess,
      usedThermometerOptions: new Set([usedMiles]),
    });

    expect(setMapError).toHaveBeenCalledWith(
      "That thermometer distance was already used this session.",
    );
    expect(submitPendingQuestion).not.toHaveBeenCalled();
    expect(createAnnotation).not.toHaveBeenCalled();
    expect(onSuccess).not.toHaveBeenCalled();
  });
});
