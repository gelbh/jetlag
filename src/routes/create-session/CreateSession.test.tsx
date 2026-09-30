import { fireEvent, render, screen, waitFor } from "@testing-library/react";
import { MemoryRouter } from "react-router-dom";
import { MantineProvider } from "@mantine/core";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { CreateSession } from "./CreateSession";
import { jetlagTheme } from "@/theme/theme";

const ensureAnonymousUser = vi.hoisted(() =>
  vi.fn(async () => ({ uid: "host-1" })),
);
const isFirebaseConfigured = vi.hoisted(() => vi.fn(() => false));

vi.mock("@/hooks/navigation/useAppNavigate", () => ({
  useAppNavigate: () => vi.fn(),
}));

vi.mock("@/components/map/chrome/MapView", () => ({
  MapView: () => <div data-testid="create-map" />,
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
  const input = document.querySelector<HTMLInputElement>('input[type="file"]');
  expect(input).toBeTruthy();
  const file = new File(["<kml/>"], "dublin.kml", {
    type: "application/vnd.google-earth.kml+xml",
  });
  fireEvent.change(input!, { target: { files: [file] } });
  return file;
}

beforeEach(() => {
  startSeaLevelBackgroundSampling.mockReset();
  parseBoundaryFile.mockReset();
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
    expect(
      screen.getByRole("heading", { name: /^create$/i }),
    ).toBeInTheDocument();
    expect(
      screen.getByRole("heading", { name: /frame the game area/i }),
    ).toBeInTheDocument();
    expect(
      screen.getByRole("button", { name: /confirm game area/i }),
    ).toBeInTheDocument();
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

    const confirm = screen.getByRole("button", { name: /confirm game area/i });
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
      expect(
        screen.getByText(/couldn't sign in to create a session/i),
      ).toBeInTheDocument();
    });
    expect(screen.getByRole("button", { name: /^retry$/i })).toBeInTheDocument();
    expect(
      screen.getByRole("button", { name: /confirm game area/i }),
    ).toBeDisabled();
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

    fireEvent.click(screen.getByRole("button", { name: /confirm game area/i }));

    await waitFor(() => {
      expect(startSeaLevelBackgroundSampling).toHaveBeenCalledWith(
        IMPORTED_AREA,
        { regionPackId: undefined },
      );
    });
  });

  it("shows friendly copy when the boundary importer chunk fails to load", async () => {
    parseBoundaryFile.mockRejectedValue(
      new TypeError(
        "Failed to fetch dynamically imported module: /assets/kmzImport-x.js",
      ),
    );
    renderCreateSession();

    importBoundaryFile();

    expect(
      await screen.findByText(/couldn't load the importer/i),
    ).toBeInTheDocument();
  });
});
