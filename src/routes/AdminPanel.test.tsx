import { screen } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";
import { AdminPanel } from "./AdminPanel";
import { renderWithRouter } from "../test/renderWithRouter";
import type { AdminSessionSummary } from "../services/admin/adminSessions";

const authState = vi.hoisted(() => ({
  user: null as { email: string; emailVerified: boolean } | null,
  isPermanent: false,
  authReady: true,
}));

const sessionListState = vi.hoisted(() => ({
  sessions: [] as AdminSessionSummary[],
  loading: false,
  refreshing: false,
  error: null as string | null,
  lastFetchedAt: null as Date | null,
  refresh: vi.fn(),
}));

vi.mock("../hooks/billing/usePermanentAuthUser", () => ({
  usePermanentAuthUser: () => authState,
}));

vi.mock("../domain/admin/adminAccess", () => ({
  isAdminUser: (user: { email: string; emailVerified: boolean } | null) =>
    user?.email === "admin@example.com" && user.emailVerified,
}));

vi.mock("../hooks/admin/useAdminSessionList", () => ({
  useAdminSessionList: () => sessionListState,
}));

vi.mock("../components/billing/PremiumSignInGate", () => ({
  PremiumSignInGate: ({ continuePath }: { continuePath: string }) => (
    <div data-testid="premium-sign-in-gate">{continuePath}</div>
  ),
}));

describe("AdminPanel", () => {
  it("shows skeleton rows while auth is loading", () => {
    authState.authReady = false;
    renderWithRouter(<AdminPanel />);

    expect(document.querySelector(".animate-pulse")).toBeInTheDocument();
  });

  it("shows the sign-in gate for signed-out users", () => {
    authState.authReady = true;
    authState.user = null;
    authState.isPermanent = false;
    sessionListState.sessions = [];

    renderWithRouter(<AdminPanel />);

    expect(
      screen.getByText(/Sign in with your Google account/i),
    ).toBeInTheDocument();
    expect(screen.getByTestId("premium-sign-in-gate")).toHaveTextContent("/admin");
  });

  it("shows access denied for non-admin permanent users", () => {
    authState.authReady = true;
    authState.isPermanent = true;
    authState.user = { email: "player@example.com", emailVerified: true };

    renderWithRouter(<AdminPanel />);

    expect(screen.getByRole("heading", { name: "Access denied" })).toBeInTheDocument();
  });

  it("shows an empty state for admin users with no live sessions", () => {
    authState.authReady = true;
    authState.isPermanent = true;
    authState.user = { email: "admin@example.com", emailVerified: true };
    sessionListState.loading = false;
    sessionListState.sessions = [];

    renderWithRouter(<AdminPanel />);

    expect(screen.getByText("No live sessions")).toBeInTheDocument();
  });

  it("renders session phase labels for admin users", () => {
    authState.authReady = true;
    authState.isPermanent = true;
    authState.user = { email: "admin@example.com", emailVerified: true };
    sessionListState.sessions = [
      {
        sessionId: "session-1",
        code: "ABCD",
        phase: "seek",
        tier: "free",
        gameSize: "medium",
        roleCounts: { seeker: 1, hider: 1, observer: 0 },
        hostUid: "host-1",
        createdAt: "2026-01-01T00:00:00.000Z",
        memberCount: 2,
        timerAccumulatedMs: 0,
        timerRunningSince: "2026-01-01T00:00:00.000Z",
        endGameStartedAt: null,
        endGameRequestedAt: null,
        hostAppVersion: null,
        hidingPeriodMinutes: null,
      },
    ];

    renderWithRouter(<AdminPanel />);

    expect(screen.getByText("ABCD")).toBeInTheDocument();
    expect(screen.getByText("Seek")).toBeInTheDocument();
  });
});
