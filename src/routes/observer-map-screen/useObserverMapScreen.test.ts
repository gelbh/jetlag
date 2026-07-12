import { renderHook } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";
import { useObserverMapScreen } from "./useObserverMapScreen";

const mockUseResolvedSessionRules = vi.fn();

vi.mock("../../hooks/session/useResolvedSessionRules", () => ({
  useResolvedSessionRules: (...args: unknown[]) =>
    mockUseResolvedSessionRules(...args),
}));

vi.mock("../../hooks/session/useSharedSessionScreen", () => ({
  useSharedSessionScreen: () => ({
    uid: "observer-1",
    sessionId: "session-1",
    timer: null,
    pendingQuestions: [],
    hidingZones: [],
    seekerLocations: [],
    hiderLocations: [],
    chatMessages: [],
    syncStatus: "synced",
    authReady: true,
  }),
}));

vi.mock("../../hooks/map/useSessionAnnotations", () => ({
  useSessionAnnotations: () => [],
}));

vi.mock("../../hooks/location/useActiveThermometerWalk", () => ({
  useActiveThermometerWalk: () => ({ start: null, end: null }),
}));

vi.mock("../../hooks/map/useMapOverlayState", () => ({
  useMapOverlayState: () => ({
    isChatOpen: false,
    closeSheet: vi.fn(),
    openChat: vi.fn(),
    openLog: vi.fn(),
    isLogOpen: false,
    closeLog: vi.fn(),
    isSettingsOpen: false,
    openSettings: vi.fn(),
    closeSettings: vi.fn(),
  }),
}));

vi.mock("../../hooks/session/useSessionDistanceUnit", () => ({
  useSessionDistanceUnit: () => "km",
}));

vi.mock("../../state/sessionStore", () => ({
  useSessionStore: (selector: (state: { session: unknown; myRole: string }) => unknown) =>
    selector({
      session: { id: "session-1", gameArea: null },
      myRole: "observer",
    }),
  useMapStore: (selector: (state: Record<string, unknown>) => unknown) =>
    selector({
      mapStyle: "voyager",
      lowPowerMode: false,
      layerVisibility: {},
      observerPerspective: "both",
      setMapStyle: vi.fn(),
      setLowPowerMode: vi.fn(),
      setObserverPerspective: vi.fn(),
    }),
}));

describe("useObserverMapScreen", () => {
  it("keeps map focus bounds null until play area is ready", () => {
    mockUseResolvedSessionRules.mockReturnValue({
      gameArea: null,
      sessionRules: null,
      playAreaReady: false,
    });

    const { result } = renderHook(() => useObserverMapScreen());

    expect(result.current.mapFocusBounds).toBeNull();
    expect(result.current.center).toEqual([51.505, -0.09]);
  });

  it("frames the map when play area resolves", () => {
    mockUseResolvedSessionRules.mockReturnValue({
      gameArea: {
        type: "polygon",
        coordinates: [[[0, 0], [1, 0], [1, 1], [0, 1], [0, 0]]],
      },
      sessionRules: null,
      playAreaReady: true,
    });

    const { result } = renderHook(() => useObserverMapScreen());

    expect(result.current.mapFocusBounds).not.toBeNull();
    expect(result.current.gameArea).not.toBeNull();
  });
});
