import { describe, expect, it, vi } from "vitest";
import { milesToMeters } from "@/domain/map/distance";
import { commitThermometerManual } from "./commitThermometer";

const trackLazy = vi.hoisted(() => vi.fn());

vi.mock("@/services/core/analytics/lazyTelemetry", () => ({ trackLazy }));
vi.mock("@/services/session/sessionActivityLog", () => ({
  appendSessionActivityEvent: vi.fn(async () => ({ wrote: true })),
}));

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

  it("reports a loading session instead of silently dropping a multiplayer send", async () => {
    const setMapError = vi.fn();
    const createAnnotation = vi.fn();
    const onSuccess = vi.fn();

    await commitThermometerManual({
      thermoA: [51.5, -0.12],
      thermoB: [51.52, -0.1],
      thermoTravelMeters: milesToMeters(4),
      distanceMeters: milesToMeters(3),
      answer: null,
      pendingQuestions: [],
      awaitHiderAnswer: true,
      submitPendingQuestion: vi.fn(),
      sessionId: "s1",
      senderUid: null,
      distanceUnit: "imperial",
      cardDraw: 2,
      cardKeep: 1,
      createAnnotation,
      setMapError,
      onSuccess,
    });

    expect(setMapError).toHaveBeenCalledWith("Session is still loading. Try again in a moment.");
    expect(createAnnotation).not.toHaveBeenCalled();
    expect(onSuccess).not.toHaveBeenCalled();
  });
});

describe("commitThermometerManual analytics", () => {
  it("tracks a locally recorded answer as self_recorded once", async () => {
    await commitThermometerManual({
      thermoA: [51.5, -0.12],
      thermoB: [51.52, -0.1],
      thermoTravelMeters: null,
      distanceMeters: milesToMeters(3),
      answer: "hotter",
      pendingQuestions: [],
      awaitHiderAnswer: false,
      sessionId: "s1",
      senderUid: "u1",
      distanceUnit: "imperial",
      cardDraw: 2,
      cardKeep: 1,
      createAnnotation: vi.fn(async (annotation) => ({
        ...annotation,
        id: "a1",
        sessionId: "s1",
        status: "active",
      })),
      setMapError: vi.fn(),
      onSuccess: vi.fn(),
    });

    expect(trackLazy).toHaveBeenCalledOnce();
    expect(trackLazy).toHaveBeenCalledWith("question_answered", {
      tool: "thermometer",
      mode: "self_recorded",
    });
  });
});
