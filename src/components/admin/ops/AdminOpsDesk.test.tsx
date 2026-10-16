import { MantineProvider } from "@mantine/core";
import { act, fireEvent, screen, waitFor, within } from "@testing-library/react";
import type { ReactElement } from "react";
import { Route, Routes } from "react-router-dom";
import { afterEach, describe, expect, it, vi } from "vitest";
import type { IncidentRecord } from "../../../domain/incident/incidentTypes";
import type { PreloadRequest } from "../../../domain/preloadRequest/preloadRequestTypes";
import type { AdminSessionSummary } from "../../../services/admin/adminSessions";
import { useSessionStore } from "../../../state/sessionStore";
import { createTestRemoteSession } from "../../../test/fixtures/sessions";
import { renderWithRouter } from "../../../test/renderWithRouter";
import { jetlagTheme } from "../../../theme/theme";
import { AdminOpsDesk } from "./AdminOpsDesk";

function renderOpsDesk(ui: ReactElement = <AdminOpsDesk />, route = "/admin") {
  return renderWithRouter(
    <MantineProvider theme={jetlagTheme} forceColorScheme="dark">
      {ui}
    </MantineProvider>,
    { route },
  );
}

function mockViewport(widthPx: number) {
  Object.defineProperty(window, "matchMedia", {
    writable: true,
    value: vi.fn().mockImplementation((query: string) => ({
      matches: widthPx >= Number(/\(min-width: (\d+)px\)/.exec(query)?.[1] ?? Infinity),
      media: query,
      onchange: null,
      addListener: vi.fn(),
      removeListener: vi.fn(),
      addEventListener: vi.fn(),
      removeEventListener: vi.fn(),
      dispatchEvent: vi.fn(),
    })),
  });
}

function expectStaticAppShell(layout: "desktop" | "mobile") {
  const desk = screen.getByTestId("admin-ops-desk");
  expect(desk).toHaveAttribute("data-layout", layout);
  expect(desk).toHaveAttribute("data-admin-shell", "mantine-static");
  expect(
    desk.classList.contains("mantine-AppShell-root") ||
      desk.querySelector(".mantine-AppShell-root"),
  ).toBeTruthy();
}

function makeLiveSession(overrides: Partial<AdminSessionSummary> = {}): AdminSessionSummary {
  return {
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
    ...overrides,
  };
}

function makeIncident(overrides: Partial<IncidentRecord> = {}): IncidentRecord {
  return {
    id: "inc-abc12345",
    status: "open",
    createdAt: "2026-07-25T12:00:00Z",
    updatedAt: "2026-07-25T12:05:00Z",
    sessionId: "sess-1",
    sessionCode: "7G2LJH",
    reporterUid: "uid-1",
    reporterRole: "seeker",
    playerNote: "map froze",
    diagnostics: {
      appVersion: "0.9.5",
      route: "/map",
      sessionId: "sess-1",
      sessionCode: "7G2LJH",
      playerRole: "seeker",
      uid: "uid-1",
      userAgent: "TestAgent/1.0",
      platform: "web",
      online: true,
      visibilityState: "visible",
      lastClientErrors: [],
      recentOps: [],
      reportedAt: "2026-07-25T12:00:00Z",
    },
    adminPrompt: "## Incident report",
    ...overrides,
  };
}

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

vi.mock("../../../hooks/admin/useAdminAccessState", () => ({
  useAdminAccessState: () => authState,
}));

// The compiler memoizes row JSX, so desk renders are counted via the hook call.
const deskRenderCount = vi.hoisted(() => ({ value: 0 }));

vi.mock("../../../hooks/admin/useAdminSessionList", () => ({
  useAdminSessionList: () => {
    deskRenderCount.value += 1;
    return sessionListState;
  },
}));

vi.mock("../../billing/PremiumSignInGate", () => ({
  PremiumSignInGate: ({ continuePath }: { continuePath: string }) => (
    <div data-testid="premium-sign-in-gate">{continuePath}</div>
  ),
}));

const incidentState = vi.hoisted(() => ({
  list: [] as IncidentRecord[],
  byId: null as IncidentRecord | null,
  subscribeIncident: vi.fn(),
  joinSession: vi.fn(),
}));

vi.mock("../../../services/admin/adminIncidents", async () => {
  const actual = await vi.importActual<typeof import("../../../services/admin/adminIncidents")>(
    "../../../services/admin/adminIncidents",
  );
  return {
    ...actual,
    subscribeIncidentList: (onNext: (incidents: IncidentRecord[]) => void) => {
      onNext(incidentState.list);
      return () => undefined;
    },
    subscribeIncident: incidentState.subscribeIncident,
  };
});

const preloadState = vi.hoisted(() => ({
  list: [] as PreloadRequest[],
  emit: (_rows: PreloadRequest[]) => {},
}));

vi.mock("../../../services/admin/adminPreloadRequests", async () => {
  const actual = await vi.importActual<
    typeof import("../../../services/admin/adminPreloadRequests")
  >("../../../services/admin/adminPreloadRequests");
  return {
    ...actual,
    subscribePreloadRequestList: (onNext: (rows: PreloadRequest[]) => void) => {
      preloadState.emit = onNext;
      onNext(preloadState.list);
      return () => undefined;
    },
  };
});

vi.mock("../../../services/preloadRequest/preloadRequestApi", () => ({
  updatePreloadRequestStatus: vi.fn(async () => undefined),
}));

function makeRequest(overrides: Partial<PreloadRequest> = {}): PreloadRequest {
  return {
    id: "req-abc12345",
    createdAt: "2026-10-01T12:00:00Z",
    updatedAt: "2026-10-01T12:05:00Z",
    status: "open",
    reporterUid: "uid-1",
    presetSnapshot: { name: "Dublin core", gameSize: "medium", distanceUnit: "metric" },
    ...overrides,
  } as PreloadRequest;
}

vi.mock("../../../hooks/incident/useIncidentThread", () => ({
  useIncidentThread: (incidentId: string | null) => ({
    incident:
      incidentState.list.find((row) => row.id === incidentId) ??
      (incidentState.byId?.id === incidentId ? incidentState.byId : null),
    messages: [],
    error: null,
    sending: false,
    sendMessage: vi.fn(),
  }),
}));

vi.mock("firebase/auth", async (importOriginal) => ({
  ...(await importOriginal<typeof import("firebase/auth")>()),
  signOut: vi.fn(async () => {
    throw new Error("Sign-out network error");
  }),
}));

vi.mock("../../../services/core/firebase/firebase", () => ({
  isFirebaseConfigured: () => true,
  getFirebaseAuth: () => ({}),
  ensureAnonymousUser: vi.fn(async () => ({ uid: "anon-test" })),
}));

const sessionRowRenderCount = vi.hoisted(() => ({ value: 0 }));
const sessionRowRenders = () => sessionRowRenderCount.value;

vi.mock("./AdminSessionRow", async () => {
  const actual = await vi.importActual<typeof import("./AdminSessionRow")>("./AdminSessionRow");
  return {
    AdminSessionRow: (props: Parameters<typeof actual.AdminSessionRow>[0]) => {
      sessionRowRenderCount.value += 1;
      return <actual.AdminSessionRow {...props} />;
    },
  };
});

vi.mock("../../../hooks/admin/useAdminJoinSession", () => ({
  useAdminJoinSession: () => ({
    joinSession: incidentState.joinSession,
    joiningCode: null,
    error: null,
    setError: vi.fn(),
  }),
}));

vi.mock("../monitor/AdminMonitorPane", () => ({
  AdminMonitorPane: ({ active }: { active: boolean }) => (
    <div data-testid="admin-monitor-pane" data-active={active ? "true" : "false"} />
  ),
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
    sessionListState.lastFetchedAt = null;
    sessionListState.refresh.mockClear();
    sessionListState.loadMore.mockClear();
    incidentState.list = [];
    preloadState.list = [];
    incidentState.byId = null;
    incidentState.subscribeIncident.mockReset();
    incidentState.joinSession.mockReset();
    useSessionStore.getState().setSession(null, null);
  });

  it("shows skeleton rows while auth is loading", () => {
    authState.state = "loading";
    authState.authReady = false;
    authState.user = null;
    renderOpsDesk();

    const skeleton = document.querySelector(".mantine-Skeleton-root");
    expect(skeleton).toBeInTheDocument();
    expect(skeleton?.closest("[data-admin-world]")).not.toBeNull();
    expect(document.querySelectorAll("[data-admin-world]")).toHaveLength(1);
  });

  it("shows the sign-in gate for signed-out users", () => {
    authState.state = "unsigned";
    authState.authReady = true;
    authState.user = null;
    sessionListState.sessions = [];

    renderOpsDesk();

    expect(screen.getByText(/Sign in with your Google account/i)).toBeInTheDocument();
    expect(screen.getByTestId("premium-sign-in-gate")).toHaveTextContent("/admin");
    expect(screen.getByTestId("premium-sign-in-gate").closest("[data-admin-world]")).not.toBeNull();
    expect(document.querySelectorAll("[data-admin-world]")).toHaveLength(1);
  });

  it("titles the signed-out gate in source case", () => {
    authState.state = "unsigned";
    authState.authReady = true;
    authState.user = null;

    renderOpsDesk();

    const title = screen.getByRole("heading", { name: "Admin event centre" });
    expect(title.textContent).toBe("Admin event centre");
    expect(title.style.textTransform).toBe("");
    expect(title.closest("[data-admin-world]")).not.toBeNull();
  });

  it("shows access denied for non-admin permanent users", () => {
    authState.state = "denied";
    authState.authReady = true;
    authState.user = { email: "player@example.com", emailVerified: true };

    renderOpsDesk();

    expect(screen.getByRole("heading", { name: "Access denied" })).toBeInTheDocument();
    expect(screen.getByText("Restricted panel")).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "Sign out" })).toBeInTheDocument();
    expect(screen.getByRole("link", { name: "Back home" })).toHaveAttribute("href", "/");
    expect(
      screen.getByRole("heading", { name: "Access denied" }).closest("[data-admin-world]"),
    ).not.toBeNull();
    expect(document.querySelectorAll("[data-admin-world]")).toHaveLength(1);
  });

  it("shows a mispunch Alert in the admin world when sign-out fails", async () => {
    authState.state = "denied";
    authState.authReady = true;
    authState.user = { email: "player@example.com", emailVerified: true };

    renderOpsDesk();
    fireEvent.click(screen.getByRole("button", { name: "Sign out" }));

    const alert = await screen.findByRole("alert");
    expect(alert).toHaveAttribute("data-tone", "mispunch");
    expect(alert).toHaveClass("mantine-Alert-root");
    expect(within(alert).getByText("Sign-out failed")).toBeInTheDocument();
    expect(within(alert).getByText("Sign-out network error")).toBeInTheDocument();
    expect(alert.closest("[data-admin-world]")).not.toBeNull();
    expect(alert.style.getPropertyValue("--alert-color")).toBe("var(--adm-mispunch)");
  });

  it("renders the signed-in desk inside the admin world", () => {
    authState.state = "admin";
    authState.authReady = true;
    authState.user = { email: "admin@example.com", emailVerified: true };
    mockViewport(1440);

    renderOpsDesk();

    expect(screen.getByTestId("admin-ops-desk").closest("[data-admin-world]")).not.toBeNull();
    expect(document.querySelectorAll("[data-admin-world]")).toHaveLength(1);
  });

  it("opens settings in a drawer from the topbar", async () => {
    authState.state = "admin";
    authState.authReady = true;
    authState.user = { email: "admin@example.com", emailVerified: true };
    sessionListState.sessions = [];
    mockViewport(1440);

    renderOpsDesk();

    expect(screen.queryByTestId("admin-settings-panel")).not.toBeInTheDocument();
    fireEvent.click(screen.getByRole("button", { name: /^settings$/i }));

    const dialog = await screen.findByRole("dialog", { name: "Desk settings" });
    expect(dialog).toHaveClass("mantine-Drawer-content");
    expect(within(dialog).getByTestId("admin-settings-panel")).toBeInTheDocument();
  });

  it("shows data age in the strip after the list loads", () => {
    authState.state = "admin";
    authState.authReady = true;
    authState.user = { email: "admin@example.com", emailVerified: true };
    sessionListState.lastFetchedAt = new Date();
    mockViewport(1440);

    renderOpsDesk();

    expect(screen.getByText("Synced just now")).toBeInTheDocument();
  });

  it("shows Sync failed in the strip when the list errors", () => {
    authState.state = "admin";
    authState.authReady = true;
    authState.user = { email: "admin@example.com", emailVerified: true };
    sessionListState.lastFetchedAt = new Date();
    sessionListState.error = "Couldn't load live sessions.";
    mockViewport(1440);

    renderOpsDesk();

    expect(screen.getByText("Sync failed").closest("[data-tone]")).toHaveAttribute(
      "data-tone",
      "mispunch",
    );
    expect(screen.queryByText(/^Synced/)).not.toBeInTheDocument();
  });

  it("has no Settings option in the mobile bottom bar", () => {
    authState.state = "admin";
    authState.authReady = true;
    authState.user = { email: "admin@example.com", emailVerified: true };
    sessionListState.sessions = [];
    mockViewport(375);

    renderOpsDesk();

    expect(screen.getByRole("radio", { name: "Start list" })).toBeInTheDocument();
    expect(screen.queryByRole("radio", { name: "Settings" })).not.toBeInTheDocument();
    expect(screen.getByRole("button", { name: /^settings$/i })).toBeInTheDocument();
  });

  it("defaults Live on and shows no-live empty title when the list is empty", () => {
    authState.state = "admin";
    authState.authReady = true;
    authState.user = { email: "admin@example.com", emailVerified: true };
    sessionListState.loading = false;
    sessionListState.error = null;
    sessionListState.sessions = [];

    renderOpsDesk();

    expect(screen.getByRole("checkbox", { name: "Live" })).toBeChecked();
    expect(screen.getByText("No live sessions")).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "More filters" })).toHaveAttribute(
      "aria-expanded",
      "false",
    );
    expect(screen.queryByRole("checkbox", { name: "Singleplayer" })).not.toBeInTheDocument();
    expect(screen.queryByRole("checkbox", { name: "Hiding" })).not.toBeInTheDocument();
  });

  it("shows No sessions when Live is off and the list is empty", () => {
    authState.state = "admin";
    authState.authReady = true;
    authState.user = { email: "admin@example.com", emailVerified: true };
    sessionListState.loading = false;
    sessionListState.error = null;
    sessionListState.sessions = [];

    renderOpsDesk();

    fireEvent.click(screen.getByRole("checkbox", { name: "Live" }));

    expect(screen.getByRole("checkbox", { name: "Live" })).not.toBeChecked();
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
    expect(screen.queryByRole("checkbox", { name: "Live" })).not.toBeInTheDocument();
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
    expect(screen.getByRole("checkbox", { name: "Live" })).toBeInTheDocument();
    expect(screen.queryByText("No live sessions")).not.toBeInTheDocument();
    expect(screen.getByRole("button", { name: "More filters" })).toHaveAttribute(
      "aria-expanded",
      "false",
    );
    expect(screen.queryByRole("checkbox", { name: "Singleplayer" })).not.toBeInTheDocument();
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
    const row = screen
      .getByRole("button", { name: "Monitor ABCD, Dublin" })
      .closest("tr") as HTMLElement;
    expect(within(row).getAllByRole("cell")[2]).toHaveTextContent("2");
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
    mockViewport(1440);

    renderOpsDesk();

    const startList = screen.getByTestId("admin-ops-sessions");
    expect(startList.closest(".mantine-AppShell-navbar")).not.toBeNull();
    expect(within(startList).getByRole("table").closest(".mantine-ScrollArea-root")).not.toBeNull();
    expectStaticAppShell("desktop");
    expect(screen.queryByRole("radiogroup", { name: "Desk sections" })).toBeNull();
    expect(screen.getByRole("link", { name: /^home$/i })).toHaveAttribute("href", "/");
    expect(screen.queryByRole("banner", { name: /screen header/i })).toBeNull();
    expect(screen.queryByRole("link", { name: /←\s*back/i })).toBeNull();
  });

  it("keeps topbar Home on mobile without a ScreenHeader Back", () => {
    authState.state = "admin";
    authState.authReady = true;
    authState.user = { email: "admin@example.com", emailVerified: true };
    sessionListState.sessions = [];

    mockViewport(375);

    renderOpsDesk();

    expectStaticAppShell("mobile");
    expect(screen.getByRole("link", { name: /^home$/i })).toHaveAttribute("href", "/");
    expect(screen.queryByRole("banner", { name: /screen header/i })).toBeNull();
    expect(screen.queryByRole("link", { name: /←\s*back/i })).toBeNull();
  });

  function renderDeskRoutes(route: string) {
    renderOpsDesk(
      <Routes>
        <Route path="/admin" element={<AdminOpsDesk />} />
        <Route path="/admin/incidents" element={<AdminOpsDesk />} />
        <Route path="/admin/incidents/:incidentId" element={<AdminOpsDesk />} />
        <Route path="/admin/preload-requests" element={<AdminOpsDesk />} />
      </Routes>,
      route,
    );
  }

  function setAdmin() {
    authState.state = "admin";
    authState.authReady = true;
    authState.user = { email: "admin@example.com", emailVerified: true };
  }

  describe("preload requests", () => {
    it("opens only the Preload group in the three-region desk at 1440", () => {
      setAdmin();
      preloadState.list = [makeRequest()];
      mockViewport(1440);

      renderDeskRoutes("/admin/preload-requests");

      expect(screen.getByRole("region", { name: "Start list" })).toBeInTheDocument();
      expect(screen.getByRole("region", { name: "Course" })).toBeInTheDocument();
      const needsYou = screen.getByRole("region", { name: "Needs you" });
      expect(within(needsYou).getByRole("button", { name: "Preload requests" })).toHaveAttribute(
        "aria-expanded",
        "true",
      );
      expect(within(needsYou).getByRole("button", { name: "Incidents" })).toHaveAttribute(
        "aria-expanded",
        "false",
      );
    });

    it("drills into a request and shows its status actions", async () => {
      setAdmin();
      preloadState.list = [makeRequest()];
      mockViewport(1440);

      renderDeskRoutes("/admin/preload-requests");
      const panel = screen.getByRole("region", { name: "Preload requests" });
      fireEvent.click(within(panel).getByRole("button", { name: /Dublin core/ }));

      expect(await screen.findByRole("button", { name: "Back" })).toHaveFocus();
      expect(screen.getByRole("heading", { name: "Dublin core" })).toBeInTheDocument();
      expect(screen.getByRole("button", { name: "Mark accepted" })).toBeInTheDocument();
      expect(screen.getByRole("button", { name: "Mark shipped" })).toBeInTheDocument();
    });

    it("leaves the drill-in when its request disappears and does not re-drill later", async () => {
      setAdmin();
      const request = makeRequest();
      preloadState.list = [request];
      mockViewport(1440);

      renderDeskRoutes("/admin/preload-requests");
      fireEvent.click(
        within(screen.getByRole("region", { name: "Preload requests" })).getByRole("button", {
          name: /Dublin core/,
        }),
      );
      expect(await screen.findByRole("button", { name: "Back" })).toHaveFocus();

      act(() => preloadState.emit([]));
      expect(screen.getByRole("button", { name: "Preload requests" })).toHaveFocus();

      act(() => preloadState.emit([request]));
      expect(screen.queryByRole("button", { name: "Back" })).not.toBeInTheDocument();
      expect(screen.getByRole("region", { name: "Preload requests" })).toBeInTheDocument();
    });

    it("opens the Needs you drawer on the Preload item from the strip at 1280", async () => {
      setAdmin();
      preloadState.list = [makeRequest()];
      mockViewport(1280);

      renderDeskRoutes("/admin");
      expect(screen.queryByRole("dialog", { name: "Needs you" })).not.toBeInTheDocument();
      fireEvent.click(screen.getByRole("link", { name: "Preload requests" }));

      const dialog = await screen.findByRole("dialog", { name: "Needs you" });
      expect(within(dialog).getByRole("button", { name: "Preload requests" })).toHaveAttribute(
        "aria-expanded",
        "true",
      );
    });

    it("reopens the Needs you drawer from the strip's Preload item on the preload route at 1280", async () => {
      setAdmin();
      preloadState.list = [makeRequest()];
      mockViewport(1280);

      renderDeskRoutes("/admin/preload-requests");
      fireEvent.keyDown(await screen.findByRole("dialog", { name: "Needs you" }), {
        key: "Escape",
      });
      await waitFor(() =>
        expect(screen.queryByRole("dialog", { name: "Needs you" })).not.toBeInTheDocument(),
      );

      fireEvent.click(screen.getByRole("link", { name: "Preload requests" }));

      expect(await screen.findByRole("dialog", { name: "Needs you" })).toBeInTheDocument();
    });

    it("counts open incidents plus open preload requests in the strip", () => {
      setAdmin();
      incidentState.list = [makeIncident({ id: "inc-listed01" })];
      preloadState.list = [
        makeRequest({ id: "req-open1" }),
        makeRequest({ id: "req-open2", status: "accepted" }),
        makeRequest({ id: "req-done", status: "shipped" }),
      ];
      mockViewport(1280);

      renderDeskRoutes("/admin");

      expect(screen.getByRole("button", { name: "Needs you: 2 open" })).toBeInTheDocument();
    });

    it("leaves a preload drill-in on Escape before closing the drawer", async () => {
      setAdmin();
      preloadState.list = [makeRequest()];
      mockViewport(1280);

      renderDeskRoutes("/admin/preload-requests");
      const dialog = await screen.findByRole("dialog", { name: "Needs you" });
      fireEvent.click(within(dialog).getByRole("button", { name: /Dublin core/ }));
      expect(await within(dialog).findByRole("button", { name: "Mark accepted" })).toBeVisible();

      fireEvent.keyDown(screen.getByRole("dialog", { name: "Needs you" }), { key: "Escape" });

      expect(
        await within(screen.getByRole("dialog", { name: "Needs you" })).findByRole("region", {
          name: "Preload requests",
        }),
      ).toBeInTheDocument();
    });

    it("continues sign-in back to /admin/preload-requests", () => {
      authState.state = "unsigned";
      authState.authReady = true;
      authState.user = null;

      renderDeskRoutes("/admin/preload-requests");

      expect(screen.getByTestId("premium-sign-in-gate")).toHaveTextContent(
        "/admin/preload-requests",
      );
    });
  });

  it.each(["/admin", "/admin/incidents", "/admin/incidents/inc-listed01"])(
    "lays out Start list, Course, and Needs you on %s at 1440",
    (route) => {
      authState.state = "admin";
      authState.authReady = true;
      authState.user = { email: "admin@example.com", emailVerified: true };
      incidentState.list = [makeIncident({ id: "inc-listed01" })];
      mockViewport(1440);

      renderDeskRoutes(route);

      expect(screen.getByRole("region", { name: "Start list" })).toBeInTheDocument();
      expect(screen.getByRole("region", { name: "Course" })).toBeInTheDocument();
      expect(screen.getByRole("region", { name: "Needs you" })).toBeInTheDocument();
      expect(document.querySelector("[data-desk-mode]")).toBeNull();
      expect(document.querySelector(".mantine-AppShell-navbar")?.getAttribute("style")).toContain(
        "border-inline-end",
      );
      expect(document.querySelector(".mantine-AppShell-aside")?.getAttribute("style")).toContain(
        "border-inline-start",
      );
      expect(screen.queryByRole("button", { name: /^Needs you/ })).not.toBeInTheDocument();
    },
  );

  it("shows the selected incident's detail and actions inside Needs you", () => {
    authState.state = "admin";
    authState.authReady = true;
    authState.user = { email: "admin@example.com", emailVerified: true };
    incidentState.list = [makeIncident({ id: "inc-listed01" })];
    mockViewport(1440);

    renderDeskRoutes("/admin/incidents/inc-listed01");

    const needsYou = screen.getByRole("region", { name: "Needs you" });
    expect(within(needsYou).getByTestId("admin-incident-detail")).toBeInTheDocument();
    expect(
      within(needsYou).getByRole("complementary", { name: "Incident actions" }),
    ).toBeInTheDocument();
    expect(within(needsYou).queryByRole("region", { name: "Incidents" })).not.toBeInTheDocument();
  });

  it("opens the Incidents group on /admin/incidents and resets toggles on route change", async () => {
    authState.state = "admin";
    authState.authReady = true;
    authState.user = { email: "admin@example.com", emailVerified: true };
    incidentState.list = [makeIncident({ id: "inc-listed01" })];
    mockViewport(1440);

    renderDeskRoutes("/admin/incidents");

    const control = screen.getByRole("button", { name: "Incidents" });
    expect(control).toHaveAttribute("aria-expanded", "true");
    fireEvent.click(control);
    expect(screen.getByRole("button", { name: "Incidents" })).toHaveAttribute(
      "aria-expanded",
      "false",
    );

    fireEvent.click(screen.getByRole("link", { name: /event centre/i }));

    await waitFor(() =>
      expect(screen.getByRole("button", { name: "Incidents" })).toHaveAttribute(
        "aria-expanded",
        "true",
      ),
    );
  });

  it("closes Settings on Escape without leaving a drilled-in incident", async () => {
    authState.state = "admin";
    authState.authReady = true;
    authState.user = { email: "admin@example.com", emailVerified: true };
    incidentState.list = [makeIncident({ id: "inc-listed01" })];
    mockViewport(1440);

    renderDeskRoutes("/admin/incidents/inc-listed01");
    fireEvent.click(screen.getByRole("button", { name: /^settings$/i }));
    const settings = await screen.findByRole("dialog", { name: "Desk settings" });

    fireEvent.keyDown(settings, { key: "Escape" });

    await waitFor(() =>
      expect(screen.queryByRole("dialog", { name: "Desk settings" })).not.toBeInTheDocument(),
    );
    expect(screen.getByTestId("admin-incident-detail")).toBeInTheDocument();
  });

  it("returns from the drill-in to /admin/incidents with Back", async () => {
    authState.state = "admin";
    authState.authReady = true;
    authState.user = { email: "admin@example.com", emailVerified: true };
    incidentState.list = [makeIncident({ id: "inc-listed01" })];
    mockViewport(1440);

    renderDeskRoutes("/admin/incidents/inc-listed01");

    fireEvent.click(screen.getByRole("button", { name: "Back" }));

    expect(await screen.findByRole("region", { name: "Incidents" })).toBeInTheDocument();
    expect(screen.queryByTestId("admin-incident-detail")).not.toBeInTheDocument();
  });

  it("opens Needs you in a drawer from the strip between 1024 and 1439", async () => {
    authState.state = "admin";
    authState.authReady = true;
    authState.user = { email: "admin@example.com", emailVerified: true };
    incidentState.list = [makeIncident({ id: "inc-listed01" })];
    mockViewport(1280);

    renderDeskRoutes("/admin");

    expect(screen.getByRole("region", { name: "Start list" })).toBeInTheDocument();
    expect(screen.getByRole("region", { name: "Course" })).toBeInTheDocument();
    expect(screen.queryByRole("region", { name: "Needs you" })).not.toBeInTheDocument();
    expect(screen.queryByRole("region", { name: "Incidents" })).not.toBeInTheDocument();

    const trigger = screen.getByRole("button", { name: "Needs you: 1 open" });
    expect(trigger).toHaveAttribute("aria-haspopup", "dialog");
    trigger.focus();
    fireEvent.click(trigger);

    const dialog = await screen.findByRole("dialog", { name: "Needs you" });
    expect(dialog).toHaveClass("mantine-Drawer-content");
    const inbox = within(dialog).getByRole("region", { name: "Incidents" });

    fireEvent.click(
      within(inbox)
        .getByText(/7G2LJH/)
        .closest("button") as HTMLElement,
    );
    expect(
      await within(screen.getByRole("dialog", { name: "Needs you" })).findByTestId(
        "admin-incident-detail",
      ),
    ).toBeInTheDocument();

    fireEvent.keyDown(screen.getByRole("dialog", { name: "Needs you" }), { key: "Escape" });
    expect(
      await within(screen.getByRole("dialog", { name: "Needs you" })).findByRole("region", {
        name: "Incidents",
      }),
    ).toBeInTheDocument();

    fireEvent.keyDown(screen.getByRole("dialog", { name: "Needs you" }), { key: "Escape" });
    await waitFor(() =>
      expect(screen.queryByRole("dialog", { name: "Needs you" })).not.toBeInTheDocument(),
    );
    await waitFor(() =>
      expect(screen.getByRole("button", { name: "Needs you: 1 open" })).toHaveFocus(),
    );
  });

  it("opens the Needs you drawer on an incident deep link between 1024 and 1439", async () => {
    authState.state = "admin";
    authState.authReady = true;
    authState.user = { email: "admin@example.com", emailVerified: true };
    incidentState.list = [makeIncident({ id: "inc-listed01" })];
    mockViewport(1280);

    renderDeskRoutes("/admin/incidents/inc-listed01");

    const dialog = await screen.findByRole("dialog", { name: "Needs you" });
    expect(within(dialog).getByTestId("admin-incident-detail")).toBeInTheDocument();
  });

  it("opens the Needs you drawer on /admin/incidents between 1024 and 1439", async () => {
    authState.state = "admin";
    authState.authReady = true;
    authState.user = { email: "admin@example.com", emailVerified: true };
    incidentState.list = [makeIncident({ id: "inc-listed01" })];
    mockViewport(1280);

    renderDeskRoutes("/admin/incidents");

    expect(await screen.findByRole("dialog", { name: "Needs you" })).toBeInTheDocument();
  });

  describe("incident deep link", () => {
    function setDesktopAdmin() {
      authState.state = "admin";
      authState.authReady = true;
      authState.user = { email: "admin@example.com", emailVerified: true };
      sessionListState.sessions = [];
      mockViewport(1440);
    }

    function renderIncidentRoute(incidentId: string) {
      renderOpsDesk(
        <Routes>
          <Route path="/admin/incidents/:incidentId" element={<AdminOpsDesk />} />
        </Routes>,
        `/admin/incidents/${incidentId}`,
      );
    }

    it("selects an incident from the list without a by-id subscription", () => {
      setDesktopAdmin();
      incidentState.list = [makeIncident({ id: "inc-listed01" })];

      renderIncidentRoute("inc-listed01");

      expect(screen.getByRole("button", { name: "Back" })).toBeInTheDocument();
      expect(
        within(screen.getByTestId("admin-incident-detail")).getByText("inc-listed01"),
      ).toBeInTheDocument();
      const actions = screen.getByRole("complementary", { name: "Incident actions" });
      expect(within(actions).getByRole("button", { name: "Resolve" })).toBeInTheDocument();
      expect(incidentState.subscribeIncident).not.toHaveBeenCalled();
    });

    const outside = makeIncident({
      id: "inc-outside1",
      sessionId: "sess-outside",
      sessionCode: "ZZ99QQ",
    });

    function serveById(incident: IncidentRecord | null) {
      incidentState.byId = incident;
      incidentState.subscribeIncident.mockImplementation(
        (_id: string, onChange: (next: IncidentRecord | null) => void) => {
          onChange(incident);
          return () => undefined;
        },
      );
    }

    it("fetches an incident outside the list by id and monitors its live session", async () => {
      setDesktopAdmin();
      sessionListState.sessions = [
        {
          sessionId: "sess-outside",
          code: "ZZ99QQ",
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
          gameAreaLabel: null,
          lastActivityAt: null,
          lastLocationAt: null,
          lastAnnotationAt: null,
          activeAnnotationCount: 0,
          mode: "multiplayer",
          isLive: true,
          liveMultiplayer: true,
        },
      ];
      serveById(outside);

      renderIncidentRoute("inc-outside1");

      expect(incidentState.subscribeIncident).toHaveBeenCalledWith(
        "inc-outside1",
        expect.any(Function),
        expect.any(Function),
      );
      expect(screen.getByRole("button", { name: "Back" })).toBeInTheDocument();
      const actions = screen.getByRole("complementary", { name: "Incident actions" });
      expect(await within(actions).findByRole("button", { name: "Resolve" })).toBeInTheDocument();
      await waitFor(() =>
        expect(incidentState.joinSession).toHaveBeenCalledWith(
          expect.objectContaining({ sessionId: "sess-outside", code: "ZZ99QQ" }),
          { navigate: false },
        ),
      );
    });

    it("does not auto-join a fetched incident whose session is not live", async () => {
      setDesktopAdmin();
      serveById(outside);

      renderIncidentRoute("inc-outside1");

      const actions = screen.getByRole("complementary", { name: "Incident actions" });
      expect(await within(actions).findByRole("button", { name: "Resolve" })).toBeInTheDocument();
      expect(incidentState.joinSession).not.toHaveBeenCalled();
    });

    it("offers no actions when the deep-linked incident does not exist", () => {
      setDesktopAdmin();
      serveById(null);

      renderIncidentRoute("inc-missing1");

      const actions = screen.getByRole("complementary", { name: "Incident actions" });
      expect(within(actions).queryByRole("button", { name: "Resolve" })).toBeNull();
      expect(incidentState.joinSession).not.toHaveBeenCalled();
    });
  });

  describe("mobile desk", () => {
    function renderMobile(route: string) {
      authState.state = "admin";
      authState.authReady = true;
      authState.user = { email: "admin@example.com", emailVerified: true };
      sessionListState.sessions = [];
      mockViewport(375);
      renderOpsDesk(
        <Routes>
          <Route path="/admin" element={<AdminOpsDesk />} />
          <Route path="/admin/incidents" element={<AdminOpsDesk />} />
          <Route path="/admin/incidents/:incidentId" element={<AdminOpsDesk />} />
          <Route path="/admin/preload-requests" element={<AdminOpsDesk />} />
        </Routes>,
        route,
      );
    }

    it("shows preload requests under Needs you on /admin/preload-requests", () => {
      preloadState.list = [makeRequest()];
      renderMobile("/admin/preload-requests");

      expect(screen.getByRole("radio", { name: "Needs you" })).toBeChecked();
      expect(
        within(screen.getByRole("region", { name: "Preload requests" })).getByText("Dublin core"),
      ).toBeInTheDocument();
    });

    it("has a bottom bar with exactly Start list and Needs you", () => {
      renderMobile("/admin");

      const bar = screen.getByRole("radiogroup", { name: "Desk sections" });
      expect(bar.closest("footer")).not.toBeNull();
      const labels = within(bar)
        .getAllByRole<HTMLInputElement>("radio")
        .map((option) => option.labels?.[0]);
      expect(labels.map((label) => label?.textContent)).toEqual(["Start list", "Needs you"]);
      // Spec #9: 44px touch targets.
      for (const label of labels) {
        expect(label?.style.minHeight).toBe("2.75rem");
      }
    });

    it("shows the session list on /admin", () => {
      renderMobile("/admin");

      expect(screen.getByRole("radio", { name: "Start list" })).toBeChecked();
      expect(screen.getByTestId("admin-ops-sessions")).toBeInTheDocument();
      expect(screen.queryByRole("region", { name: "Incidents" })).not.toBeInTheDocument();
    });

    it("shows the inbox alone on /admin/incidents", () => {
      renderMobile("/admin/incidents");

      expect(screen.getByRole("radio", { name: "Needs you" })).toBeChecked();
      expect(screen.getByRole("region", { name: "Incidents" })).toBeInTheDocument();
      expect(screen.queryByTestId("admin-incident-detail")).not.toBeInTheDocument();
      expect(screen.queryByTestId("admin-ops-sessions")).not.toBeInTheDocument();
    });

    it("drills into detail and actions for a selected incident, with Back to the queue", async () => {
      incidentState.list = [makeIncident({ id: "inc-listed01" })];
      renderMobile("/admin/incidents/inc-listed01");

      expect(screen.queryByRole("region", { name: "Incidents" })).not.toBeInTheDocument();
      expect(
        within(screen.getByTestId("admin-incident-detail")).getByText("inc-listed01"),
      ).toBeInTheDocument();
      const actions = screen.getByRole("complementary", { name: "Incident actions" });
      expect(within(actions).getByRole("button", { name: "Resolve" })).toBeInTheDocument();

      fireEvent.click(screen.getByRole("button", { name: "Back" }));

      expect(await screen.findByRole("region", { name: "Incidents" })).toBeInTheDocument();
      expect(screen.queryByTestId("admin-incident-detail")).not.toBeInTheDocument();
    });

    it("opens an incident from the inbox", async () => {
      incidentState.list = [makeIncident({ id: "inc-listed01" })];
      renderMobile("/admin/incidents");

      const inbox = screen.getByRole("region", { name: "Incidents" });
      const row = within(inbox)
        .getByText(/7G2LJH/)
        .closest("button");
      expect(row).not.toBeNull();
      fireEvent.click(row as HTMLElement);

      expect(await screen.findByTestId("admin-incident-detail")).toBeInTheDocument();
      expect(screen.getByRole("button", { name: "Back" })).toBeInTheDocument();
    });

    it("switches sections by route", async () => {
      renderMobile("/admin");

      fireEvent.click(screen.getByRole("radio", { name: "Needs you" }));
      expect(await screen.findByRole("region", { name: "Incidents" })).toBeInTheDocument();

      fireEvent.click(screen.getByRole("radio", { name: "Start list" }));
      expect(await screen.findByTestId("admin-ops-sessions")).toBeInTheDocument();
    });
  });

  it("does not re-render session rows on clock ticks", async () => {
    authState.state = "admin";
    authState.authReady = true;
    authState.user = { email: "admin@example.com", emailVerified: true };
    sessionListState.sessions = [makeLiveSession()];
    mockViewport(1440);
    vi.useFakeTimers();
    try {
      renderOpsDesk(<AdminOpsDesk />, "/admin");
      const before = sessionRowRenders();
      const deskBefore = deskRenderCount.value;
      expect(before).toBeGreaterThan(0);
      await act(() => vi.advanceTimersByTimeAsync(3000));
      expect(sessionRowRenders()).toBe(before);
      expect(deskRenderCount.value).toBe(deskBefore);
    } finally {
      vi.useRealTimers();
    }
  });

  it("feeds live games and runners from live sessions into the status strip", () => {
    authState.state = "admin";
    authState.authReady = true;
    authState.user = { email: "admin@example.com", emailVerified: true };
    sessionListState.sessions = [
      makeLiveSession({ sessionId: "s1", memberCount: 3 }),
      makeLiveSession({ sessionId: "s2", memberCount: 4 }),
      makeLiveSession({ sessionId: "s3", memberCount: 9, isLive: false }),
    ];
    incidentState.list = [
      makeIncident({ id: "inc-open", status: "open" }),
      makeIncident({ id: "inc-done", status: "resolved" }),
    ];
    mockViewport(1440);

    renderOpsDesk();

    expect(screen.getByLabelText("Live games")).toHaveTextContent("2");
    expect(screen.getByLabelText("Runners")).toHaveTextContent("7");
    expect(screen.getByRole("group", { name: "Needs you" })).toHaveTextContent("1");
  });

  it("counts open incidents per session in the start list MP column", () => {
    authState.state = "admin";
    authState.authReady = true;
    authState.user = { email: "admin@example.com", emailVerified: true };
    sessionListState.sessions = [makeLiveSession({ sessionId: "sess-1" })];
    incidentState.list = [
      makeIncident({ id: "inc-a", status: "open" }),
      makeIncident({ id: "inc-b", status: "chatting" }),
      makeIncident({ id: "inc-c", status: "resolved" }),
    ];
    mockViewport(1440);

    renderOpsDesk();

    const row = screen
      .getByRole("button", { name: "Monitor ABCD, Dublin" })
      .closest("tr") as HTMLElement;
    expect(within(row).getAllByRole("cell")[4]).toHaveTextContent("2");
  });

  it("does not rejoin when Monitor is activated on the monitored session", async () => {
    authState.state = "admin";
    authState.authReady = true;
    authState.user = { email: "admin@example.com", emailVerified: true };
    sessionListState.sessions = [makeLiveSession()];
    mockViewport(1440);
    incidentState.joinSession.mockImplementation(
      async (summary: Pick<AdminSessionSummary, "sessionId" | "code">) => {
        useSessionStore.getState().setSession(
          createTestRemoteSession({
            id: summary.sessionId,
            code: summary.code,
            memberUids: ["admin-1"],
            memberRoles: { "admin-1": "admin" },
          }),
          "admin-1",
        );
        return true;
      },
    );

    renderOpsDesk();

    fireEvent.click(screen.getByRole("button", { name: "Monitor ABCD, Dublin" }));
    await waitFor(() =>
      expect(screen.getByTestId("admin-monitor-pane")).toHaveAttribute("data-active", "true"),
    );

    fireEvent.click(screen.getByRole("button", { name: "Monitor ABCD, Dublin" }));
    await act(async () => {
      await Promise.resolve();
    });

    expect(incidentState.joinSession).toHaveBeenCalledTimes(1);
    expect(screen.getByTestId("admin-monitor-pane")).toHaveAttribute("data-active", "true");
  });

  it("leaves the incident drill-in from the strip event centre link on desktop", async () => {
    authState.state = "admin";
    authState.authReady = true;
    authState.user = { email: "admin@example.com", emailVerified: true };
    sessionListState.sessions = [];
    incidentState.list = [makeIncident({ id: "inc-listed01" })];
    mockViewport(1440);

    renderDeskRoutes("/admin/incidents/inc-listed01");

    expect(screen.getByTestId("admin-incident-detail")).toBeInTheDocument();
    fireEvent.click(screen.getByRole("link", { name: /event centre/i }));

    await waitFor(() => expect(screen.queryByTestId("admin-incident-detail")).toBeNull());
    expect(screen.getByRole("region", { name: "Needs you" })).toBeInTheDocument();
  });

  it("clears retired desk layout storage on mount", () => {
    authState.state = "admin";
    authState.authReady = true;
    authState.user = { email: "admin@example.com", emailVerified: true };
    sessionListState.sessions = [];
    localStorage.setItem("jetlag.adminOpsDesk.v1", "{}");
    localStorage.setItem("jetlag.adminOpsDesk.v1:uid-admin", "{}");

    renderOpsDesk();

    expect(localStorage.getItem("jetlag.adminOpsDesk.v1")).toBeNull();
    expect(localStorage.getItem("jetlag.adminOpsDesk.v1:uid-admin")).toBeNull();
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
    expect(screen.getByRole("checkbox", { name: "Live" })).toBeChecked();
    expect(screen.getByText("No matching sessions")).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "Load more sessions" })).toBeInTheDocument();
  });
});
