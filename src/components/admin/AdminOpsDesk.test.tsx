import { MantineProvider } from "@mantine/core";
import { fireEvent, screen } from "@testing-library/react";
import type { ReactElement } from "react";
import { afterEach, describe, expect, it, vi } from "vitest";
import type { AdminSessionSummary } from "../../services/admin/adminSessions";
import { renderWithRouter } from "../../test/renderWithRouter";
import { jetlagTheme } from "../../theme/theme";
import { AdminOpsDesk } from "./AdminOpsDesk";

function renderOpsDesk(ui: ReactElement = <AdminOpsDesk />) {
  return renderWithRouter(
    <MantineProvider theme={jetlagTheme} forceColorScheme="dark">
      {ui}
    </MantineProvider>,
  );
}

function expectStaticAppShell(layout: "desktop" | "mobile") {
  const desk = screen.getByTestId("admin-ops-desk");
  expect(desk).toHaveAttribute("data-layout", layout);
  expect(desk).toHaveAttribute("data-admin-shell", "mantine-static");
  expect(desk.classList.contains("mantine-AppShell-root") || desk.querySelector(".mantine-AppShell-root")).toBeTruthy();
}

const SEEKER_HIDER_META = /1S \/ 1H/i;

const authState = vi.hoisted(() => ({
  state: "loading" as "loading" | "unsigned" | "denied" | "admin",
  user: null as { email: string; emailVerified: boolean } | null,
  authReady: true,
}));

const sessionListState = vi.hoisted(() => ({
  sessions: [] as AdminSessionSummary[],
  loading: false,
  refreshing: false,
  loadingMore: false,
  hasMore: false,
  error: null as string | null,
  lastFetchedAt: null as Date | null,
  refresh: vi.fn(),
  loadMore: vi.fn(),
}));

vi.mock("../../hooks/admin/useAdminAccessState", () => ({
  useAdminAccessState: () => authState,
}));

vi.mock("../../hooks/admin/useAdminSessionList", () => ({
  useAdminSessionList: () => sessionListState,
}));

vi.mock("../billing/PremiumSignInGate", () => ({
  PremiumSignInGate: ({ continuePath }: { continuePath: string }) => (
    <div data-testid="premium-sign-in-gate">{continuePath}</div>
  ),
}));

vi.mock("../../services/admin/adminIncidents", () => ({
  subscribeIncidentList: (onNext: (incidents: unknown[]) => void) => {
    onNext([]);
    return () => undefined;
  },
  countOpenIncidents: () => 0,
}));

vi.mock("../../services/core/firebase/firebase", () => ({
  isFirebaseConfigured: () => true,
  getFirebaseAuth: () => ({}),
  ensureAnonymousUser: vi.fn(async () => ({ uid: "anon-test" })),
}));

vi.mock("../../services/core/firebase", () => ({
  isFirebaseConfigured: () => true,
  getFirebaseAuth: () => ({}),
  ensureAnonymousUser: vi.fn(async () => ({ uid: "anon-test" })),
}));

vi.mock("../../hooks/admin/useAdminJoinSession", () => ({
  useAdminJoinSession: () => ({
    joinSession: vi.fn(),
    joiningCode: null,
    error: null,
    setError: vi.fn(),
  }),
}));

vi.mock("react-grid-layout", () => ({
  default: ({ children }: { children: unknown }) => (
    <div data-testid="mock-grid">{children as never}</div>
  ),
  useContainerWidth: () => ({
    width: 1200,
    containerRef: { current: null },
    mounted: true,
  }),
  verticalCompactor: {},
}));

describe("AdminOpsDesk", () => {
  const originalMatchMedia = window.matchMedia;

  afterEach(() => {
    Object.defineProperty(window, "matchMedia", {
      writable: true,
      value: originalMatchMedia,
    });
    sessionListState.sessions = [];
    sessionListState.loading = false;
    sessionListState.refreshing = false;
    sessionListState.loadingMore = false;
    sessionListState.hasMore = false;
    sessionListState.error = null;
    sessionListState.refresh.mockClear();
    sessionListState.loadMore.mockClear();
  });

  it("shows skeleton rows while auth is loading", () => {
    authState.state = "loading";
    authState.authReady = false;
    authState.user = null;
    renderOpsDesk();

    expect(document.querySelector(".mantine-Skeleton-root")).toBeInTheDocument();
  });

  it("shows the sign-in gate for signed-out users", () => {
    authState.state = "unsigned";
    authState.authReady = true;
    authState.user = null;
    sessionListState.sessions = [];

    renderOpsDesk();

    expect(screen.getByText(/Sign in with your Google account/i)).toBeInTheDocument();
    expect(screen.getByTestId("premium-sign-in-gate")).toHaveTextContent("/admin");
  });

  it("shows access denied for non-admin permanent users", () => {
    authState.state = "denied";
    authState.authReady = true;
    authState.user = { email: "player@example.com", emailVerified: true };

    renderOpsDesk();

    expect(screen.getByRole("heading", { name: "Access denied" })).toBeInTheDocument();
  });

  it("defaults Live on and shows no-live empty title when the list is empty", () => {
    authState.state = "admin";
    authState.authReady = true;
    authState.user = { email: "admin@example.com", emailVerified: true };
    sessionListState.loading = false;
    sessionListState.error = null;
    sessionListState.sessions = [];

    renderOpsDesk();

    expect(screen.getByRole("button", { name: "Live" })).toHaveAttribute("aria-pressed", "true");
    expect(screen.getByText("No live sessions")).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "More filters" })).toHaveAttribute(
      "aria-expanded",
      "false",
    );
    expect(screen.queryByRole("button", { name: "Singleplayer" })).not.toBeInTheDocument();
    expect(screen.queryByRole("button", { name: "Hiding" })).not.toBeInTheDocument();
  });

  it("shows No sessions when Live is off and the list is empty", () => {
    authState.state = "admin";
    authState.authReady = true;
    authState.user = { email: "admin@example.com", emailVerified: true };
    sessionListState.loading = false;
    sessionListState.error = null;
    sessionListState.sessions = [];

    renderOpsDesk();

    fireEvent.click(screen.getByRole("button", { name: "Live" }));

    expect(screen.getByRole("button", { name: "Live" })).toHaveAttribute("aria-pressed", "false");
    expect(screen.getByText("No sessions")).toBeInTheDocument();
    expect(screen.queryByText("No live sessions")).not.toBeInTheDocument();
  });

  it("shows actionable sessions failure without the calm empty state", () => {
    authState.state = "admin";
    authState.authReady = true;
    authState.user = { email: "admin@example.com", emailVerified: true };
    sessionListState.loading = false;
    sessionListState.sessions = [];
    sessionListState.error = "Couldn't load live sessions.";

    renderOpsDesk();

    expect(screen.getByText("Couldn't load live sessions.")).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "Retry" })).toBeInTheDocument();
    expect(screen.queryByText("No live sessions")).not.toBeInTheDocument();
    expect(screen.queryByRole("button", { name: "Live" })).not.toBeInTheDocument();
    expect(screen.queryByLabelText("Search")).not.toBeInTheDocument();
  });

  it("retries the session list from the sessions failure UI", () => {
    authState.state = "admin";
    authState.authReady = true;
    authState.user = { email: "admin@example.com", emailVerified: true };
    sessionListState.loading = false;
    sessionListState.sessions = [];
    sessionListState.error = "Couldn't load live sessions.";
    sessionListState.refresh.mockClear();

    renderOpsDesk();

    fireEvent.click(screen.getByRole("button", { name: "Retry" }));
    expect(sessionListState.refresh).toHaveBeenCalledTimes(1);
  });

  it("keeps retained sessions visible when refresh fails with an error", () => {
    authState.state = "admin";
    authState.authReady = true;
    authState.user = { email: "admin@example.com", emailVerified: true };
    sessionListState.loading = false;
    sessionListState.error = "Couldn't load live sessions.";
    sessionListState.sessions = [
      {
        sessionId: "session-1",
        code: "ABCD",
        phase: "seek",
        tier: "free",
        gameSize: "medium",
        roleCounts: { seeker: 1, hider: 1, observer: 0, admin: 0 },
        hostUid: "host-1",
        createdAt: "2026-01-01T00:00:00.000Z",
        memberCount: 2,
        timerAccumulatedMs: 0,
        timerRunningSince: "2026-01-01T00:00:00.000Z",
        endGameStartedAt: null,
        endGameRequestedAt: null,
        hostAppVersion: null,
        hidingPeriodMinutes: null,
        regionPackId: null,
        regionPackSubregionId: null,
        transitMetroId: null,
        gameAreaLabel: "Dublin",
        lastActivityAt: "2026-01-02T00:00:00.000Z",
        lastLocationAt: "2026-01-02T00:00:00.000Z",
        lastAnnotationAt: null,
        activeAnnotationCount: 0,
        mode: "multiplayer",
        isLive: true,
        liveMultiplayer: true,
      },
    ];

    renderOpsDesk();

    expect(screen.getByText("Couldn't load live sessions.")).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "Retry" })).toBeInTheDocument();
    expect(screen.getByText("ABCD")).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "Live" })).toBeInTheDocument();
    expect(screen.queryByText("No live sessions")).not.toBeInTheDocument();
    expect(screen.getByRole("button", { name: "More filters" })).toHaveAttribute(
      "aria-expanded",
      "false",
    );
    expect(screen.queryByRole("button", { name: "Singleplayer" })).not.toBeInTheDocument();
  });

  it("renders session phase labels for admin users", () => {
    authState.state = "admin";
    authState.authReady = true;
    authState.user = { email: "admin@example.com", emailVerified: true };
    sessionListState.sessions = [
      {
        sessionId: "session-1",
        code: "ABCD",
        phase: "seek",
        tier: "free",
        gameSize: "medium",
        roleCounts: { seeker: 1, hider: 1, observer: 0, admin: 0 },
        hostUid: "host-1",
        createdAt: "2026-01-01T00:00:00.000Z",
        memberCount: 2,
        timerAccumulatedMs: 0,
        timerRunningSince: "2026-01-01T00:00:00.000Z",
        endGameStartedAt: null,
        endGameRequestedAt: null,
        hostAppVersion: null,
        hidingPeriodMinutes: null,
        regionPackId: null,
        regionPackSubregionId: null,
        transitMetroId: null,
        gameAreaLabel: "Dublin",
        lastActivityAt: "2026-01-02T00:00:00.000Z",
        lastLocationAt: "2026-01-02T00:00:00.000Z",
        lastAnnotationAt: null,
        activeAnnotationCount: 0,
        mode: "multiplayer",
        isLive: true,
        liveMultiplayer: true,
      },
    ];

    renderOpsDesk();

    expect(screen.getByText("ABCD")).toBeInTheDocument();
    expect(screen.getByText("Dublin")).toBeInTheDocument();
    expect(screen.getAllByText("Seek").length).toBeGreaterThan(0);
    expect(screen.getByText(SEEKER_HIDER_META)).toBeInTheDocument();
  });

  it("uses a scrollable session list column on desktop", () => {
    authState.state = "admin";
    authState.authReady = true;
    authState.user = { email: "admin@example.com", emailVerified: true };
    sessionListState.sessions = [
      {
        sessionId: "session-1",
        code: "ABCD",
        phase: "seek",
        tier: "free",
        gameSize: "medium",
        roleCounts: { seeker: 1, hider: 1, observer: 0, admin: 0 },
        hostUid: "host-1",
        createdAt: "2026-01-01T00:00:00.000Z",
        memberCount: 2,
        timerAccumulatedMs: 0,
        timerRunningSince: "2026-01-01T00:00:00.000Z",
        endGameStartedAt: null,
        endGameRequestedAt: null,
        hostAppVersion: null,
        hidingPeriodMinutes: null,
        regionPackId: null,
        regionPackSubregionId: null,
        transitMetroId: null,
        gameAreaLabel: "Dublin",
        lastActivityAt: "2026-01-02T00:00:00.000Z",
        lastLocationAt: null,
        lastAnnotationAt: null,
        activeAnnotationCount: 0,
        mode: "multiplayer",
        isLive: true,
        liveMultiplayer: true,
      },
    ];

    Object.defineProperty(window, "matchMedia", {
      writable: true,
      value: vi.fn().mockImplementation((query: string) => ({
        matches: query === "(min-width: 1024px)",
        media: query,
        onchange: null,
        addListener: vi.fn(),
        removeListener: vi.fn(),
        addEventListener: vi.fn(),
        removeEventListener: vi.fn(),
        dispatchEvent: vi.fn(),
      })),
    });

    renderOpsDesk();

    expect(document.querySelector(".admin-dashboard-list-scroll")).toBeInTheDocument();
    expectStaticAppShell("desktop");
    expect(screen.getByRole("link", { name: /^home$/i })).toHaveAttribute("href", "/");
    expect(screen.queryByRole("banner", { name: /screen header/i })).toBeNull();
    expect(screen.queryByRole("link", { name: /←\s*back/i })).toBeNull();
  });

  it("keeps topbar Home on mobile without a ScreenHeader Back", () => {
    authState.state = "admin";
    authState.authReady = true;
    authState.user = { email: "admin@example.com", emailVerified: true };
    sessionListState.sessions = [];

    Object.defineProperty(window, "matchMedia", {
      writable: true,
      value: vi.fn().mockImplementation((query: string) => ({
        matches: false,
        media: query,
        onchange: null,
        addListener: vi.fn(),
        removeListener: vi.fn(),
        addEventListener: vi.fn(),
        removeEventListener: vi.fn(),
        dispatchEvent: vi.fn(),
      })),
    });

    renderOpsDesk();

    expectStaticAppShell("mobile");
    expect(screen.getByRole("link", { name: /^home$/i })).toHaveAttribute("href", "/");
    expect(screen.queryByRole("banner", { name: /screen header/i })).toBeNull();
    expect(screen.queryByRole("link", { name: /←\s*back/i })).toBeNull();
  });

  it("loads more sessions from the list footer", () => {
    authState.state = "admin";
    authState.authReady = true;
    authState.user = { email: "admin@example.com", emailVerified: true };
    sessionListState.loading = false;
    sessionListState.hasMore = true;
    sessionListState.loadingMore = false;
    sessionListState.loadMore.mockClear();
    sessionListState.sessions = [
      {
        sessionId: "session-1",
        code: "ABCD",
        phase: "seek",
        tier: "free",
        gameSize: "medium",
        roleCounts: { seeker: 1, hider: 1, observer: 0, admin: 0 },
        hostUid: "host-1",
        createdAt: "2026-01-01T00:00:00.000Z",
        memberCount: 2,
        timerAccumulatedMs: 0,
        timerRunningSince: "2026-01-01T00:00:00.000Z",
        endGameStartedAt: null,
        endGameRequestedAt: null,
        hostAppVersion: null,
        hidingPeriodMinutes: null,
        regionPackId: null,
        regionPackSubregionId: null,
        transitMetroId: null,
        gameAreaLabel: "Dublin",
        lastActivityAt: "2026-01-02T00:00:00.000Z",
        lastLocationAt: "2026-01-02T00:00:00.000Z",
        lastAnnotationAt: null,
        activeAnnotationCount: 0,
        mode: "multiplayer",
        isLive: true,
        liveMultiplayer: true,
      },
    ];

    renderOpsDesk();

    fireEvent.click(screen.getByRole("button", { name: "Load more sessions" }));
    expect(sessionListState.loadMore).toHaveBeenCalledTimes(1);
  });

  it("shows load more when filters hide every loaded session", () => {
    authState.state = "admin";
    authState.authReady = true;
    authState.user = { email: "admin@example.com", emailVerified: true };
    sessionListState.loading = false;
    sessionListState.hasMore = true;
    sessionListState.sessions = [
      {
        sessionId: "session-1",
        code: "ABCD",
        phase: "seek",
        tier: "free",
        gameSize: "medium",
        roleCounts: { seeker: 1, hider: 1, observer: 0, admin: 0 },
        hostUid: "host-1",
        createdAt: "2026-01-01T00:00:00.000Z",
        memberCount: 2,
        timerAccumulatedMs: 0,
        timerRunningSince: "2026-01-01T00:00:00.000Z",
        endGameStartedAt: null,
        endGameRequestedAt: null,
        hostAppVersion: null,
        hidingPeriodMinutes: null,
        regionPackId: null,
        regionPackSubregionId: null,
        transitMetroId: null,
        gameAreaLabel: "Dublin",
        lastActivityAt: "2026-01-02T00:00:00.000Z",
        lastLocationAt: "2026-01-02T00:00:00.000Z",
        lastAnnotationAt: null,
        activeAnnotationCount: 0,
        mode: "multiplayer",
        isLive: false,
        liveMultiplayer: false,
      },
    ];

    renderOpsDesk();

    // Default Live filter hides the non-live row; keep Load more for the filter miss.
    expect(screen.getByRole("button", { name: "Live" })).toHaveAttribute("aria-pressed", "true");
    expect(screen.getByText("No matching sessions")).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "Load more sessions" })).toBeInTheDocument();
  });
});
