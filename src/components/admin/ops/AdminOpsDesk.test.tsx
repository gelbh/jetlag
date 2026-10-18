import { MantineProvider } from "@mantine/core";
import { act, fireEvent, screen, waitFor, within } from "@testing-library/react";
import type { ReactElement } from "react";
import { Route, Routes, useLocation } from "react-router-dom";
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
    presetSnapshot: {
      name: "Dublin core",
      placeLabel: "Dublin, Ireland",
      gameSize: "medium",
      distanceUnit: "metric",
      gameAreaBytes: 412_000,
    },
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

vi.mock("../../../hooks/admin/useAdminJoinSession", () => ({
  useAdminJoinSession: () => ({
    joinSession: incidentState.joinSession,
    joiningCode: null,
    error: null,
    setError: vi.fn(),
  }),
}));

vi.mock("../monitor/AdminMonitorPane", () => ({
  AdminMonitorPane: ({
    active,
    errorMessage,
    joining,
  }: {
    active: boolean;
    errorMessage?: string | null;
    joining?: boolean;
  }) => (
    <div
      data-testid="admin-monitor-pane"
      data-active={active ? "true" : "false"}
      data-joining={joining ? "true" : "false"}
    >
      {errorMessage}
    </div>
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
    localStorage.clear();
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

  describe("desk layout and routes", () => {
    function setAdmin() {
      authState.state = "admin";
      authState.authReady = true;
      authState.user = { email: "admin@example.com", emailVerified: true };
    }

    function PathProbe() {
      return <div data-testid="path">{useLocation().pathname}</div>;
    }

    function renderDesk(route: string, width = 1440) {
      setAdmin();
      mockViewport(width);
      return renderOpsDesk(
        <>
          <Routes>
            <Route path="/admin" element={<AdminOpsDesk />} />
            <Route path="/admin/sessions/:sessionId" element={<AdminOpsDesk />} />
            <Route path="/admin/incidents" element={<AdminOpsDesk />} />
            <Route path="/admin/incidents/:incidentId" element={<AdminOpsDesk />} />
            <Route path="/admin/preload-requests" element={<AdminOpsDesk />} />
            <Route path="/admin/preload-requests/:requestId" element={<AdminOpsDesk />} />
          </Routes>
          <PathProbe />
        </>,
        route,
      );
    }

    const path = () => screen.getByTestId("path").textContent;
    const twoSessions = () => [
      makeLiveSession(),
      makeLiveSession({ sessionId: "session-2", code: "EFGH", gameAreaLabel: "Tokyo" }),
    ];

    it("shows the expanded table on /admin with Sessions and Needs you tabs", () => {
      sessionListState.sessions = twoSessions();
      incidentState.list = [makeIncident({ id: "inc-a", sessionId: "session-1" })];

      renderDesk("/admin");

      expect(screen.getByTestId("admin-ops-desk")).toHaveAttribute("data-layout", "desktop");
      expect(screen.getByRole("radio", { name: "Sessions 2" })).toBeChecked();
      expect(screen.getByRole("radio", { name: /Needs you\s*1/ })).not.toBeChecked();
      const table = screen.getByRole("table");
      expect(within(table).getAllByRole("row")).toHaveLength(3);
      expect(within(table).getByText("ABCD")).toBeInTheDocument();
      expect(screen.queryByTestId("admin-session-view")).not.toBeInTheDocument();
      expect(screen.queryByRole("button", { name: "Expand to table" })).not.toBeInTheDocument();
    });

    it("counts open incidents in the Open incidents column", () => {
      sessionListState.sessions = [makeLiveSession({ sessionId: "sess-1" })];
      incidentState.list = [
        makeIncident({ id: "inc-a", status: "open" }),
        makeIncident({ id: "inc-b", status: "chatting" }),
        makeIncident({ id: "inc-c", status: "resolved" }),
      ];

      renderDesk("/admin");

      expect(screen.getByText("2 open")).toBeInTheDocument();
    });

    it("feeds live games, players and Needs you into the status strip", () => {
      sessionListState.sessions = [
        makeLiveSession({ sessionId: "s1", memberCount: 3 }),
        makeLiveSession({ sessionId: "s2", memberCount: 4 }),
        makeLiveSession({ sessionId: "s3", memberCount: 9, isLive: false }),
      ];
      incidentState.list = [
        makeIncident({ id: "inc-open", status: "open" }),
        makeIncident({ id: "inc-done", status: "resolved" }),
      ];

      renderDesk("/admin");

      expect(screen.getByLabelText("Live games")).toHaveTextContent("2");
      expect(screen.getByLabelText("Players")).toHaveTextContent("7");
      expect(screen.getByRole("group", { name: "Needs you" })).toHaveTextContent("1");
    });

    it("opens a session row on its own route, folding the table into the sidebar", async () => {
      sessionListState.sessions = twoSessions();

      renderDesk("/admin");
      fireEvent.click(within(screen.getByRole("table")).getByText("ABCD"));

      await waitFor(() => expect(path()).toBe("/admin/sessions/session-1"));
      expect(screen.queryByRole("table")).not.toBeInTheDocument();
      const open = screen.getByRole("button", { name: "Open session ABCD" });
      expect(open).toHaveAttribute("aria-current", "true");
      expect(screen.getByRole("button", { name: "Open session EFGH" })).toBeInTheDocument();
      const header = screen.getByRole("region", { name: "Session" });
      expect(within(header).getByText("ABCD")).toBeInTheDocument();
      expect(within(header).getByText("Dublin")).toBeInTheDocument();
      expect(within(header).getByText(/1 seeker · 1 hider/)).toBeInTheDocument();
      expect(within(header).getByRole("button", { name: "Moderate…" })).toBeInTheDocument();
      expect(screen.getByTestId("admin-monitor-pane")).toBeInTheDocument();
    });

    it("expands back to the table with the row selected", async () => {
      sessionListState.sessions = twoSessions();

      renderDesk("/admin/sessions/session-2");
      fireEvent.click(screen.getByRole("button", { name: "Expand to table" }));

      await waitFor(() => expect(path()).toBe("/admin"));
      const selected = screen
        .getAllByRole("row")
        .filter((row) => row.getAttribute("aria-current") === "true");
      expect(selected).toHaveLength(1);
      expect(selected[0]).toHaveTextContent("EFGH");
    });

    it("returns to the table on Escape, but not while a dialog is open or in a field", async () => {
      sessionListState.sessions = twoSessions();

      const { unmount } = renderDesk("/admin/sessions/session-1");
      const dialog = document.createElement("div");
      dialog.setAttribute("role", "dialog");
      document.body.appendChild(dialog);
      fireEvent.keyDown(document.body, { key: "Escape" });
      await act(async () => {
        await Promise.resolve();
      });
      expect(path()).toBe("/admin/sessions/session-1");
      dialog.remove();

      fireEvent.keyDown(document.body, { key: "Escape" });
      await waitFor(() => expect(path()).toBe("/admin"));
      unmount();

      renderDesk("/admin/sessions/session-1");
      const input = document.createElement("input");
      document.body.appendChild(input);
      input.focus();
      fireEvent.keyDown(input, { key: "Escape" });
      await act(async () => {
        await Promise.resolve();
      });
      expect(path()).toBe("/admin/sessions/session-1");
      input.remove();
    });

    it("reopens the last opened item from the collapse control", async () => {
      sessionListState.sessions = twoSessions();

      renderDesk("/admin");
      expect(screen.queryByRole("button", { name: "Collapse to sidebar" })).toBeNull();
      fireEvent.click(within(screen.getByRole("table")).getByText("EFGH"));
      await waitFor(() => expect(path()).toBe("/admin/sessions/session-2"));
      fireEvent.click(screen.getByRole("button", { name: "Expand to table" }));
      await waitFor(() => expect(path()).toBe("/admin"));

      fireEvent.click(screen.getByRole("button", { name: "Collapse to sidebar" }));
      await waitFor(() => expect(path()).toBe("/admin/sessions/session-2"));
    });

    it("joins the monitor on the session route, once, for the route's session", async () => {
      sessionListState.sessions = twoSessions();

      const { rerender } = renderDesk("/admin/sessions/session-2");

      await waitFor(() =>
        expect(incidentState.joinSession).toHaveBeenCalledWith(
          expect.objectContaining({ sessionId: "session-2", code: "EFGH" }),
          { navigate: false },
        ),
      );
      sessionListState.sessions = twoSessions();
      rerender(<div />);
      expect(incidentState.joinSession).toHaveBeenCalledTimes(1);
    });

    it("activates the monitor once the join lands an admin session", async () => {
      sessionListState.sessions = twoSessions();
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

      renderDesk("/admin/sessions/session-1");

      await waitFor(() =>
        expect(screen.getByTestId("admin-monitor-pane")).toHaveAttribute("data-active", "true"),
      );
      expect(incidentState.joinSession).toHaveBeenCalledTimes(1);
    });

    it("keeps the monitor inactive and offers the error when the join fails", async () => {
      sessionListState.sessions = twoSessions();
      incidentState.joinSession.mockResolvedValue(false);

      renderDesk("/admin/sessions/session-1");

      await waitFor(() => expect(incidentState.joinSession).toHaveBeenCalledTimes(1));
      await waitFor(() =>
        expect(screen.getByTestId("admin-monitor-pane")).toHaveTextContent(/Couldn't open the map/),
      );
      expect(screen.getByTestId("admin-monitor-pane")).toHaveAttribute("data-active", "false");
    });

    it("says the session has ended when it is not in the loaded list", async () => {
      sessionListState.sessions = twoSessions();

      renderDesk("/admin/sessions/session-gone");

      expect(screen.getByText("This session has ended")).toBeInTheDocument();
      expect(incidentState.joinSession).not.toHaveBeenCalled();
      fireEvent.click(screen.getByRole("button", { name: "Back to table" }));
      await waitFor(() => expect(path()).toBe("/admin"));
    });

    it("does not call a session ended while the list is still loading", () => {
      sessionListState.sessions = [];
      sessionListState.loading = true;

      renderDesk("/admin/sessions/session-1");

      expect(screen.queryByText("This session has ended")).not.toBeInTheDocument();
    });

    it("opens the case file on an incident route and never joins the monitor", () => {
      sessionListState.sessions = twoSessions();
      incidentState.list = [
        makeIncident({
          id: "inc-listed01",
          sessionId: "session-1",
          sessionCode: "ABCD",
          playerNote: "Radar circle vanished",
        }),
      ];

      renderDesk("/admin/incidents/inc-listed01");

      expect(screen.getByTestId("admin-case-file")).toBeInTheDocument();
      expect(screen.getByRole("heading", { name: /Radar circle vanished/ })).toBeInTheDocument();
      expect(screen.getByText(/Reported by a seeker/)).toBeInTheDocument();
      expect(screen.getByRole("group", { name: "Session" })).toHaveTextContent("ABCD");
      const actions = screen.getByRole("complementary", { name: "Incident actions" });
      expect(within(actions).getByRole("button", { name: "Resolve" })).toBeInTheDocument();
      expect(within(actions).getByRole("button", { name: "Mitigate…" })).toBeInTheDocument();
      expect(within(actions).getByRole("button", { name: "Hotfix…" })).toBeInTheDocument();
      expect(within(actions).getByRole("button", { name: "Dismiss…" })).toBeInTheDocument();
      expect(screen.getByRole("radio", { name: "Chat" })).toBeChecked();
      expect(screen.queryByTestId("admin-monitor-pane")).not.toBeInTheDocument();
      expect(incidentState.subscribeIncident).not.toHaveBeenCalled();
      expect(incidentState.joinSession).not.toHaveBeenCalled();
    });

    it("watches the game from the case file when its session is listed", async () => {
      sessionListState.sessions = twoSessions();
      incidentState.list = [
        makeIncident({ id: "inc-listed01", sessionId: "session-1", sessionCode: "ABCD" }),
      ];

      renderDesk("/admin/incidents/inc-listed01");
      fireEvent.click(screen.getByRole("button", { name: "Watch game" }));

      await waitFor(() => expect(path()).toBe("/admin/sessions/session-1"));
    });

    it("says the session is no longer live when the case's session is gone", () => {
      sessionListState.sessions = [];
      incidentState.list = [makeIncident({ id: "inc-listed01", sessionCode: "7G2LJH" })];

      renderDesk("/admin/incidents/inc-listed01");

      expect(screen.getByText("7G2LJH is no longer live")).toBeInTheDocument();
      expect(screen.queryByRole("button", { name: "Watch game" })).not.toBeInTheDocument();
    });

    it("fetches an incident outside the list by id, still without joining", async () => {
      const outside = makeIncident({
        id: "inc-outside1",
        sessionId: "s-out",
        sessionCode: "ZZ99QQ",
      });
      incidentState.byId = outside;
      incidentState.subscribeIncident.mockImplementation(
        (_id: string, onChange: (next: IncidentRecord | null) => void) => {
          onChange(outside);
          return () => undefined;
        },
      );
      sessionListState.sessions = [makeLiveSession({ sessionId: "s-out", code: "ZZ99QQ" })];

      renderDesk("/admin/incidents/inc-outside1");

      expect(incidentState.subscribeIncident).toHaveBeenCalledWith(
        "inc-outside1",
        expect.any(Function),
        expect.any(Function),
      );
      const actions = screen.getByRole("complementary", { name: "Incident actions" });
      expect(await within(actions).findByRole("button", { name: "Resolve" })).toBeInTheDocument();
      expect(incidentState.joinSession).not.toHaveBeenCalled();
    });

    it("says the incident was not found when it does not exist", () => {
      incidentState.subscribeIncident.mockImplementation(
        (_id: string, onChange: (next: IncidentRecord | null) => void) => {
          onChange(null);
          return () => undefined;
        },
      );

      renderDesk("/admin/incidents/inc-missing1");

      expect(screen.getByText("Incident not found")).toBeInTheDocument();
      expect(screen.queryByRole("complementary", { name: "Incident actions" })).toBeNull();
    });

    it("opens the open incident from the session header", async () => {
      sessionListState.sessions = [makeLiveSession({ sessionId: "sess-1" })];
      incidentState.list = [makeIncident({ id: "inc-a", sessionId: "sess-1" })];

      renderDesk("/admin/sessions/sess-1");
      expect(screen.getByText("1 open incident")).toBeInTheDocument();
      fireEvent.click(screen.getByRole("button", { name: "Open incident" }));

      await waitFor(() => expect(path()).toBe("/admin/incidents/inc-a"));
    });

    it("shows the Needs you tab count equal to the strip count", async () => {
      incidentState.list = [
        makeIncident({ id: "inc-a", status: "open" }),
        makeIncident({ id: "inc-b", status: "chatting" }),
        makeIncident({ id: "inc-c", status: "resolved" }),
      ];
      preloadState.list = [
        makeRequest({ id: "req-open" }),
        makeRequest({ id: "req-done", status: "shipped" }),
      ];

      renderDesk("/admin");

      const strip = screen.getByRole("group", { name: "Needs you" });
      expect(strip).toHaveTextContent("3");
      expect(screen.getByRole("radio", { name: /Needs you\s*3/ })).toBeInTheDocument();

      fireEvent.click(screen.getByRole("radio", { name: /Needs you/ }));
      await waitFor(() => expect(path()).toBe("/admin/incidents"));
      // Open rows only: two incidents and one preload request.
      expect(within(screen.getByRole("table")).getAllByRole("row")).toHaveLength(4);
      expect(screen.getByText("Open")).toBeInTheDocument();

      fireEvent.click(screen.getByRole("button", { name: "Show closed" }));
      expect(within(screen.getByRole("table")).getAllByRole("row")).toHaveLength(6);
    });

    it("lists only preload requests on /admin/preload-requests and opens the request file", async () => {
      incidentState.list = [makeIncident({ id: "inc-a" })];
      preloadState.list = [makeRequest()];

      renderDesk("/admin/preload-requests");

      expect(screen.getByRole("radio", { name: /Needs you/ })).toBeChecked();
      const table = screen.getByRole("table");
      expect(within(table).getAllByRole("row")).toHaveLength(2);
      expect(within(table).getByText(/Dublin, Ireland/)).toBeInTheDocument();
      fireEvent.click(within(table).getByText(/Dublin, Ireland/));

      await waitFor(() => expect(path()).toBe("/admin/preload-requests/req-abc12345"));
      expect(screen.getByTestId("admin-request-file")).toBeInTheDocument();
      expect(screen.getByRole("heading", { name: "Dublin core" })).toBeInTheDocument();
      expect(screen.getByText("Game area size")).toBeInTheDocument();
      expect(screen.getByText("412 kB")).toBeInTheDocument();
      expect(screen.getByRole("button", { name: "Accept" })).toHaveAttribute(
        "data-variant",
        "filled",
      );
      expect(screen.getByRole("button", { name: "Decline" })).toHaveAttribute(
        "data-variant",
        "default",
      );
      expect(incidentState.joinSession).not.toHaveBeenCalled();
    });

    it("shows a titled alert when a request status update fails", async () => {
      const { updatePreloadRequestStatus } = await import(
        "../../../services/preloadRequest/preloadRequestApi"
      );
      vi.mocked(updatePreloadRequestStatus).mockRejectedValueOnce(new Error("network down"));
      preloadState.list = [makeRequest()];

      renderDesk("/admin/preload-requests/req-abc12345");
      fireEvent.click(screen.getByRole("button", { name: "Accept" }));

      const alert = await screen.findByRole("alert");
      expect(alert).toHaveAttribute("data-tone", "mispunch");
      expect(within(alert).getByText("Couldn't update request")).toBeInTheDocument();
      expect(within(alert).getByText("network down")).toBeInTheDocument();
    });

    it("says the request was not found when it is not in the list", () => {
      preloadState.list = [];

      renderDesk("/admin/preload-requests/req-gone");

      expect(screen.getByText("Preload request not found")).toBeInTheDocument();
    });

    it("switches the sidebar to Needs you without leaving the open session", async () => {
      sessionListState.sessions = twoSessions();
      incidentState.list = [makeIncident({ id: "inc-a", playerNote: "map froze" })];

      renderDesk("/admin/sessions/session-1");
      fireEvent.click(screen.getByRole("radio", { name: /Needs you/ }));

      expect(path()).toBe("/admin/sessions/session-1");
      fireEvent.click(await screen.findByRole("button", { name: /Open incident: map froze/ }));
      await waitFor(() => expect(path()).toBe("/admin/incidents/inc-a"));
    });

    describe("table states", () => {
      it("defaults Live on and offers Show all sessions when nothing is live", () => {
        sessionListState.sessions = [makeLiveSession({ isLive: false })];

        renderDesk("/admin");

        expect(screen.getByRole("button", { name: "Live only" })).toHaveAttribute(
          "aria-pressed",
          "true",
        );
        expect(screen.getByText("No live games right now")).toBeInTheDocument();
        fireEvent.click(screen.getByRole("button", { name: "Show all sessions" }));
        expect(screen.getByText("ABCD")).toBeInTheDocument();
        expect(screen.getByText("Idle")).toBeInTheDocument();
      });

      it("shows No sessions when Live is off and the list is empty", () => {
        sessionListState.sessions = [];

        renderDesk("/admin");
        fireEvent.click(screen.getByRole("button", { name: "Live only" }));

        expect(screen.getByText("No sessions")).toBeInTheDocument();
      });

      it("says No sessions match for a search and clears it", () => {
        sessionListState.sessions = twoSessions();

        renderDesk("/admin");
        fireEvent.change(screen.getByRole("textbox", { name: "Search sessions" }), {
          target: { value: "zzzz" },
        });

        expect(screen.getByText("No sessions match")).toBeInTheDocument();
        fireEvent.click(screen.getByRole("button", { name: "Clear search" }));
        expect(screen.getByText("ABCD")).toBeInTheDocument();
        expect(screen.getByText("EFGH")).toBeInTheDocument();
      });

      it("shows a retryable failure without the calm empty state", () => {
        sessionListState.sessions = [];
        sessionListState.error = "Couldn't load live sessions.";

        renderDesk("/admin");

        expect(screen.getByRole("alert")).toHaveTextContent("Couldn't load live sessions.");
        expect(screen.queryByText("No live games right now")).not.toBeInTheDocument();
        fireEvent.click(screen.getByRole("button", { name: "Retry" }));
        expect(sessionListState.refresh).toHaveBeenCalled();
      });

      it("keeps retained sessions visible when a refresh fails", () => {
        sessionListState.sessions = twoSessions();
        sessionListState.error = "Couldn't load live sessions.";

        renderDesk("/admin");

        expect(screen.getByRole("alert")).toBeInTheDocument();
        expect(screen.getByText("ABCD")).toBeInTheDocument();
      });

      it("loads more sessions from the table footer, also when filters hide every row", () => {
        sessionListState.hasMore = true;
        sessionListState.sessions = [makeLiveSession({ isLive: false })];

        renderDesk("/admin");

        expect(screen.getByText("No live games right now")).toBeInTheDocument();
        fireEvent.click(screen.getByRole("button", { name: "Load more sessions" }));
        expect(sessionListState.loadMore).toHaveBeenCalledTimes(1);
      });

      it("keeps column preferences per browser", () => {
        sessionListState.sessions = twoSessions();
        localStorage.setItem(
          "jl-admin-table:v1:sessions",
          JSON.stringify({ visible: ["code", "tier"], sort: null, density: "compact" }),
        );

        renderDesk("/admin");

        const headers = within(screen.getByRole("table"))
          .getAllByRole("columnheader")
          .map((cell) => cell.textContent);
        expect(headers).toEqual(["Code", "Tier"]);
        expect(screen.getByRole("button", { name: "Columns · 2 of 19" })).toBeInTheDocument();
      });
    });

    describe("keyboard", () => {
      it("drives search and row focus from the keyboard", () => {
        sessionListState.sessions = twoSessions();

        renderDesk("/admin");
        const search = screen.getByRole("textbox", { name: "Search sessions" });

        expect(fireEvent.keyDown(document.body, { key: "/" })).toBe(false);
        expect(search).toHaveFocus();
        expect(fireEvent.keyDown(search, { key: "/" })).toBe(true);
        fireEvent.keyDown(search, { key: "j" });
        expect(search).toHaveFocus();

        search.blur();
        const rows = () => within(screen.getByRole("table")).getAllByRole("row").slice(1);
        fireEvent.keyDown(document.body, { key: "j" });
        expect(rows()[0]).toHaveFocus();
        fireEvent.keyDown(document.activeElement ?? document.body, { key: "j" });
        expect(rows()[1]).toHaveFocus();
        fireEvent.keyDown(document.activeElement ?? document.body, { key: "k" });
        expect(rows()[0]).toHaveFocus();
      });

      it("opens the focused row with Enter", async () => {
        sessionListState.sessions = twoSessions();

        renderDesk("/admin");
        fireEvent.keyDown(document.body, { key: "j" });
        fireEvent.keyDown(document.activeElement ?? document.body, { key: "Enter" });

        await waitFor(() => expect(path()).toBe("/admin/sessions/session-1"));
      });

      it("leaves the keyboard alone while a dialog is open", () => {
        sessionListState.sessions = twoSessions();

        renderDesk("/admin");
        const dialog = document.createElement("div");
        dialog.setAttribute("role", "dialog");
        dialog.setAttribute("aria-modal", "true");
        document.body.appendChild(dialog);

        fireEvent.keyDown(document.body, { key: "j" });
        expect(
          within(screen.getByRole("table"))
            .getAllByRole("row")
            .some((row) => row === document.activeElement),
        ).toBe(false);
        dialog.remove();
      });
    });

    describe("phone", () => {
      it("shows cards with the chosen columns as label and value pairs", () => {
        sessionListState.sessions = twoSessions();

        renderDesk("/admin", 390);

        expect(screen.getByTestId("admin-ops-desk")).toHaveAttribute("data-layout", "mobile");
        expect(screen.queryByRole("table")).not.toBeInTheDocument();
        const card = screen.getByRole("button", { name: "Open session ABCD" });
        expect(within(card).getByText("Players (S / H)")).toBeInTheDocument();
        expect(within(card).getByText("Last activity")).toBeInTheDocument();
        expect(screen.getByRole("radio", { name: "Sessions 2" })).toBeChecked();
        expect(screen.getByRole("button", { name: /^Columns/ })).toBeInTheDocument();
      });

      it("opens an item full screen with Back, and Watch game opens /map", async () => {
        sessionListState.sessions = twoSessions();

        renderDesk("/admin", 390);
        fireEvent.click(screen.getByRole("button", { name: "Open session ABCD" }));

        await waitFor(() => expect(path()).toBe("/admin/sessions/session-1"));
        expect(screen.getByTestId("admin-phone-session")).toBeInTheDocument();
        expect(screen.queryByTestId("admin-monitor-pane")).not.toBeInTheDocument();
        expect(incidentState.joinSession).not.toHaveBeenCalled();

        fireEvent.click(screen.getByRole("button", { name: "Watch game" }));
        expect(incidentState.joinSession).toHaveBeenCalledWith(
          expect.objectContaining({ sessionId: "session-1" }),
          { navigate: true },
        );

        fireEvent.click(screen.getByRole("button", { name: "Back" }));
        await waitFor(() => expect(path()).toBe("/admin"));
      });

      it("opens a Needs you card as a full-screen case file", async () => {
        incidentState.list = [makeIncident({ id: "inc-a", playerNote: "map froze" })];

        renderDesk("/admin/incidents", 390);
        fireEvent.click(screen.getByRole("button", { name: /Open incident: map froze/ }));

        await waitFor(() => expect(path()).toBe("/admin/incidents/inc-a"));
        expect(screen.getByTestId("admin-case-file")).toBeInTheDocument();
        expect(screen.getByRole("button", { name: "Back" })).toBeInTheDocument();
      });

      it("offers 44px touch targets for the search field and the tabs' sibling controls", () => {
        sessionListState.sessions = twoSessions();

        renderDesk("/admin", 390);

        expect(screen.getByRole("textbox", { name: "Search sessions" })).toHaveStyle({
          height: "44px",
        });
      });
    });
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

  it("continues sign-in back to the opened route", () => {
    authState.state = "unsigned";
    authState.authReady = true;
    authState.user = null;

    renderOpsDesk(
      <Routes>
        <Route path="/admin/sessions/:sessionId" element={<AdminOpsDesk />} />
      </Routes>,
      "/admin/sessions/session-1",
    );

    expect(screen.getByTestId("premium-sign-in-gate")).toHaveTextContent(
      "/admin/sessions/session-1",
    );
  });
});
