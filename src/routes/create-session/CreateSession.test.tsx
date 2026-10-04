import { MantineProvider } from "@mantine/core";
import { act, fireEvent, render, screen, waitFor } from "@testing-library/react";
import { MemoryRouter } from "react-router-dom";
import { beforeEach, describe, expect, it, vi } from "vitest";
import type { MapViewModel } from "@/components/map/chrome/mapViewTypes";
import { createMapBounds } from "@/domain/map/mapBounds";
import { jetlagTheme } from "@/theme/theme";
import { CreateSession } from "./CreateSession";
import { gpsReadingToFocusBounds } from "./utils";

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

const searchPlaces = vi.hoisted(() => vi.fn(async () => [] as unknown[]));
vi.mock("@/services/geo/geocoding", async (importOriginal) => ({
  ...(await importOriginal<typeof import("@/services/geo/geocoding")>()),
  searchPlaces,
}));

vi.mock("@/components/map/layers/FramingPreviewLayers", () => ({
  FramingPreviewLayers: () => null,
}));

vi.mock("@/components/session/framing/prefetchCreateSessionMap", () => ({
  prefetchCreateSessionMap: vi.fn(async () => undefined),
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

beforeEach(() => {
  mapView.model = null;
  startSeaLevelBackgroundSampling.mockReset();
  parseBoundaryFile.mockReset();
  requestLocationAccess.mockReset();
  isFirebaseConfigured.mockReturnValue(false);
  ensureAnonymousUser.mockResolvedValue({ uid: "host-1" });
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

function renderCreateSession() {
  return render(
    <MantineProvider theme={jetlagTheme} forceColorScheme="dark">
      <MemoryRouter>
        <CreateSession />
      </MemoryRouter>
    </MantineProvider>,
  );
}

describe("CreateSession", () => {
  it("renders Apple Back control, Create title, and confirm footer", () => {
    renderCreateSession();

    expect(screen.getByRole("link", { name: /^back$/i })).toBeInTheDocument();
    expect(screen.getByRole("heading", { name: /^create$/i })).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "Draw on map" })).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "Create game" })).toBeInTheDocument();
    const root = document.querySelector(".jl-create-session");
    expect(root).toBeTruthy();
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

  it("shows a map facade instead of constructing MapLibre on load", () => {
    renderCreateSession();

    expect(screen.queryByTestId("create-map")).not.toBeInTheDocument();

    fireEvent.click(screen.getByRole("button", { name: "Open map" }));

    expect(screen.getByTestId("create-map")).toBeInTheDocument();
    expect(screen.getByRole("status")).toHaveTextContent("Loading map…");

    loadMapWithDefaultViewport();

    expect(screen.queryByText("Loading map…")).not.toBeInTheDocument();
  });

  it("mounts the map on search intent", () => {
    renderCreateSession();

    fireEvent.change(screen.getByPlaceholderText("Dublin, Ireland"), {
      target: { value: "Dublin" },
    });
    fireEvent.click(screen.getByRole("button", { name: "Find place" }));

    expect(screen.getByTestId("create-map")).toBeInTheDocument();
  });

  it("Confirm with no area awaits map mount, then frames the live viewport", async () => {
    renderCreateSession();

    fireEvent.click(screen.getByRole("button", { name: "Create game" }));

    // Confirm is the intent: the map mounts, and nothing is submitted yet.
    expect(await screen.findByTestId("create-map")).toBeInTheDocument();
    expect(startSeaLevelBackgroundSampling).not.toHaveBeenCalled();
    expect(
      screen.queryByText(/move the map until the play area is framed/i),
    ).not.toBeInTheDocument();

    loadMapWithDefaultViewport();

    await waitFor(() => {
      expect(startSeaLevelBackgroundSampling).toHaveBeenCalledTimes(1);
    });
    const [gameArea] = startSeaLevelBackgroundSampling.mock.calls[0]!;
    expect(gameArea).toMatchObject({ type: "Polygon" });
  });

  it("mounts the map on boundary import intent", () => {
    parseBoundaryFile.mockReturnValue(new Promise(() => {}));
    renderCreateSession();

    importBoundaryFile();

    expect(screen.getByTestId("create-map")).toBeInTheDocument();
  });

  it("opens the fullscreen framing map from Draw on map", () => {
    renderCreateSession();

    fireEvent.click(screen.getByRole("button", { name: "Draw on map" }));

    expect(screen.getByRole("radio", { name: "Circle" })).toBeInTheDocument();
    expect(screen.getByTestId("create-map")).toBeInTheDocument();
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

    expect(await screen.findByText(/using your location/i)).toBeInTheDocument();
    expect(screen.getByTestId("create-map")).toBeInTheDocument();
    await waitFor(() => {
      expect(mapView.model?.focusBounds).toEqual(gpsReadingToFocusBounds(53.35, -6.26));
    });

    loadMapWithDefaultViewport();
    fireEvent.click(screen.getByRole("button", { name: "Create game" }));

    expect(
      await screen.findByText(
        /search for a place, import a boundary, or move the map until the play area is framed/i,
      ),
    ).toBeInTheDocument();
    expect(startSeaLevelBackgroundSampling).not.toHaveBeenCalled();
    expect(screen.getByPlaceholderText("Dublin, Ireland")).toHaveValue("");
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

  it("Confirm reports a map load failure instead of blaming the player", async () => {
    vi.useFakeTimers();
    try {
      renderCreateSession();

      fireEvent.click(screen.getByRole("button", { name: "Create game" }));
      await act(async () => {
        await vi.advanceTimersByTimeAsync(10_000);
      });

      expect(screen.getByText(/the map couldn't load/i)).toBeInTheDocument();
      expect(startSeaLevelBackgroundSampling).not.toHaveBeenCalled();
    } finally {
      vi.useRealTimers();
    }
  });
});
