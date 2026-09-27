import { describe, expect, it, vi } from "vitest";
import { milesToMeters } from "@/domain/map/distance";
import type { SessionRulesInput } from "@/domain/session/rules";
import { startThermometerGpsWalk } from "./startThermometerWalk";
import type { ThermometerSessionConfig } from "./types";

const sessionRules = {
  gameSize: "medium",
  edition: "hide-seek",
} as SessionRulesInput;

const baseConfig: ThermometerSessionConfig = {
  placementMode: "gps",
  localThermoA: null,
  thermoB: null,
  localWalkingQuestionId: null,
  distanceMeters: milesToMeters(3),
  answer: null,
  panelError: null,
};

describe("startThermometerGpsWalk used-distance guard", () => {
  it("refuses starting a walk on a used distance", async () => {
    const patchConfig = vi.fn();
    const setMapError = vi.fn();
    const submitPendingQuestion = vi.fn();

    await startThermometerGpsWalk({
      config: baseConfig,
      canSubmitQuestion: true,
      pendingQuestions: [],
      sessionRules,
      gpsReading: { lat: 51.5, lng: -0.12, accuracy: 5, heading: null },
      awaitHiderAnswer: true,
      submitPendingQuestion,
      sessionId: "s1",
      senderUid: "u1",
      distanceUnit: "imperial",
      distanceMeters: milesToMeters(3),
      setMapError,
      patchConfig,
      usedThermometerOptions: new Set([3]),
    });

    expect(patchConfig).toHaveBeenCalledWith({
      panelError: "That thermometer distance was already used this session.",
    });
    expect(submitPendingQuestion).not.toHaveBeenCalled();
  });
});
