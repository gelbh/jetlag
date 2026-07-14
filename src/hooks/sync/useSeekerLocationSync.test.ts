import { renderHook } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";
import { LOCAL_SESSION_ID } from "../../domain/map/annotations";
import { useSeekerLocationSync } from "./useSeekerLocationSync";

const { writePlayerLocation, appendPlayerTrailPoint, isFirebaseConfigured } = vi.hoisted(() => ({
  writePlayerLocation: vi.fn(async () => undefined),
  appendPlayerTrailPoint: vi.fn(async () => undefined),
  isFirebaseConfigured: vi.fn(() => true),
}));

vi.mock("../../services/core/firebase", () => ({
  isFirebaseConfigured,
}));

vi.mock("../../services/firestore/firestoreSessionExtras", () => ({
  writePlayerLocation,
  appendPlayerTrailPoint,
}));

vi.mock("../location/useLiveLocation", () => ({
  useLiveLocation: vi.fn(() => ({
    reading: { lat: 53.35, lng: -6.26, accuracy: 12 },
    error: null,
  })),
}));

vi.mock("../../state/mapStore", () => ({
  useMapStore: vi.fn((selector: (state: { lowPowerMode: boolean }) => unknown) =>
    selector({ lowPowerMode: false }),
  ),
}));

describe("useSeekerLocationSync", () => {
  it("skips writes for local sessions", () => {
    renderHook(() =>
      useSeekerLocationSync({
        sessionId: LOCAL_SESSION_ID,
        uid: "user-1",
        enabled: true,
      }),
    );

    expect(writePlayerLocation).not.toHaveBeenCalled();
  });

  it("writes seeker location for remote sessions", () => {
    renderHook(() =>
      useSeekerLocationSync({
        sessionId: "remote-session",
        uid: "user-1",
        enabled: true,
      }),
    );

    expect(writePlayerLocation).toHaveBeenCalledWith(
      "remote-session",
      expect.objectContaining({
        uid: "user-1",
        lat: 53.35,
        lng: -6.26,
        role: "seeker",
      }),
    );
  });
});
