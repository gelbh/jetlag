import { describe, expect, it } from "vitest";
import { MOTION_MAP_CAMERA_SNAP_MS } from "@/domain/device/motion/motionTokens";
import {
  HIDING_ZONE_PIN_CHOSEN_RADIUS_BUMP,
  HIDING_ZONE_PIN_SNAPPING_RADIUS_BUMP,
  HIDING_ZONE_PIN_TRAVEL_MS,
  resolvePinCircleRadius,
  resolvePinTravelDisplay,
} from "./hidingZoneDraftPinTravel";

const TAP: [number, number] = [53.35, -6.26];
const STATION: [number, number] = [53.3503, -6.2603];

describe("resolvePinTravelDisplay", () => {
  it("jumps to the target when animate is false (reduced motion)", () => {
    const frame = resolvePinTravelDisplay({
      from: TAP,
      to: STATION,
      elapsedMs: 0,
      durationMs: HIDING_ZONE_PIN_TRAVEL_MS,
      animate: false,
    });

    expect(frame).toEqual({ displayCenter: STATION, traveling: false });
  });

  it("starts at the previous center when animate is true", () => {
    const frame = resolvePinTravelDisplay({
      from: TAP,
      to: STATION,
      elapsedMs: 0,
      durationMs: HIDING_ZONE_PIN_TRAVEL_MS,
      animate: true,
    });

    expect(frame.traveling).toBe(true);
    expect(frame.displayCenter).toEqual(TAP);
  });

  it("interpolates toward the station mid-tween", () => {
    const frame = resolvePinTravelDisplay({
      from: TAP,
      to: STATION,
      elapsedMs: HIDING_ZONE_PIN_TRAVEL_MS / 2,
      durationMs: HIDING_ZONE_PIN_TRAVEL_MS,
      animate: true,
    });

    expect(frame.traveling).toBe(true);
    expect(frame.displayCenter[0]).toBeGreaterThan(TAP[0]);
    expect(frame.displayCenter[0]).toBeLessThan(STATION[0]);
    expect(frame.displayCenter[1]).toBeLessThan(TAP[1]);
    expect(frame.displayCenter[1]).toBeGreaterThan(STATION[1]);
  });

  it("settles on the target after the shared camera snap duration", () => {
    expect(HIDING_ZONE_PIN_TRAVEL_MS).toBe(MOTION_MAP_CAMERA_SNAP_MS);

    const frame = resolvePinTravelDisplay({
      from: TAP,
      to: STATION,
      elapsedMs: HIDING_ZONE_PIN_TRAVEL_MS,
      durationMs: HIDING_ZONE_PIN_TRAVEL_MS,
      animate: true,
    });

    expect(frame).toEqual({ displayCenter: STATION, traveling: false });
  });

  it("does not invent travel when from and to are the same", () => {
    const frame = resolvePinTravelDisplay({
      from: TAP,
      to: TAP,
      elapsedMs: 0,
      durationMs: HIDING_ZONE_PIN_TRAVEL_MS,
      animate: true,
    });

    expect(frame).toEqual({ displayCenter: TAP, traveling: false });
  });
});

describe("resolvePinCircleRadius", () => {
  it("keeps the base radius when idle", () => {
    expect(resolvePinCircleRadius({ snapping: false, chosenActive: false })).toBe(8);
  });

  it("bumps while snapping at the tap", () => {
    expect(resolvePinCircleRadius({ snapping: true, chosenActive: false })).toBe(
      8 + HIDING_ZONE_PIN_SNAPPING_RADIUS_BUMP,
    );
  });

  it("prefers the chosen bump over snapping", () => {
    expect(resolvePinCircleRadius({ snapping: true, chosenActive: true })).toBe(
      8 + HIDING_ZONE_PIN_CHOSEN_RADIUS_BUMP,
    );
  });
});
