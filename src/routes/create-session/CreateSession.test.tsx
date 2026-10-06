import { MantineProvider } from "@mantine/core";
import { act, fireEvent, render, screen, waitFor } from "@testing-library/react";
import { MemoryRouter } from "react-router-dom";
import { beforeEach, describe, expect, it, vi } from "vitest";
import type { MapViewModel } from "@/components/map/chrome/mapViewTypes";
import { createMapBounds } from "@/domain/map/mapBounds";
import { mergeBundledPresets } from "@/domain/regions/bundledGamePresets";
import { GAME_PRESET_SCHEMA_VERSION } from "@/domain/session/presets/gamePreset";
import { defaultAdvancedSessionSettings } from "@/domain/session/tools/advancedSessionSettings";
import { useGamePresetStore } from "@/state/gamePresetStore";
import { jetlagTheme } from "@/theme/theme";
import { CreateSession } from "./CreateSession";
import { gpsReadingToFocusBounds, placeToFocusBounds } from "./utils";

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
  useGamePresetStore.setState({
    presets: mergeBundledPresets([]),
    favouritePresetIds: [],
  });
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

describe("CreateSession", () => {
  it("renders Apple Back link, Create title, Next, and Find place", () => {
    renderCreateSession();

    expect(screen.getByRole("link", { name: /^back$/i })).toBeInTheDocument();
    expect(screen.getByRole("heading", { name: /^create$/i })).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "Next" })).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "Find place" })).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "Use my location" })).toBeInTheDocument();
    const root = document.querySelector(".jl-create-session");
    expect(root).toBeTruthy();
  });

  it("starts on Where without Create game or Draw on map", () => {
    renderCreateSession();
    expect(
      screen.getByRole("textbox", { name: /city, county, state, or country/i }),
    ).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "Next" })).toBeInTheDocument();
    expect(screen.queryByRole("button", { name: "Create game" })).toBeNull();
    expect(screen.queryByRole("button", { name: "Draw on map" })).toBeNull();
    expect(screen.getByRole("link", { name: /^back$/i })).toBeInTheDocument();
  });

  it("Next reveals Rules then Play; Back reverses", () => {
    renderCreateSession();
    expect(screen.queryByRole("tab", { name: "Frame" })).toBeNull();
    expect(screen.getByRole("tab", { name: "Rules" })).toBeInTheDocument();
    fireEvent.click(screen.getByRole("button", { name: "Next" }));
    expect(screen.queryByRole("button", { name: "Create game" })).toBeNull();
    expect(screen.getByRole("radiogroup", { name: "Game size" })).toBeInTheDocument();
    expect(screen.getByText("More tools")).toBeInTheDocument();
    expect(screen.queryByRole("textbox", { name: /city, county, state, or country/i })).toBeNull();
    fireEvent.click(screen.getByRole("button", { name: "Next" }));
    expect(screen.getByRole("button", { name: "Create game" })).toBeInTheDocument();
    expect(screen.getByRole("radiogroup", { name: "Player side" })).toBeInTheDocument();
    expect(screen.queryByRole("radiogroup", { name: "Game size" })).toBeNull();
    expect(screen.queryByText("More tools")).toBeNull();
    fireEvent.click(screen.getByRole("button", { name: "Back" }));
    expect(screen.getByRole("radiogroup", { name: "Game size" })).toBeInTheDocument();
    fireEvent.click(screen.getByRole("button", { name: "Back" }));
    expect(screen.getByRole("button", { name: "Find place" })).toBeInTheDocument();
    fireEvent.click(screen.getByRole("button", { name: /^Draw$/ }));
    expect(screen.getByRole("button", { name: "Draw on map" })).toBeInTheDocument();
  });

  it("disables confirm until host auth is ready when Firebase is configured", async () => {
    isFirebaseConfigured.mockReturnValue(true);
    let resolveAuth: ((user: { uid: string }) => void) | undefined;
    ensureAnonymousUser.mockImplementation(
      () =>
        new Promise<{ uid: string }>((resolve) => {
          resolveAuth = resolve;
        }),
    );

    renderCreateSession();
    goToPlay();

    const confirm = screen.getByRole("button", { name: "Create game" });
    expect(confirm).toBeDisabled();

    resolveAuth?.({ uid: "host-1" });
    await waitFor(() => {
      expect(confirm).not.toBeDisabled();
    });
  });

  it("shows retry when host auth bootstrap fails", async () => {
    isFirebaseConfigured.mockReturnValue(true);
    ensureAnonymousUser.mockRejectedValue(new Error("auth down"));

    renderCreateSession();
    goToPlay();

    await waitFor(() => {
      expect(screen.getByText(/couldn't sign in to create a session/i)).toBeInTheDocument();
    });
    expect(screen.getByRole("button", { name: /^retry$/i })).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "Create game" })).toBeDisabled();
  });

  it("lazy-loads the boundary parser and starts sea-level sampling on confirm", async () => {
    parseBoundaryFile.mockResolvedValue(IMPORTED_AREA);
    renderCreateSession();

    const file = importBoundaryFile();
    await waitFor(() => {
      expect(parseBoundaryFile).toHaveBeenCalledWith(file);
    });
    await waitFor(() => {
      expect(screen.getByDisplayValue("dublin.kml")).toBeInTheDocument();
    });

    goToPlay();
    fireEvent.click(screen.getByRole("button", { name: "Create game" }));

    await waitFor(() => {
      expect(startSeaLevelBackgroundSampling).toHaveBeenCalledWith(IMPORTED_AREA, {
        regionPackId: undefined,
      });
    });
  });

  it("shows friendly copy when the boundary importer chunk fails to load", async () => {
    parseBoundaryFile.mockRejectedValue(
      new TypeError("Failed to fetch dynamically imported module: /assets/kmzImport-x.js"),
    );
    renderCreateSession();

    importBoundaryFile();

    expect(await screen.findByText(/couldn't load the importer/i)).toBeInTheDocument();
  });

  it("shows a map facade until Open map, then focuses GPS", async () => {
    requestLocationAccess.mockResolvedValue({
      lat: 53.35,
      lng: -6.26,
      accuracy: 12,
      heading: null,
    });
    renderCreateSession();

    expect(screen.queryByTestId("create-map")).not.toBeInTheDocument();

    fireEvent.click(screen.getByRole("button", { name: "Open map" }));

    expect(screen.getByTestId("create-map")).toBeInTheDocument();
    expect(screen.getByRole("status")).toHaveTextContent("Loading map…");
    await waitFor(() => {
      expect(mapView.model?.focusBounds).toEqual(gpsReadingToFocusBounds(53.35, -6.26));
    });

    loadMapWithDefaultViewport();

    expect(screen.queryByText("Loading map…")).not.toBeInTheDocument();
    expect(screen.queryByDisplayValue(/53\.35/)).not.toBeInTheDocument();
  });

  it("mounts the map on search intent", () => {
    renderCreateSession();

    fireEvent.change(screen.getByPlaceholderText("Dublin, Ireland"), {
      target: { value: "Dublin" },
    });
    fireEvent.click(screen.getByRole("button", { name: "Find place" }));

    expect(screen.getByTestId("create-map")).toBeInTheDocument();
  });

  it("loads a preset play area onto the map and shows preset details", async () => {
    useGamePresetStore.setState({
      presets: mergeBundledPresets([
        {
          id: "preset-cork",
          name: "Cork weekend",
          createdAt: "2026-01-01T00:00:00.000Z",
          updatedAt: "2026-01-01T00:00:00.000Z",
          schemaVersion: GAME_PRESET_SCHEMA_VERSION,
          gameSize: "medium",
          distanceUnit: "metric",
          advancedSettings: defaultAdvancedSessionSettings("medium", "metric"),
          placeLabel: "Cork, Ireland",
          gameArea: IMPORTED_AREA,
          focusBounds: { south: 53.3, west: -6.3, north: 53.4, east: -6.2 },
          migrationStatus: "ok",
        },
      ]),
    });

    renderCreateSession("/create?preset=preset-cork");

    await waitFor(() => {
      expect(screen.getByText(/medium · metric · Cork, Ireland/i)).toBeInTheDocument();
    });
    expect(screen.getByRole("button", { name: "Preset" })).toHaveAttribute("aria-pressed", "true");
    expect(screen.getByRole("combobox", { name: /game preset/i })).toHaveValue("preset-cork");
    await waitFor(() => {
      expect(screen.getByTestId("create-map")).toBeInTheDocument();
    });
    await waitFor(() => {
      expect(mapView.model?.focusBounds).toEqual([
        [53.3, -6.3],
        [53.4, -6.2],
      ]);
    });
    expect(mapView.model?.recenterToken).toBeGreaterThan(0);
  });

  it("auto-selects the top ranked place and pans again when switching results", async () => {
    const dublin = {
      id: "dublin",
      displayName: "Dublin, Ireland",
      center: [53.35, -6.26] as [number, number],
      bounds: { south: 53.3, west: -6.4, north: 53.4, east: -6.1 },
      placeCategory: "city" as const,
      approximateAreaSqMi: 10,
    };
    const cork = {
      id: "cork",
      displayName: "Cork, Ireland",
      center: [51.9, -8.47] as [number, number],
      bounds: { south: 51.8, west: -8.6, north: 52.0, east: -8.3 },
      placeCategory: "city" as const,
      approximateAreaSqMi: 8,
    };
    searchPlaces.mockResolvedValueOnce([dublin, cork]);
    renderCreateSession();

    fireEvent.change(screen.getByPlaceholderText("Dublin, Ireland"), {
      target: { value: "Ireland" },
    });
    fireEvent.click(screen.getByRole("button", { name: "Find place" }));

    await waitFor(() => {
      expect(screen.getByDisplayValue("Dublin, Ireland")).toBeInTheDocument();
    });
    expect(screen.getByRole("button", { name: /Cork, Ireland/ })).toBeInTheDocument();
    await waitFor(() => {
      expect(mapView.model?.focusBounds).toEqual(placeToFocusBounds(dublin));
    });
    const firstToken = mapView.model?.recenterToken ?? 0;

    fireEvent.click(screen.getByRole("button", { name: /Cork, Ireland/ }));

    await waitFor(() => {
      expect(screen.getByDisplayValue("Cork, Ireland")).toBeInTheDocument();
    });
    expect(mapView.model?.focusBounds).toEqual(placeToFocusBounds(cork));
    expect(mapView.model?.recenterToken).toBeGreaterThan(firstToken);
  });

  it("keeps London search on the result list so other Londons stay pickable", async () => {
    const londonUk = {
      id: "london-uk",
      displayName: "London, England, United Kingdom",
      center: [51.507, -0.128] as [number, number],
      bounds: { south: 51.28, west: -0.51, north: 51.7, east: 0.33 },
      placeCategory: "city" as const,
      approximateAreaSqMi: 600,
    };
    const londonCanada = {
      id: "london-on",
      displayName: "London, Ontario, Canada",
      center: [42.98, -81.25] as [number, number],
      bounds: { south: 42.9, west: -81.4, north: 43.1, east: -81.1 },
      placeCategory: "city" as const,
      approximateAreaSqMi: 160,
    };
    searchPlaces.mockResolvedValueOnce([londonUk, londonCanada]);
    renderCreateSession();

    fireEvent.change(screen.getByPlaceholderText("Dublin, Ireland"), {
      target: { value: "London" },
    });
    fireEvent.click(screen.getByRole("button", { name: "Find place" }));

    await waitFor(() => {
      expect(screen.getByDisplayValue("London, England, United Kingdom")).toBeInTheDocument();
    });
    expect(screen.getByRole("button", { name: /London, Ontario, Canada/ })).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "Search" })).toHaveAttribute("aria-pressed", "true");
    expect(screen.queryByRole("combobox", { name: /game preset/i })).toBeNull();

    fireEvent.click(screen.getByRole("button", { name: /London, Ontario, Canada/ }));

    await waitFor(() => {
      expect(screen.getByDisplayValue("London, Ontario, Canada")).toBeInTheDocument();
    });
    expect(screen.getByRole("button", { name: "Search" })).toHaveAttribute("aria-pressed", "true");
    expect(mapView.model?.focusBounds).toEqual(placeToFocusBounds(londonCanada));
  });

  it("loads the County Dublin preset when search hits that place", async () => {
    searchPlaces.mockResolvedValueOnce([
      {
        id: "county-dublin",
        displayName: "County Dublin, Ireland",
        center: [53.35, -6.26],
        bounds: { south: 53.2, west: -6.5, north: 53.5, east: -6.0 },
        placeCategory: "county",
        approximateAreaSqMi: 350,
      },
    ]);
    renderCreateSession();

    fireEvent.change(screen.getByPlaceholderText("Dublin, Ireland"), {
      target: { value: "County Dublin" },
    });
    fireEvent.click(screen.getByRole("button", { name: "Find place" }));

    await waitFor(() => {
      expect(screen.getByRole("button", { name: "Preset" })).toHaveAttribute(
        "aria-pressed",
        "true",
      );
    });
    expect(screen.getByRole("combobox", { name: /game preset/i })).toHaveValue(
      "bundled:dublin-county",
    );
  });

  it("Confirm with no area asks for Search, Preset, or Draw", async () => {
    renderCreateSession();
    goToPlay();

    fireEvent.click(screen.getByRole("button", { name: "Create game" }));

    expect(
      await screen.findByText(/search for a place, load a preset, or open draw/i),
    ).toBeInTheDocument();
    expect(startSeaLevelBackgroundSampling).not.toHaveBeenCalled();
  });

  it("mounts the map on boundary import intent", () => {
    parseBoundaryFile.mockReturnValue(new Promise(() => {}));
    renderCreateSession();

    importBoundaryFile();

    expect(screen.getByTestId("create-map")).toBeInTheDocument();
  });

  it("opens the fullscreen framing map from Draw on map", () => {
    renderCreateSession();
    goToDrawSource();

    fireEvent.click(screen.getByRole("button", { name: "Draw on map" }));

    expect(screen.getByTestId("game-area-framing-modal")).toBeInTheDocument();
    expect(screen.getByRole("radio", { name: "Square" })).toBeChecked();
    expect(screen.getByRole("radio", { name: "Circle" })).not.toBeChecked();
    expect(screen.getAllByTestId("create-map").length).toBeGreaterThanOrEqual(1);
  });

  it("Use my location loads nearby suggested play areas", async () => {
    const london = {
      id: "london",
      displayName: "London, England, United Kingdom",
      center: [51.507, -0.128] as [number, number],
      bounds: { south: 51.28, west: -0.51, north: 51.7, east: 0.33 },
      placeCategory: "city" as const,
      approximateAreaSqMi: 600,
    };
    const county = {
      id: "greater-london",
      displayName: "Greater London, England, United Kingdom",
      center: [51.5, -0.12] as [number, number],
      bounds: { south: 51.28, west: -0.51, north: 51.7, east: 0.33 },
      placeCategory: "county" as const,
      approximateAreaSqMi: 600,
    };
    suggestPlacesAtPoint.mockResolvedValue([london, county]);
    requestLocationAccess.mockResolvedValue({
      lat: 51.507,
      lng: -0.128,
      accuracy: 12,
      heading: null,
    });
    renderCreateSession();

    fireEvent.click(screen.getByRole("button", { name: /use my location/i }));

    expect(await screen.findByDisplayValue("London, England, United Kingdom")).toBeInTheDocument();
    expect(screen.getByRole("button", { name: /Greater London/ })).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "Search" })).toHaveAttribute("aria-pressed", "true");
    await waitFor(() => {
      expect(mapView.model?.focusBounds).toEqual(placeToFocusBounds(london));
    });

    loadMapWithDefaultViewport();
    goToPlay();
    fireEvent.click(screen.getByRole("button", { name: "Create game" }));
    await waitFor(() => {
      expect(startSeaLevelBackgroundSampling).toHaveBeenCalled();
    });
  });

  it("Use my location focuses the map strip without inventing a game area", async () => {
    requestLocationAccess.mockResolvedValue({
      lat: 53.35,
      lng: -6.26,
      accuracy: 12,
      heading: null,
    });
    renderCreateSession();

    fireEvent.click(screen.getByRole("button", { name: /use my location/i }));

    expect(await screen.findByTestId("create-map")).toBeInTheDocument();
    expect(screen.queryByText(/using your location/i)).toBeNull();
    await waitFor(() => {
      expect(mapView.model?.focusBounds).toEqual(gpsReadingToFocusBounds(53.35, -6.26));
    });

    loadMapWithDefaultViewport();
    goToPlay();
    fireEvent.click(screen.getByRole("button", { name: "Create game" }));

    expect(
      await screen.findByText(
        /search for a place, load a preset, or open draw to set the play area/i,
      ),
    ).toBeInTheDocument();
    expect(startSeaLevelBackgroundSampling).not.toHaveBeenCalled();
    fireEvent.click(screen.getByRole("button", { name: "Back" }));
    fireEvent.click(screen.getByRole("button", { name: "Back" }));
    expect(screen.getByPlaceholderText("Dublin, Ireland")).toHaveValue("");
  });

  it("Use my location keeps an imported boundary", async () => {
    parseBoundaryFile.mockResolvedValue(IMPORTED_AREA);
    requestLocationAccess.mockResolvedValue({
      lat: 53.35,
      lng: -6.26,
      accuracy: 12,
      heading: null,
    });
    renderCreateSession();

    importBoundaryFile();
    await waitFor(() => {
      expect(screen.getByDisplayValue("dublin.kml")).toBeInTheDocument();
    });

    fireEvent.click(screen.getByRole("button", { name: /use my location/i }));
    await waitFor(() => {
      expect(mapView.model?.focusBounds).toEqual(gpsReadingToFocusBounds(53.35, -6.26));
    });
    expect(screen.getByDisplayValue("dublin.kml")).toBeInTheDocument();

    goToPlay();
    fireEvent.click(screen.getByRole("button", { name: "Create game" }));
    await waitFor(() => {
      expect(startSeaLevelBackgroundSampling).toHaveBeenCalledWith(IMPORTED_AREA, {
        regionPackId: undefined,
      });
    });
  });

  it("Use my location replaces a searched place with nearby suggestions", async () => {
    searchPlaces.mockResolvedValueOnce([
      {
        id: "dublin",
        displayName: "Dublin, Ireland",
        center: [53.35, -6.26],
        bounds: { south: 53.3, west: -6.4, north: 53.4, east: -6.1 },
        placeCategory: "city",
        approximateAreaSqMi: 10,
      },
    ]);
    const london = {
      id: "london",
      displayName: "London, England, United Kingdom",
      center: [51.507, -0.128] as [number, number],
      bounds: { south: 51.28, west: -0.51, north: 51.7, east: 0.33 },
      placeCategory: "city" as const,
      approximateAreaSqMi: 600,
    };
    suggestPlacesAtPoint.mockResolvedValue([london]);
    requestLocationAccess.mockResolvedValue({
      lat: 51.5,
      lng: -0.12,
      accuracy: 12,
      heading: null,
    });
    renderCreateSession();

    fireEvent.change(screen.getByPlaceholderText("Dublin, Ireland"), {
      target: { value: "Dublin" },
    });
    fireEvent.click(screen.getByRole("button", { name: "Find place" }));
    await waitFor(() => {
      expect(screen.getByDisplayValue("Dublin, Ireland")).toBeInTheDocument();
    });

    fireEvent.click(screen.getByRole("button", { name: /use my location/i }));
    await waitFor(() => {
      expect(screen.getByRole("combobox", { name: /game preset/i })).toHaveValue("bundled:london");
    });
    expect(screen.queryByDisplayValue("Dublin, Ireland")).toBeNull();

    await waitFor(() => {
      expect(screen.getByText(/metric · London, United Kingdom/i)).toBeInTheDocument();
    });
    goToPlay();
    fireEvent.click(screen.getByRole("button", { name: "Create game" }));
    await waitFor(() => {
      expect(startSeaLevelBackgroundSampling).toHaveBeenCalled();
    });
  });

  it("Use my location keeps a framed area from Draw on map", async () => {
    requestLocationAccess.mockResolvedValue({
      lat: 53.35,
      lng: -6.26,
      accuracy: 12,
      heading: null,
    });
    renderCreateSession();

    goToDrawSource();
    fireEvent.click(screen.getByRole("button", { name: "Draw on map" }));
    loadMapWithDefaultViewport();
    fireEvent.click(screen.getByRole("radio", { name: "Circle" }));
    fireEvent.click(screen.getByRole("button", { name: "Done" }));

    fireEvent.click(screen.getByRole("button", { name: /use my location/i }));
    await waitFor(() => {
      expect(mapView.model?.focusBounds).toEqual(gpsReadingToFocusBounds(53.35, -6.26));
    });
    loadMapWithDefaultViewport();

    goToPlay();
    fireEvent.click(screen.getByRole("button", { name: "Create game" }));
    await waitFor(() => {
      expect(startSeaLevelBackgroundSampling).toHaveBeenCalledTimes(1);
    });
    expect(
      screen.queryByText(/search for a place, load a preset, or open draw to set the play area/i),
    ).not.toBeInTheDocument();
  });

  it("Use my location shows halt status when GPS is denied", async () => {
    requestLocationAccess.mockRejectedValue(new Error("User denied Geolocation"));
    renderCreateSession();

    fireEvent.click(screen.getByRole("button", { name: /use my location/i }));

    expect(await screen.findByText(/couldn't use your location/i)).toBeInTheDocument();
    expect(screen.queryByPlaceholderText("Dublin, Ireland")).toHaveValue("");
    expect(screen.queryByDisplayValue(/53\.35/)).not.toBeInTheDocument();
    expect(screen.queryByTestId("create-map")).not.toBeInTheDocument();
  });

  it("clears a loaded preset recap after a place search", async () => {
    useGamePresetStore.setState({
      presets: mergeBundledPresets([
        {
          id: "preset-cork",
          name: "Cork weekend",
          createdAt: "2026-01-01T00:00:00.000Z",
          updatedAt: "2026-01-01T00:00:00.000Z",
          schemaVersion: GAME_PRESET_SCHEMA_VERSION,
          gameSize: "medium",
          distanceUnit: "metric",
          advancedSettings: defaultAdvancedSessionSettings("medium", "metric"),
          placeLabel: "Cork, Ireland",
          gameArea: IMPORTED_AREA,
          focusBounds: { south: 53.3, west: -6.3, north: 53.4, east: -6.2 },
          migrationStatus: "ok",
        },
      ]),
    });
    searchPlaces.mockResolvedValueOnce([
      {
        id: "galway",
        displayName: "Galway, Ireland",
        center: [53.27, -9.05],
        bounds: { south: 53.2, west: -9.2, north: 53.35, east: -8.9 },
        placeCategory: "city",
        approximateAreaSqMi: 20,
      },
    ]);
    renderCreateSession("/create?preset=preset-cork");
    await waitFor(() => {
      expect(screen.getByText(/medium · metric · Cork, Ireland/i)).toBeInTheDocument();
    });

    fireEvent.click(screen.getByRole("button", { name: "Search" }));
    fireEvent.change(screen.getByPlaceholderText("Dublin, Ireland"), {
      target: { value: "Galway" },
    });
    fireEvent.click(screen.getByRole("button", { name: "Find place" }));
    await waitFor(() => {
      expect(screen.getByDisplayValue("Galway, Ireland")).toBeInTheDocument();
    });

    goToRules();
    expect(screen.getByText("Playing in Galway, Ireland")).toBeInTheDocument();
    expect(screen.queryByText("Playing in Cork weekend")).toBeNull();
  });

  it("keeps a searched place when Draw is cancelled", async () => {
    searchPlaces.mockResolvedValueOnce([
      {
        id: "dublin",
        displayName: "Dublin, Ireland",
        center: [53.35, -6.26],
        bounds: { south: 53.3, west: -6.4, north: 53.4, east: -6.1 },
        placeCategory: "city",
        approximateAreaSqMi: 10,
      },
    ]);
    renderCreateSession();
    fireEvent.change(screen.getByPlaceholderText("Dublin, Ireland"), {
      target: { value: "Dublin" },
    });
    fireEvent.click(screen.getByRole("button", { name: "Find place" }));
    await waitFor(() => {
      expect(screen.getByDisplayValue("Dublin, Ireland")).toBeInTheDocument();
    });

    goToDrawSource();
    fireEvent.click(screen.getByRole("button", { name: "Draw on map" }));
    expect(screen.getByTestId("game-area-framing-modal")).toBeInTheDocument();
    fireEvent.click(screen.getByRole("button", { name: "Cancel" }));

    goToRules();
    expect(screen.getByText("Playing in Dublin, Ireland")).toBeInTheDocument();
    fireEvent.click(screen.getByRole("button", { name: "Next" }));
    fireEvent.click(screen.getByRole("button", { name: "Create game" }));
    await waitFor(() => {
      expect(startSeaLevelBackgroundSampling).toHaveBeenCalled();
    });
  });

  it("Create game uses areas stacked with Add another area", async () => {
    searchPlaces.mockResolvedValueOnce([
      {
        id: "dublin",
        displayName: "Dublin, Ireland",
        center: [53.35, -6.26],
        bounds: { south: 53.3, west: -6.4, north: 53.4, east: -6.1 },
        placeCategory: "city",
        approximateAreaSqMi: 10,
      },
    ]);
    renderCreateSession();
    fireEvent.change(screen.getByPlaceholderText("Dublin, Ireland"), {
      target: { value: "Dublin" },
    });
    fireEvent.click(screen.getByRole("button", { name: "Find place" }));
    await waitFor(() => {
      expect(screen.getByDisplayValue("Dublin, Ireland")).toBeInTheDocument();
    });

    goToRules();
    openMoreTools();
    fireEvent.click(screen.getByRole("button", { name: "Add another area" }));
    fireEvent.click(screen.getByRole("button", { name: "Next" }));
    fireEvent.click(screen.getByRole("button", { name: "Create game" }));
    await waitFor(() => {
      expect(startSeaLevelBackgroundSampling).toHaveBeenCalled();
    });
    expect(
      screen.queryByText(/search for a place, load a preset, or open draw to set the play area/i),
    ).toBeNull();
  });
});
