import { MantineProvider } from "@mantine/core";
import { act, fireEvent, screen, waitFor, within } from "@testing-library/react";
import type { ReactElement } from "react";
import { Route, Routes } from "react-router-dom";
import { afterEach, describe, expect, it, vi } from "vitest";
import type { IncidentRecord } from "../../../domain/incident/incidentTypes";
import type { AdminSessionSummary } from "../../../services/admin/adminSessions";
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

function mockViewport(desktop: boolean) {
  Object.defineProperty(window, "matchMedia", {
    writable: true,
    value: vi.fn().mockImplementation((query: string) => ({
      matches: desktop && query === "(min-width: 1024px)",
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

const SEEKER_HIDER_META = /1S \/ 1H/i;

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
    incidentState.list = [];
    incidentState.byId = null;
    incidentState.subscribeIncident.mockReset();
    incidentState.joinSession.mockReset();
  });

  it("shows skeleton rows while auth is loading", () => {
    authState.state = "loading";
    authState.authReady = false;
    authState.user = null;
    renderOpsDesk();

    const skeleton = document.querySelector(".mantine-Skeleton-root");
    expect(skeleton).toBeInTheDocument();
    expect(skeleton?.closest("[data-admin-world]")).not.toBeNull();
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
  });

  it("titles the signed-out gate in source case", () => {
    authState.state = "unsigned";
    authState.authReady = true;
    authState.user = null;

    renderOpsDesk();

    const title = screen.getByRole("heading", { name: "Admin event centre" });
    expect(title.textContent).toBe("Admin event centre");
    expect(title.style.textTransform).toBe("");
    expect(getComputedStyle(title).textTransform).not.toBe("uppercase");
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
  });

  it("renders the signed-in desk inside the admin world", () => {
    authState.state = "admin";
    authState.authReady = true;
    authState.user = { email: "admin@example.com", emailVerified: true };
    mockViewport(true);

    renderOpsDesk();

    expect(screen.getByTestId("admin-ops-desk").closest("[data-admin-world]")).not.toBeNull();
    expect(document.querySelectorAll("[data-admin-world]")).toHaveLength(1);
  });

  it("opens settings in a dialog from the topbar", async () => {
    authState.state = "admin";
    authState.authReady = true;
    authState.user = { email: "admin@example.com", emailVerified: true };
    sessionListState.sessions = [];
    mockViewport(true);

    renderOpsDesk();

    expect(screen.queryByTestId("admin-settings-panel")).not.toBeInTheDocument();
    fireEvent.click(screen.getByRole("button", { name: /^settings$/i }));

    const dialog = await screen.findByRole("dialog", { name: "Desk settings" });
    expect(within(dialog).getByTestId("admin-settings-panel")).toBeInTheDocument();
  });

  it("has no Settings tab in the mobile panel picker", () => {
    authState.state = "admin";
    authState.authReady = true;
    authState.user = { email: "admin@example.com", emailVerified: true };
    sessionListState.sessions = [];
    mockViewport(false);

    renderOpsDesk();

    expect(screen.getByRole("tab", { name: "Sessions" })).toBeInTheDocument();
    expect(screen.queryByRole("tab", { name: "Settings" })).not.toBeInTheDocument();
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
    mockViewport(true);

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

    mockViewport(false);

    renderOpsDesk();

    expectStaticAppShell("mobile");
    expect(screen.getByRole("link", { name: /^home$/i })).toHaveAttribute("href", "/");
    expect(screen.queryByRole("banner", { name: /screen header/i })).toBeNull();
    expect(screen.queryByRole("link", { name: /←\s*back/i })).toBeNull();
  });

  it("sets data-desk-mode to sessions on /admin desktop", () => {
    authState.state = "admin";
    authState.authReady = true;
    authState.user = { email: "admin@example.com", emailVerified: true };
    sessionListState.sessions = [];
    mockViewport(true);

    renderOpsDesk(<AdminOpsDesk />, "/admin");

    const desk = screen.getByTestId("admin-fixed-desk");
    expect(desk).toHaveAttribute("data-desk-mode", "sessions");
    expect(screen.getByTestId("admin-ops-sessions")).toBeInTheDocument();
    expect(screen.queryByRole("region", { name: "Incidents" })).not.toBeInTheDocument();
  });

  it("sets data-desk-mode to incidents on /admin/incidents desktop", () => {
    authState.state = "admin";
    authState.authReady = true;
    authState.user = { email: "admin@example.com", emailVerified: true };
    sessionListState.sessions = [];
    mockViewport(true);

    renderOpsDesk(<AdminOpsDesk />, "/admin/incidents");

    const desk = screen.getByTestId("admin-fixed-desk");
    expect(desk).toHaveAttribute("data-desk-mode", "incidents");
    expect(screen.getByRole("region", { name: "Incidents" })).toBeInTheDocument();
    expect(screen.getByTestId("admin-ops-sessions")).toBeInTheDocument();
    expect(screen.getByTestId("admin-incident-inbox-empty")).toBeInTheDocument();
    expect(screen.getByTestId("admin-incident-detail")).toBeInTheDocument();
    expect(screen.getByRole("complementary", { name: "Incident actions" })).toBeInTheDocument();
  });

  it("labels each incidents pane without a visible Incidents heading", () => {
    authState.state = "admin";
    authState.authReady = true;
    authState.user = { email: "admin@example.com", emailVerified: true };
    sessionListState.sessions = [];
    mockViewport(true);

    renderOpsDesk(<AdminOpsDesk />, "/admin/incidents");

    const incidents = screen.getByRole("region", { name: "Incidents" });
    expect(within(incidents).getByRole("region", { name: "Incident queue" })).toBeInTheDocument();
    expect(within(incidents).getByRole("region", { name: "Incident detail" })).toBeInTheDocument();
    expect(
      within(incidents).getByRole("complementary", { name: "Incident actions" }),
    ).toBeInTheDocument();
    expect(screen.queryByRole("heading", { name: "Incidents" })).not.toBeInTheDocument();
  });

  describe("incident deep link", () => {
    function setDesktopAdmin() {
      authState.state = "admin";
      authState.authReady = true;
      authState.user = { email: "admin@example.com", emailVerified: true };
      sessionListState.sessions = [];
      mockViewport(true);
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

      const inbox = screen.getByRole("region", { name: "Incident queue" });
      expect(inbox.querySelector('[aria-current="true"]')).not.toBeNull();
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
      mockViewport(false);
      renderOpsDesk(
        <Routes>
          <Route path="/admin" element={<AdminOpsDesk />} />
          <Route path="/admin/incidents" element={<AdminOpsDesk />} />
          <Route path="/admin/incidents/:incidentId" element={<AdminOpsDesk />} />
        </Routes>,
        route,
      );
    }

    it("offers only Sessions and Incidents tabs", () => {
      renderMobile("/admin");

      expect(screen.getAllByRole("tab").map((tab) => tab.textContent)).toEqual([
        "Sessions",
        "Incidents",
      ]);
    });

    it("shows the session list on /admin", () => {
      renderMobile("/admin");

      expect(screen.getByRole("tab", { name: "Sessions" })).toHaveAttribute(
        "aria-selected",
        "true",
      );
      expect(screen.getByTestId("admin-ops-sessions")).toBeInTheDocument();
      expect(screen.queryByRole("region", { name: "Incident queue" })).not.toBeInTheDocument();
    });

    it("shows the inbox alone on /admin/incidents", () => {
      renderMobile("/admin/incidents");

      expect(screen.getByRole("tab", { name: "Incidents" })).toHaveAttribute(
        "aria-selected",
        "true",
      );
      expect(screen.getByRole("region", { name: "Incident queue" })).toBeInTheDocument();
      expect(screen.queryByTestId("admin-incident-detail")).not.toBeInTheDocument();
      expect(screen.queryByTestId("admin-ops-sessions")).not.toBeInTheDocument();
    });

    it("drills into detail and actions for a selected incident, with Back to the inbox", async () => {
      incidentState.list = [makeIncident({ id: "inc-listed01" })];
      renderMobile("/admin/incidents/inc-listed01");

      expect(screen.queryByRole("region", { name: "Incident queue" })).not.toBeInTheDocument();
      expect(
        within(screen.getByTestId("admin-incident-detail")).getByText("inc-listed01"),
      ).toBeInTheDocument();
      const actions = screen.getByRole("complementary", { name: "Incident actions" });
      expect(within(actions).getByRole("button", { name: "Resolve" })).toBeInTheDocument();

      fireEvent.click(screen.getByRole("button", { name: "Back to inbox" }));

      expect(await screen.findByRole("region", { name: "Incident queue" })).toBeInTheDocument();
      expect(screen.queryByTestId("admin-incident-detail")).not.toBeInTheDocument();
    });

    it("opens an incident from the inbox", async () => {
      incidentState.list = [makeIncident({ id: "inc-listed01" })];
      renderMobile("/admin/incidents");

      const inbox = screen.getByRole("region", { name: "Incident queue" });
      const row = within(inbox)
        .getByText(/7G2LJH/)
        .closest("button");
      expect(row).not.toBeNull();
      fireEvent.click(row as HTMLElement);

      expect(await screen.findByTestId("admin-incident-detail")).toBeInTheDocument();
      expect(screen.getByRole("button", { name: "Back to inbox" })).toBeInTheDocument();
    });

    it("switches tabs by route", async () => {
      renderMobile("/admin");

      fireEvent.click(screen.getByRole("tab", { name: "Incidents" }));
      expect(await screen.findByRole("region", { name: "Incident queue" })).toBeInTheDocument();

      fireEvent.click(screen.getByRole("tab", { name: "Sessions" }));
      expect(await screen.findByTestId("admin-ops-sessions")).toBeInTheDocument();
    });
  });

  it("does not re-render session rows on clock ticks", async () => {
    authState.state = "admin";
    authState.authReady = true;
    authState.user = { email: "admin@example.com", emailVerified: true };
    sessionListState.sessions = [makeLiveSession()];
    mockViewport(true);
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
    mockViewport(true);

    renderOpsDesk();

    expect(screen.getByLabelText("Live games")).toHaveTextContent("2");
    expect(screen.getByLabelText("Runners")).toHaveTextContent("7");
    expect(screen.getByLabelText("Needs you")).toHaveTextContent("1");
  });

  it("returns to sessions mode from the strip event centre link on desktop", async () => {
    authState.state = "admin";
    authState.authReady = true;
    authState.user = { email: "admin@example.com", emailVerified: true };
    sessionListState.sessions = [];
    mockViewport(true);

    renderOpsDesk(<AdminOpsDesk />, "/admin/incidents");

    expect(screen.getByTestId("admin-fixed-desk")).toHaveAttribute("data-desk-mode", "incidents");
    fireEvent.click(screen.getByRole("link", { name: /event centre/i }));

    await waitFor(() =>
      expect(screen.getByTestId("admin-fixed-desk")).toHaveAttribute("data-desk-mode", "sessions"),
    );
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
    expect(screen.getByRole("button", { name: "Live" })).toHaveAttribute("aria-pressed", "true");
    expect(screen.getByText("No matching sessions")).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "Load more sessions" })).toBeInTheDocument();
  });
});
