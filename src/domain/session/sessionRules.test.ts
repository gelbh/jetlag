import { describe, expect, it } from "vitest";
import { milesToMeters } from "../map/distance";
import {
  advancedSettingsFromSession,
  defaultAdvancedSessionSettings,
  sessionRulesPatchFromAdvancedSettings,
} from "./advancedSessionSettings";
import type { SessionRecord } from "../map/annotations";
import {
  resolveAnswerDeadlineMs,
  resolveHidingPeriodMinutes,
  resolveTentacleOptions,
  resolveThermometerPresetsMiles,
  resolveToolDockEnabled,
  clampHidingPeriodMinutes,
} from "./sessionRules";

function baseSession(overrides: Partial<SessionRecord> = {}): SessionRecord {
  return {
    id: "session-1",
    code: "TEST",
    gameArea: {
      type: "Polygon",
      coordinates: [
        [
          [0, 0],
          [1, 0],
          [1, 1],
          [0, 0],
        ],
      ],
    },
    createdAt: "2026-01-01T00:00:00.000Z",
    memberUids: [],
    gameSize: "medium",
    ...overrides,
  };
}

describe("sessionRules", () => {
  it("falls back to game size defaults", () => {
    expect(resolveHidingPeriodMinutes({ gameSize: "small" })).toBe(30);
    expect(resolveAnswerDeadlineMs({ gameSize: "large" }, "photo")).toBe(
      20 * 60 * 1000,
    );
    expect(resolveThermometerPresetsMiles({ gameSize: "medium" })).toEqual([
      0.5, 3, 10,
    ]);
    expect(resolveToolDockEnabled({ gameSize: "small" }, "tentacle")).toBe(
      false,
    );
  });

  it("applies session overrides", () => {
    const session = baseSession({
      hidingPeriodMinutes: 45,
      photoAnswerDeadlineMinutes: 15,
      disabledTools: ["radar"],
      tentaclesEnabled: true,
      thermometerPresetMiles: [0.5],
      tentacleMediumRadiusMeters: milesToMeters(2),
    });

    expect(resolveHidingPeriodMinutes(session)).toBe(45);
    expect(resolveAnswerDeadlineMs(session, "photo")).toBe(15 * 60 * 1000);
    expect(resolveToolDockEnabled(session, "radar")).toBe(false);
    expect(resolveToolDockEnabled(session, "tentacle")).toBe(true);
    expect(resolveThermometerPresetsMiles(session)).toEqual([0.5]);
    expect(
      resolveTentacleOptions({ gameSize: "small", tentaclesEnabled: true })
        .length,
    ).toBeGreaterThan(0);
  });

  it("clamps hiding period minutes", () => {
    expect(clampHidingPeriodMinutes(2)).toBe(5);
    expect(clampHidingPeriodMinutes(500)).toBe(360);
  });

  it("round-trips advanced settings through session patch", () => {
    const defaults = defaultAdvancedSessionSettings("medium");
    const customized = {
      ...defaults,
      customHidingPeriodEnabled: true,
      hidingPeriodMinutes: 90,
      disabledTools: ["photo" as const],
    };

    const patch = sessionRulesPatchFromAdvancedSettings("medium", customized);
    const session = baseSession(patch);
    const restored = advancedSettingsFromSession(session);

    expect(restored.customHidingPeriodEnabled).toBe(true);
    expect(restored.hidingPeriodMinutes).toBe(90);
    expect(restored.disabledTools).toEqual(["photo"]);
  });
});
