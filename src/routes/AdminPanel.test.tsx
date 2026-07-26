import { fireEvent, screen } from "@testing-library/react";
import { afterEach, describe, expect, it, vi } from "vitest";
import { AdminPanel } from "./AdminPanel";
import { renderWithRouter } from "../test/renderWithRouter";
import type { AdminSessionSummary } from "../services/admin/adminSessions";

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

vi.mock("../hooks/admin/useAdminAccessState", () => ({
  useAdminAccessState: () => authState,
}));

vi.mock("../hooks/admin/useAdminSessionList", () => ({
  useAdminSessionList: () => sessionListState,
}));

vi.mock("../components/billing/PremiumSignInGate", () => ({
  PremiumSignInGate: ({ continuePath }: { continuePath: string }) => (
    <div data-testid="premium-sign-in-gate">{continuePath}</div>
  ),
}));

vi.mock("../services/admin/adminIncidents", () => ({
  subscribeIncidentList: (onNext: (incidents: unknown[]) => void) => {
    onNext([]);
    return () => undefined;
  },
  countOpenIncidents: () => 0,
}));

vi.mock("../hooks/admin/useAdminJoinSession", () => ({
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

describe("AdminPanel", () => {
  const originalMatchMedia = window.matchMedia;

  afterEach(() => {
    Object.defineProperty(window, "matchMedia", {
      writable: true,
      value: originalMatchMedia,
    });
  });

  it("shows skeleton rows while auth is loading", () => {
    authState.state = "loading";
    authState.authReady = false;
    authState.user = null;
    renderWithRouter(<AdminPanel />);

    expect(document.querySelector(".animate-pulse")).toBeInTheDocument();
  });

  it("shows the sign-in gate for signed-out users", () => {
    authState.state = "unsigned";
    authState.authReady = true;
    authState.user = null;
    sessionListState.sessions = [];

    renderWithRouter(<AdminPanel />);

    expect(
      screen.getByText(/Sign in with your Google account/i),
    ).toBeInTheDocument();
    expect(screen.getByTestId("premium-sign-in-gate")).toHaveTextContent("/admin");
  });

  it("shows access denied for non-admin permanent users", () => {
    authState.state = "denied";
    authState.authReady = true;
    authState.user = { email: "player@example.com", emailVerified: true };

    renderWithRouter(<AdminPanel />);

    expect(screen.getByRole("heading", { name: "Access denied" })).toBeInTheDocument();
  });

  it("shows an empty state for admin users with no live sessions", () => {
    authState.state = "admin";
    authState.authReady = true;
    authState.user = { email: "admin@example.com", emailVerified: true };
    sessionListState.loading = false;
    sessionListState.sessions = [];

    renderWithRouter(<AdminPanel />);

    expect(screen.getByText("No live sessions")).toBeInTheDocument();
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

    renderWithRouter(<AdminPanel />);

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

    renderWithRouter(<AdminPanel />);

    expect(document.querySelector(".admin-dashboard-list-scroll")).toBeInTheDocument();
    expect(document.querySelector(".home-poster-viewport")).toBeInTheDocument();
    expect(screen.getByTestId("admin-ops-desk")).toHaveAttribute(
      "data-layout",
      "desktop",
    );
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

    renderWithRouter(<AdminPanel />);

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

    renderWithRouter(<AdminPanel />);

    fireEvent.click(screen.getByRole("button", { name: "Live" }));

    expect(screen.getByText("No matching sessions")).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "Load more sessions" })).toBeInTheDocument();
  });
});
