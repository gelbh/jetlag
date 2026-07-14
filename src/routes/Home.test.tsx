import { fireEvent, screen, waitFor } from "@testing-library/react";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { Home } from "./Home";
import { LOCAL_SESSION_ID } from "../domain/map/annotations";
import { renderWithRouter } from "../test/renderWithRouter";
import { createTestRemoteSession, createTestSession } from "../test/fixtures/sessions";
import { useSessionStore } from "../state/sessionStore";

const navigate = vi.fn();
const mockIsFirebaseConfigured = vi.fn(() => false);
const mockEnsureAnonymousUser = vi.fn();
const mockGetRemoteSessionById = vi.fn();
const mockEnsureRemoteSessionMembership = vi.fn();

vi.mock("../services/core/firebase", () => ({
  isFirebaseConfigured: () => mockIsFirebaseConfigured(),
  isAuthBootstrapReady: () => true,
  subscribeAuthBootstrapReady: () => () => undefined,
  ensureAnonymousUser: (...args: unknown[]) => mockEnsureAnonymousUser(...args),
  getFirebaseAuth: () => ({ currentUser: null, onAuthStateChanged: () => () => undefined }),
}));

vi.mock("../services/core/firebaseAuthReady", () => ({
  waitForPermanentAuthReady: vi.fn().mockResolvedValue(undefined),
}));

vi.mock("../hooks/billing/usePremiumEntitlements", () => ({
  usePremiumEntitlements: () => ({
    entitlements: null,
    loading: false,
    hydrated: true,
    refresh: vi.fn(),
    setEntitlements: vi.fn(),
  }),
}));

vi.mock("../services/billing/premiumBilling", () => ({
  fetchPremiumEntitlements: vi.fn().mockResolvedValue(null),
}));

vi.mock("../services/firestore/sessionMembershipHeal", () => ({
  getRemoteSessionById: (...args: unknown[]) => mockGetRemoteSessionById(...args),
  healSessionMembership: (...args: unknown[]) =>
    mockEnsureRemoteSessionMembership(...args),
}));

vi.mock("../hooks/useAppNavigate", () => ({
  useAppNavigate: () => navigate,
}));

describe("Home", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockIsFirebaseConfigured.mockReturnValue(false);
    mockEnsureAnonymousUser.mockResolvedValue({ uid: "user-new" });
    useSessionStore.getState().setSession(null);
  });

  it("opens play hub with create, join, and custom actions", async () => {
    renderWithRouter(<Home />);

    expect(screen.queryByRole("link", { name: "Create session" })).not.toBeInTheDocument();
    expect(screen.queryByRole("link", { name: "Join session" })).not.toBeInTheDocument();

    fireEvent.click(
      screen.getByRole("button", { name: "Play — create, join, or custom game" }),
    );

    expect(screen.getByRole("link", { name: "Create session" })).toHaveAttribute(
      "href",
      "/create",
    );
    expect(screen.getByRole("link", { name: "Join session" })).toHaveAttribute(
      "href",
      "/join",
    );
    expect(screen.getByRole("link", { name: "Custom game presets" })).toHaveAttribute(
      "href",
      "/presets",
    );

    fireEvent.click(screen.getByRole("link", { name: "Create session" }));
    await waitFor(() => {
      expect(screen.queryByRole("dialog", { name: "Play" })).not.toBeInTheDocument();
    });
  });

  it("links to friends and leaderboard in the header", () => {
    renderWithRouter(<Home />);

    expect(screen.getByRole("link", { name: "Friends" })).toHaveAttribute(
      "href",
      "/friends",
    );
    expect(screen.getByRole("link", { name: "Leaderboard" })).toHaveAttribute(
      "href",
      "/leaderboard",
    );
  });

  it("continues a local session without remote verification", () => {
    useSessionStore.getState().setSession(createTestSession());

    renderWithRouter(<Home />, { resetStores: false });
    fireEvent.click(
      screen.getByRole("button", { name: /Return to map for session TEST/i }),
    );

    expect(navigate).toHaveBeenCalledWith("/map");
    expect(mockEnsureRemoteSessionMembership).not.toHaveBeenCalled();
  });

  it("heals remote membership when auth uid drifted", async () => {
    mockIsFirebaseConfigured.mockReturnValue(true);
    const remoteSession = createTestRemoteSession({
      memberUids: ["user-old"],
      memberRoles: { "user-old": "seeker" },
    });
    const healedSession = createTestRemoteSession({
      memberUids: ["user-old", "user-new"],
      memberRoles: { "user-old": "seeker", "user-new": "seeker" },
    });

    mockGetRemoteSessionById.mockResolvedValue(remoteSession);
    mockEnsureRemoteSessionMembership.mockResolvedValue(healedSession);

    useSessionStore.getState().setSession(remoteSession, "user-old");
    useSessionStore.getState().setMyUid("user-old");

    renderWithRouter(<Home />, { resetStores: false });
    fireEvent.click(
      screen.getByRole("button", { name: /Return to map for session ABCD/i }),
    );

    await waitFor(() => {
      expect(mockEnsureRemoteSessionMembership).toHaveBeenCalledWith(
        remoteSession,
        "user-new",
        "seeker",
        { returningMemberUid: "user-old", persistedMyUid: "user-old" },
      );
    });

    expect(navigate).toHaveBeenCalledWith("/map");
    expect(
      screen.queryByText(/no longer a member/i),
    ).not.toBeInTheDocument();
  });

  it("shows resume action when a session exists", () => {
    useSessionStore.getState().setSession(
      createTestSession({ id: LOCAL_SESSION_ID, code: "WXYZ" }),
    );

    renderWithRouter(<Home />, { resetStores: false });
    expect(screen.getByText("WXYZ")).toBeInTheDocument();
  });

  it("links to the feedback page", () => {
    renderWithRouter(<Home />);

    expect(
      screen.getByRole("link", {
        name: "Feedback and suggestions",
      }),
    ).toHaveAttribute("href", "/feedback");
  });

  it("centers the home entry stack in the viewport layout", () => {
    renderWithRouter(<Home />);

    const main = screen.getByRole("main");
    expect(main.className).toContain("justify-center");
    expect(main.className).toContain("overflow-y-auto");
  });
});
