import { MantineProvider } from "@mantine/core";
import { act, fireEvent, render, screen, waitFor } from "@testing-library/react";
import { MemoryRouter } from "react-router-dom";
import { beforeEach, describe, expect, it, vi } from "vitest";
import type { MapViewModel } from "@/components/map/chrome/mapViewTypes";
import type { GameArea } from "@/domain/map/annotations";
import { createMapBounds } from "@/domain/map/mapBounds";
import { mergeBundledPresets } from "@/domain/regions/bundledGamePresets";
import type { GamePreset } from "@/domain/session/presets/gamePreset";
import { GAME_PRESET_SCHEMA_VERSION } from "@/domain/session/presets/gamePreset";
import { defaultAdvancedSessionSettings } from "@/domain/session/tools/advancedSessionSettings";
import { useGamePresetStore } from "@/state/gamePresetStore";
import { useSessionStore } from "@/state/sessionStore";
import { DUBLIN_CITY_GAME_AREA } from "@/test/fixtures/dublinGameArea";
import { jetlagTheme } from "@/theme/theme";
import { CreateSession } from "./CreateSession";

const ensureAnonymousUser = vi.hoisted(() => vi.fn(async () => ({ uid: "host-1" })));
const isFirebaseConfigured = vi.hoisted(() => vi.fn(() => false));

vi.mock("@/hooks/navigation/useAppNavigate", () => ({
  useAppNavigate: () => vi.fn(),
}));

const mapView = vi.hoisted(() => ({ model: null as MapViewModel | null }));
vi.mock("@/components/map/chrome/MapView", () => ({
  MapView: ({ model, children }: { model: MapViewModel; children?: React.ReactNode }) => {
    mapView.model = model;
    return <div data-testid="create-map">{children}</div>;
  },
}));

const fakeMapRef = vi.hoisted(() => {
  const map = { getCanvas: () => ({ focus: () => {} }) };
  return { getMap: () => map };
});
vi.mock("@/components/map/helpers/useMapLibreMap", () => ({
  useMapLibreMap: () => fakeMapRef,
}));

const requestLocationAccess = vi.hoisted(() => vi.fn());
vi.mock("@/services/core/location/geolocation", async (importOriginal) => ({
  ...(await importOriginal<typeof import("@/services/core/location/geolocation")>()),
  requestLocationAccess,
}));

const searchPlaces = vi.hoisted(() =>
  vi.fn(async (_query?: string, _options?: unknown) => [] as unknown[]),
);
const suggestPlacesAtPoint = vi.hoisted(() => vi.fn(async () => [] as unknown[]));
vi.mock("@/services/geo/geocoding", async (importOriginal) => ({
  ...(await importOriginal<typeof import("@/services/geo/geocoding")>()),
  searchPlaces,
  searchPlacesSettled: async (query: string, options?: unknown) => {
    try {
      const places = await searchPlaces(query, options);
      return { ok: true as const, places };
    } catch (nextError) {
      return {
        ok: false as const,
        message: nextError instanceof Error ? nextError.message : "Place search failed.",
      };
    }
  },
  suggestPlacesAtPoint,
}));

vi.mock("@/components/map/layers/FramingPreviewLayers", () => ({
  FramingPreviewLayers: () => null,
}));

vi.mock("@/components/session/framing/prefetchCreateSessionMap", () => ({
  prefetchCreateSessionMap: vi.fn(async () => undefined),
}));

const loadRegionPackSessionBoundaries = vi.hoisted(() =>
  vi.fn(async () => ({
    playArea: {
      type: "Polygon" as const,
      coordinates: [
        [
          [-6.3, 53.3],
          [-6.2, 53.3],
          [-6.2, 53.4],
          [-6.3, 53.4],
          [-6.3, 53.3],
        ],
      ],
    },
    customMatchingAreas: {},
  })),
);
vi.mock("@/services/geo/matching/regionPackBoundaries", () => ({
  loadRegionPackSessionBoundaries,
}));

vi.mock("@/services/geo/matching/resolveSessionMatchingAreas", () => ({
  resolveSessionMatchingAreas: vi.fn(async () => []),
}));

vi.mock("@/components/map/layers/GameAreaMask", () => ({
  GameAreaMask: () => null,
}));

vi.mock("@/services/core/firebase/firebase", () => ({
  isFirebaseConfigured: () => isFirebaseConfigured(),
  ensureAnonymousUser: () => ensureAnonymousUser(),
  getFirebaseAuth: () => ({ currentUser: null }),
  waitForAuthStateReady: vi.fn(async () => undefined),
  isAuthBootstrapReady: () => true,
  subscribeAuthBootstrapReady: () => () => {},
}));

vi.mock("@/services/core/auth/accessControl", () => ({
  hasAccessClaim: vi.fn(async () => false),
  grantAccess: vi.fn(),
}));

vi.mock("@/hooks/billing/usePermanentAuthUser", () => ({
  usePermanentAuthUser: () => ({
    user: null,
    isPermanent: false,
    authReady: true,
  }),
}));

vi.mock("@/hooks/billing/usePremiumEntitlements", () => ({
  usePremiumEntitlements: () => ({
    entitlements: null,
    refresh: vi.fn(),
    loading: false,
  }),
}));

vi.mock("@/services/session/gameAreaPreload", () => ({
  preloadGameAreaCaches: vi.fn(),
  preloadCriticalGameAreaCaches: vi.fn(async () => undefined),
}));

const startSeaLevelBackgroundSampling = vi.hoisted(() => vi.fn());
vi.mock("@/services/geo/elevation/seaLevelProgressive", () => ({
  startSeaLevelBackgroundSampling,
}));

const parseBoundaryFile = vi.hoisted(() => vi.fn());
vi.mock("@/services/core/capture/kmzImport", () => ({
  parseBoundaryFile,
}));

const IMPORTED_AREA = {
  type: "Polygon" as const,
  coordinates: [
    [
      [-6.3, 53.3],
      [-6.2, 53.3],
      [-6.2, 53.4],
      [-6.3, 53.4],
      [-6.3, 53.3],
    ],
  ],
};

function importBoundaryFile() {
  const input = document.querySelector<HTMLInputElement>('input[accept=".kml,.kmz"]');
  expect(input).toBeTruthy();
  const file = new File(["<kml/>"], "dublin.kml", {
    type: "application/vnd.google-earth.kml+xml",
  });
  fireEvent.change(input!, { target: { files: [file] } });
  return file;
}

/** MapLibre `load` → first `onBoundsChange` with the default London viewport. */
function loadMapWithDefaultViewport() {
  act(() => {
    mapView.model?.onBoundsChange?.(
      createMapBounds({ south: 51.4, west: -0.25, north: 51.6, east: 0.05 }),
    );
  });
}

function goToDrawSource() {
  fireEvent.click(screen.getByRole("button", { name: /^Draw$/ }));
}

function goToRules() {
  fireEvent.click(screen.getByRole("button", { name: "Next" }));
}

function goToPlay() {
  goToRules();
  fireEvent.click(screen.getByRole("button", { name: "Next" }));
}

function openMoreTools() {
  const disclosure = screen.getByText("More tools").closest("details") as HTMLDetailsElement;
  disclosure.open = true;
  fireEvent(disclosure, new Event("toggle"));
}

function openCustomContent() {
  openMoreTools();
  fireEvent.click(screen.getByRole("button", { name: /^Custom content$/i }));
}

/** Slightly nudged Dublin city polygon: same pack winner, different fingerprint. */
const DUBLIN_CITY_NUDGED: GameArea = {
  type: "Polygon",
  coordinates: [
    [
      [-6.44, 53.275],
      [-6.09, 53.275],
      [-6.09, 53.415],
      [-6.44, 53.415],
      [-6.44, 53.275],
    ],
  ],
};

/** Mid-Atlantic frame with no bundled/custom preset overlap (clears silent pack attach). */
const OPEN_OCEAN_GAME_AREA: GameArea = {
  type: "Polygon",
  coordinates: [
    [
      [-40.2, 30.1],
      [-39.8, 30.1],
      [-39.8, 30.4],
      [-40.2, 30.4],
      [-40.2, 30.1],
    ],
  ],
};

function level8MatchingJson(id: string, polygon: GameArea): string {
  return JSON.stringify({
    type: "FeatureCollection",
    features: [
      {
        type: "Feature",
        id,
        properties: { id, name: id },
        geometry: polygon,
      },
    ],
  });
}

function baseCustomPreset(
  partial: Partial<GamePreset> & Pick<GamePreset, "id" | "name">,
): GamePreset {
  return {
    createdAt: "2026-01-01T00:00:00.000Z",
    updatedAt: "2026-01-01T00:00:00.000Z",
    schemaVersion: GAME_PRESET_SCHEMA_VERSION,
    gameSize: "medium",
    distanceUnit: "metric",
    advancedSettings: defaultAdvancedSessionSettings("medium", "metric"),
    migrationStatus: "ok",
    ...partial,
  };
}

function seedCustomPresets(...presets: GamePreset[]) {
  useGamePresetStore.setState({
    presets: mergeBundledPresets(presets),
    favouritePresetIds: [],
  });
}

beforeEach(() => {
  mapView.model = null;
  startSeaLevelBackgroundSampling.mockReset();
  parseBoundaryFile.mockReset();
  requestLocationAccess.mockReset();
  searchPlaces.mockReset();
  searchPlaces.mockResolvedValue([]);
  suggestPlacesAtPoint.mockReset();
  suggestPlacesAtPoint.mockResolvedValue([]);
  isFirebaseConfigured.mockReturnValue(false);
  ensureAnonymousUser.mockResolvedValue({ uid: "host-1" });
  loadRegionPackSessionBoundaries.mockClear();
  loadRegionPackSessionBoundaries.mockResolvedValue({
    playArea: {
      type: "Polygon" as const,
      coordinates: [
        [
          [-6.3, 53.3],
          [-6.2, 53.3],
          [-6.2, 53.4],
          [-6.3, 53.4],
          [-6.3, 53.3],
        ],
      ],
    },
    customMatchingAreas: {},
  });
  useGamePresetStore.setState({
    presets: mergeBundledPresets([]),
    favouritePresetIds: [],
  });
  useSessionStore.setState({ session: null });
  vi.stubGlobal("matchMedia", (query: string) => ({
    matches: false,
    media: query,
    onchange: null,
    addListener: () => {},
    removeListener: () => {},
    addEventListener: () => {},
    removeEventListener: () => {},
    dispatchEvent: () => false,
  }));
  vi.stubGlobal(
    "ResizeObserver",
    class {
      observe() {}
      unobserve() {}
      disconnect() {}
    },
  );
  vi.stubGlobal("requestAnimationFrame", (cb: FrameRequestCallback) => {
    cb(0);
    return 0;
  });
  vi.stubGlobal("cancelAnimationFrame", vi.fn());
});

function renderCreateSession(route = "/create") {
  return render(
    <MantineProvider theme={jetlagTheme} forceColorScheme="dark">
      <MemoryRouter initialEntries={[route]}>
        <CreateSession />
      </MemoryRouter>
    </MantineProvider>,
  );
}

describe("CreateSession silent preset data reuse", () => {
  it("silently attaches pack and in-area pins when free-framing over a custom preset", async () => {
    seedCustomPresets(
      baseCustomPreset({
        id: "custom-dublin",
        name: "My Dublin",
        gameArea: DUBLIN_CITY_GAME_AREA,
        regionPackId: "dublin",
        transitMetroId: "dublin",
        gameSize: "large",
        customLocationPins: [
          { id: "dublin-pin", name: "Spire pin", point: [53.35, -6.26] },
          { id: "out-pin", name: "Far away", point: [0, 0] },
        ],
      }),
    );
    parseBoundaryFile.mockResolvedValue(DUBLIN_CITY_GAME_AREA);
    renderCreateSession();

    importBoundaryFile();
    await waitFor(() => {
      expect(screen.getByDisplayValue("dublin.kml")).toBeInTheDocument();
    });
    await waitFor(() => {
      expect(loadRegionPackSessionBoundaries).toHaveBeenCalledWith("dublin", undefined);
    });

    goToRules();
    expect(screen.getByRole("radio", { name: /^Medium/i })).toHaveAttribute("aria-checked", "true");
    expect(screen.getByRole("radio", { name: /^Large/i })).toHaveAttribute("aria-checked", "false");

    openCustomContent();
    expect(await screen.findByText("Spire pin")).toBeInTheDocument();
    expect(screen.queryByText("Far away")).toBeNull();

    fireEvent.click(screen.getByRole("button", { name: "Next" }));
    fireEvent.click(screen.getByRole("button", { name: "Create game" }));
    await waitFor(() => {
      expect(startSeaLevelBackgroundSampling).toHaveBeenCalledWith(DUBLIN_CITY_GAME_AREA, {
        regionPackId: "dublin",
      });
    });
  });

  it("layers overlapping custom pins after Load preset without overwriting gameSize", async () => {
    seedCustomPresets(
      baseCustomPreset({
        id: "loaded",
        name: "Loaded",
        gameArea: DUBLIN_CITY_GAME_AREA,
        regionPackId: "dublin",
        gameSize: "small",
        customLocationPins: [{ id: "loaded-pin", name: "Loaded pin", point: [53.35, -6.26] }],
      }),
      baseCustomPreset({
        id: "other",
        name: "Other",
        gameArea: {
          type: "Polygon",
          coordinates: [
            [
              [-6.4, 53.3],
              [-6.1, 53.3],
              [-6.1, 53.4],
              [-6.4, 53.4],
              [-6.4, 53.3],
            ],
          ],
        },
        regionPackId: "dublin",
        gameSize: "large",
        customLocationPins: [{ id: "other-pin", name: "Other pin", point: [53.34, -6.25] }],
      }),
    );

    renderCreateSession("/create?preset=loaded");
    await waitFor(() => {
      expect(screen.getByRole("combobox", { name: /game preset/i })).toHaveValue("loaded");
    });
    await waitFor(() => {
      expect(screen.getByText(/small · metric/i)).toBeInTheDocument();
    });
    await waitFor(() => {
      expect(loadRegionPackSessionBoundaries).toHaveBeenCalled();
    });

    goToRules();
    expect(screen.getByRole("radio", { name: /^Small/i })).toHaveAttribute("aria-checked", "true");
    expect(screen.getByRole("radio", { name: /^Large/i })).toHaveAttribute("aria-checked", "false");

    openCustomContent();
    expect(await screen.findByText("Other pin")).toBeInTheDocument();
    expect(screen.getByText("Loaded pin")).toBeInTheDocument();
  });

  it("does not reload pack boundaries when fingerprint changes but pack identity is stable", async () => {
    seedCustomPresets(
      baseCustomPreset({
        id: "custom-dublin",
        name: "My Dublin",
        gameArea: DUBLIN_CITY_GAME_AREA,
        regionPackId: "dublin",
        customLocationPins: [{ id: "dublin-pin", name: "Spire pin", point: [53.35, -6.26] }],
      }),
    );
    parseBoundaryFile.mockResolvedValueOnce(DUBLIN_CITY_GAME_AREA);
    renderCreateSession();

    importBoundaryFile();
    await waitFor(() => {
      expect(loadRegionPackSessionBoundaries).toHaveBeenCalledWith("dublin", undefined);
    });
    const callsAfterAttach = loadRegionPackSessionBoundaries.mock.calls.length;

    parseBoundaryFile.mockResolvedValueOnce(DUBLIN_CITY_NUDGED);
    importBoundaryFile();
    await waitFor(() => {
      expect(screen.getByDisplayValue("dublin.kml")).toBeInTheDocument();
    });

    // Allow reuse effect to re-run on the nudged fingerprint.
    await act(async () => {
      await Promise.resolve();
    });
    expect(loadRegionPackSessionBoundaries).toHaveBeenCalledTimes(callsAfterAttach);
  });

  it("clears silent-reuse pins and pack after reframing away from the qualifying area", async () => {
    seedCustomPresets(
      baseCustomPreset({
        id: "custom-dublin",
        name: "My Dublin",
        gameArea: DUBLIN_CITY_GAME_AREA,
        regionPackId: "dublin",
        transitMetroId: "dublin",
        customLocationPins: [{ id: "dublin-pin", name: "Spire pin", point: [53.35, -6.26] }],
      }),
    );
    parseBoundaryFile.mockResolvedValueOnce(DUBLIN_CITY_GAME_AREA);
    renderCreateSession();

    importBoundaryFile();
    await waitFor(() => {
      expect(loadRegionPackSessionBoundaries).toHaveBeenCalledWith("dublin", undefined);
    });

    goToRules();
    openCustomContent();
    expect(await screen.findByText("Spire pin")).toBeInTheDocument();

    // Back to game-area step and replace the frame (not Add another area).
    fireEvent.click(screen.getByRole("button", { name: "Back" }));
    parseBoundaryFile.mockResolvedValueOnce(OPEN_OCEAN_GAME_AREA);
    const input = document.querySelector<HTMLInputElement>('input[accept=".kml,.kmz"]');
    expect(input).toBeTruthy();
    fireEvent.change(input!, {
      target: {
        files: [
          new File(["<kml/>"], "ocean.kml", { type: "application/vnd.google-earth.kml+xml" }),
        ],
      },
    });
    await waitFor(() => {
      expect(screen.getByDisplayValue("ocean.kml")).toBeInTheDocument();
    });

    goToRules();
    openCustomContent();
    await waitFor(() => {
      expect(screen.queryByText("Spire pin")).toBeNull();
    });

    fireEvent.click(screen.getByRole("button", { name: "Next" }));
    fireEvent.click(screen.getByRole("button", { name: "Create game" }));
    await waitFor(() => {
      expect(startSeaLevelBackgroundSampling).toHaveBeenCalledWith(OPEN_OCEAN_GAME_AREA, {
        regionPackId: undefined,
      });
    });
  });

  it("ignores late silent pack boundary loads after reframing away", async () => {
    seedCustomPresets(
      baseCustomPreset({
        id: "custom-dublin",
        name: "My Dublin",
        gameArea: DUBLIN_CITY_GAME_AREA,
        regionPackId: "dublin",
        customLocationPins: [{ id: "dublin-pin", name: "Spire pin", point: [53.35, -6.26] }],
      }),
    );

    let resolveBoundaries:
      | ((value: { playArea: GameArea; customMatchingAreas: Record<number, string> }) => void)
      | undefined;
    loadRegionPackSessionBoundaries.mockImplementationOnce(
      () =>
        new Promise((resolve) => {
          resolveBoundaries = resolve;
        }),
    );

    parseBoundaryFile.mockResolvedValueOnce(DUBLIN_CITY_GAME_AREA);
    renderCreateSession();

    importBoundaryFile();
    await waitFor(() => {
      expect(loadRegionPackSessionBoundaries).toHaveBeenCalledWith("dublin", undefined);
    });

    // Reframe before the Dublin pack load resolves (no new pack qualifiers).
    parseBoundaryFile.mockResolvedValueOnce(OPEN_OCEAN_GAME_AREA);
    const input = document.querySelector<HTMLInputElement>('input[accept=".kml,.kmz"]');
    expect(input).toBeTruthy();
    fireEvent.change(input!, {
      target: {
        files: [
          new File(["<kml/>"], "ocean.kml", { type: "application/vnd.google-earth.kml+xml" }),
        ],
      },
    });
    await waitFor(() => {
      expect(screen.getByDisplayValue("ocean.kml")).toBeInTheDocument();
    });

    await act(async () => {
      resolveBoundaries?.({
        playArea: DUBLIN_CITY_GAME_AREA,
        customMatchingAreas: {
          6: level8MatchingJson("late-pack-feat", DUBLIN_CITY_GAME_AREA),
        },
      });
      await Promise.resolve();
    });

    goToRules();
    openCustomContent();
    await waitFor(() => {
      expect(screen.queryByText("Spire pin")).toBeNull();
    });
    expect(screen.queryByText(/Uploaded/i)).toBeNull();

    fireEvent.click(screen.getByRole("button", { name: "Next" }));
    fireEvent.click(screen.getByRole("button", { name: "Create game" }));
    await waitFor(() => {
      expect(startSeaLevelBackgroundSampling).toHaveBeenCalledWith(OPEN_OCEAN_GAME_AREA, {
        regionPackId: undefined,
      });
    });
  });

  it("keeps Load-preset custom matching when silent reuse loads pack boundaries", async () => {
    seedCustomPresets(
      baseCustomPreset({
        id: "loaded",
        name: "Loaded",
        gameArea: DUBLIN_CITY_GAME_AREA,
        // No pack: Load keeps customMatchingAreas; silent reuse attaches dublin.
        customMatchingAreas: {
          8: level8MatchingJson("load-feat", DUBLIN_CITY_GAME_AREA),
        },
        customLocationPins: [{ id: "loaded-pin", name: "Loaded pin", point: [53.35, -6.26] }],
      }),
      baseCustomPreset({
        id: "other",
        name: "Other",
        gameArea: DUBLIN_CITY_GAME_AREA,
        regionPackId: "dublin",
        customLocationPins: [{ id: "other-pin", name: "Other pin", point: [53.34, -6.25] }],
      }),
    );

    loadRegionPackSessionBoundaries.mockResolvedValueOnce({
      playArea: DUBLIN_CITY_GAME_AREA,
      customMatchingAreas: {
        6: level8MatchingJson("pack-feat", DUBLIN_CITY_GAME_AREA),
      },
    });

    renderCreateSession("/create?preset=loaded");
    await waitFor(() => {
      expect(screen.getByRole("combobox", { name: /game preset/i })).toHaveValue("loaded");
    });
    await waitFor(() => {
      expect(loadRegionPackSessionBoundaries).toHaveBeenCalledWith("dublin", undefined);
    });

    goToRules();
    openCustomContent();
    expect(await screen.findByText("Loaded pin")).toBeInTheDocument();
    expect(screen.getByText("Other pin")).toBeInTheDocument();
    expect(screen.getByText(/3rd division \(admin level 8\)/i).textContent).toMatch(/Uploaded/i);
  });

  it("keeps latest suggestion pins when same-pack nudge races an in-flight pack load", async () => {
    // Corner pin sits in the city frame but outside the nudged frame. Stale
    // .then re-apply of S1 would revive it after the nudge stripped it.
    seedCustomPresets(
      baseCustomPreset({
        id: "city-dublin",
        name: "City Dublin",
        gameArea: DUBLIN_CITY_GAME_AREA,
        regionPackId: "dublin",
        customLocationPins: [
          { id: "pin-corner", name: "Corner pin", point: [53.271, -6.449] },
          { id: "pin-center", name: "Center pin", point: [53.34, -6.25] },
        ],
        customMatchingAreas: {
          8: level8MatchingJson("city-feat", DUBLIN_CITY_GAME_AREA),
        },
      }),
    );

    let resolveBoundaries:
      | ((value: { playArea: GameArea; customMatchingAreas: Record<number, string> }) => void)
      | undefined;
    loadRegionPackSessionBoundaries.mockImplementationOnce(
      () =>
        new Promise((resolve) => {
          resolveBoundaries = resolve;
        }),
    );

    parseBoundaryFile.mockResolvedValueOnce(DUBLIN_CITY_GAME_AREA);
    renderCreateSession();
    importBoundaryFile();
    await waitFor(() => {
      expect(loadRegionPackSessionBoundaries).toHaveBeenCalledWith("dublin", undefined);
    });

    goToRules();
    openCustomContent();
    expect(await screen.findByText("Corner pin")).toBeInTheDocument();
    expect(screen.getByText("Center pin")).toBeInTheDocument();

    fireEvent.click(screen.getByRole("button", { name: "Back" }));
    parseBoundaryFile.mockResolvedValueOnce(DUBLIN_CITY_NUDGED);
    importBoundaryFile();
    await waitFor(() => {
      expect(screen.getByDisplayValue("dublin.kml")).toBeInTheDocument();
    });

    await act(async () => {
      resolveBoundaries?.({
        playArea: DUBLIN_CITY_GAME_AREA,
        customMatchingAreas: {
          6: level8MatchingJson("pack-feat", DUBLIN_CITY_GAME_AREA),
        },
      });
      await Promise.resolve();
    });

    goToRules();
    openCustomContent();
    expect(await screen.findByText("Center pin")).toBeInTheDocument();
    expect(screen.queryByText("Corner pin")).toBeNull();
    expect(screen.getByText(/3rd division \(admin level 8\)/i).textContent).toMatch(/Uploaded/i);
  });

  it("persists silently merged custom matching into the created session when a pack is attached", async () => {
    seedCustomPresets(
      baseCustomPreset({
        id: "custom-dublin",
        name: "My Dublin",
        gameArea: DUBLIN_CITY_GAME_AREA,
        regionPackId: "dublin",
        customMatchingAreas: {
          8: level8MatchingJson("silent-feat", DUBLIN_CITY_GAME_AREA),
        },
        customLocationPins: [{ id: "dublin-pin", name: "Spire pin", point: [53.35, -6.26] }],
      }),
    );
    loadRegionPackSessionBoundaries.mockResolvedValue({
      playArea: DUBLIN_CITY_GAME_AREA,
      customMatchingAreas: {
        6: level8MatchingJson("pack-feat", DUBLIN_CITY_GAME_AREA),
      },
    });
    parseBoundaryFile.mockResolvedValue(DUBLIN_CITY_GAME_AREA);
    renderCreateSession();

    importBoundaryFile();
    await waitFor(() => {
      expect(loadRegionPackSessionBoundaries).toHaveBeenCalledWith("dublin", undefined);
    });

    goToRules();
    openCustomContent();
    expect(await screen.findByText("Spire pin")).toBeInTheDocument();
    expect(screen.getByText(/3rd division \(admin level 8\)/i).textContent).toMatch(/Uploaded/i);
    await waitFor(() => {
      expect(screen.getByText(/2nd division \(admin level 6\)/i).textContent).toMatch(/Uploaded/i);
    });

    fireEvent.click(screen.getByRole("button", { name: "Next" }));
    fireEvent.click(screen.getByRole("button", { name: "Create game" }));
    await waitFor(() => {
      expect(startSeaLevelBackgroundSampling).toHaveBeenCalledWith(DUBLIN_CITY_GAME_AREA, {
        regionPackId: "dublin",
      });
    });

    const session = useSessionStore.getState().session;
    expect(session?.regionPackId).toBe("dublin");
    expect(session?.customMatchingAreas?.[8]).toEqual(
      level8MatchingJson("silent-feat", DUBLIN_CITY_GAME_AREA),
    );
    expect(session?.customMatchingAreas?.[6]).toEqual(
      level8MatchingJson("pack-feat", DUBLIN_CITY_GAME_AREA),
    );
  });

  it("clears Load-preset exclude when importing a boundary file", async () => {
    seedCustomPresets(
      baseCustomPreset({
        id: "loaded",
        name: "Loaded",
        gameArea: DUBLIN_CITY_GAME_AREA,
        regionPackId: "dublin",
      }),
    );

    renderCreateSession("/create?preset=loaded");
    await waitFor(() => {
      expect(screen.getByRole("combobox", { name: /game preset/i })).toHaveValue("loaded");
    });
    await waitFor(() => {
      expect(loadRegionPackSessionBoundaries).toHaveBeenCalled();
    });

    parseBoundaryFile.mockResolvedValue(DUBLIN_CITY_GAME_AREA);
    importBoundaryFile();
    await waitFor(() => {
      expect(screen.getByRole("combobox", { name: /game preset/i })).not.toHaveValue("loaded");
    });
  });
});
