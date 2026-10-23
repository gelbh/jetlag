import { MantineProvider } from "@mantine/core";
import { act, fireEvent, screen, waitFor, within } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { jetlagTheme } from "@/theme/theme";
import { APP_VERSION } from "../domain/device/changelog";
import { LEGAL_APP_NAME } from "../domain/legal/legalContact";
import { LOCAL_SESSION_ID } from "../domain/map/annotations";
import { useSessionStore } from "../state/sessionStore";
import { createTestRemoteSession, createTestSession } from "../test/fixtures/sessions";
import { renderWithRouter } from "../test/renderWithRouter";
import { Home } from "./Home";

const navigate = vi.fn();
const mockIsFirebaseConfigured = vi.fn(() => false);
const mockEnsureAnonymousUser = vi.fn();
const mockGetRemoteSessionById = vi.fn();
const mockEnsureRemoteSessionMembership = vi.fn();
const mockUsePermanentAuthUser = vi.fn(() => ({
  user: null as { uid: string; isAnonymous: boolean; email?: string } | null,
  isPermanent: false,
  authReady: true,
}));
const mockExpectsPermanentSignIn = vi.fn(() => false);
const mockUseHydrated = vi.fn(() => true);

function renderHome(options?: { resetStores?: boolean }) {
  return renderWithRouter(
    <MantineProvider theme={jetlagTheme} forceColorScheme="dark">
      <Home />
    </MantineProvider>,
    options,
  );
}

vi.mock("@/services/core/firebase/firebase", () => ({
  isFirebaseConfigured: () => mockIsFirebaseConfigured(),
  isAuthBootstrapReady: () => true,
  subscribeAuthBootstrapReady: () => () => undefined,
  ensureFreshAnonymousUser: (...args: unknown[]) => mockEnsureAnonymousUser(...args),
  getFirebaseAuth: () => ({ currentUser: null, onAuthStateChanged: () => () => undefined }),
}));

vi.mock("@/services/core/firebase/authBootstrapState", () => ({
  isFirebaseConfigured: () => mockIsFirebaseConfigured(),
  isAuthBootstrapReady: () => true,
  subscribeAuthBootstrapReady: () => () => undefined,
}));

vi.mock("@/services/core/firebase/firebaseAuthReady", () => ({
  waitForPermanentAuthReady: vi.fn().mockResolvedValue(undefined),
}));

vi.mock("@/hooks/billing/usePermanentAuthUser", () => ({
  usePermanentAuthUser: () => mockUsePermanentAuthUser(),
}));

vi.mock("@/services/core/auth/persistedAuthHint", () => ({
  expectsPermanentSignIn: () => mockExpectsPermanentSignIn(),
}));

vi.mock("@/hooks/app/useHydrated", () => ({
  useHydrated: () => mockUseHydrated(),
}));

vi.mock("@/hooks/billing/usePremiumEntitlements", () => ({
  usePremiumEntitlements: () => ({
    entitlements: null,
    loading: false,
    hydrated: true,
    refresh: vi.fn(),
    setEntitlements: vi.fn(),
  }),
}));

vi.mock("@/services/billing/premiumBilling", () => ({
  fetchPremiumEntitlements: vi.fn().mockResolvedValue(null),
}));

vi.mock("@/services/firestore/firestoreAnnotations", () => ({
  isFirestorePermissionDenied: () => false,
}));

vi.mock("@/services/firestore/sessionMembershipHeal", () => ({
  getRemoteSessionById: (...args: unknown[]) => mockGetRemoteSessionById(...args),
  healSessionMembership: (...args: unknown[]) => mockEnsureRemoteSessionMembership(...args),
  lookupRemoteSessionByCode: vi.fn(),
}));

vi.mock("@/hooks/navigation/useAppNavigate", () => ({
  useAppNavigate: () => navigate,
}));

vi.mock("@/hooks/app/useAppUpdateState", () => ({
  useAppUpdateState: () => ({
    needsRefresh: false,
    safeToReload: true,
    showGlobalBanner: false,
    applyUpdate: vi.fn(),
    hotfixGraceActive: false,
    hotfixGraceSecondsRemaining: null,
    hotfixRequiredMinAppVersion: null,
  }),
}));

vi.mock("@/hooks/session/useLeaveSessionAndUpdate", () => ({
  useLeaveSessionAndUpdate: () => ({
    leaving: false,
    handleLeaveAndUpdate: vi.fn(),
  }),
}));

describe("Home", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockIsFirebaseConfigured.mockReturnValue(false);
    mockUsePermanentAuthUser.mockReturnValue({
      user: null,
      isPermanent: false,
      authReady: true,
    });
    mockExpectsPermanentSignIn.mockReturnValue(false);
    mockUseHydrated.mockReturnValue(true);
    mockEnsureAnonymousUser.mockResolvedValue({ uid: "user-new" });
    useSessionStore.getState().setSession(null);
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
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  it("links play actions for join, create, and presets", () => {
    renderHome();

    expect(screen.getByRole("link", { name: "Create session" })).toHaveAttribute("href", "/create");
    expect(screen.getByRole("link", { name: "Join session" })).toHaveAttribute("href", "/join");
    expect(screen.getByRole("link", { name: "Browse presets" })).toHaveAttribute(
      "href",
      "/presets",
    );
  });

  it("shows Friends, Leaderboard, and Stats in More when Firebase is off", () => {
    renderHome();

    expect(screen.getByRole("link", { name: "Friends" })).toHaveAttribute("href", "/friends");
    expect(screen.getByRole("link", { name: "Leaderboard" })).toHaveAttribute(
      "href",
      "/leaderboard",
    );
    expect(screen.getByRole("link", { name: "Stats" })).toHaveAttribute("href", "/stats");
    expect(screen.queryByRole("link", { name: "Premium" })).not.toBeInTheDocument();
    expect(screen.queryByRole("link", { name: "Log in" })).not.toBeInTheDocument();
    expect(screen.queryByRole("link", { name: "Account" })).not.toBeInTheDocument();
  });

  it("shows only Log in in More when Firebase is on and the user is not permanent", () => {
    mockIsFirebaseConfigured.mockReturnValue(true);
    mockUsePermanentAuthUser.mockReturnValue({
      user: { uid: "anon", isAnonymous: true },
      isPermanent: false,
      authReady: true,
    });
    renderHome();
    expect(screen.getByRole("link", { name: "Log in" })).toHaveAttribute("href", "/account");
    expect(screen.queryByRole("link", { name: "Friends" })).not.toBeInTheDocument();
    expect(screen.queryByRole("link", { name: "Leaderboard" })).not.toBeInTheDocument();
    expect(screen.queryByRole("link", { name: "Stats" })).not.toBeInTheDocument();
    expect(screen.queryByRole("link", { name: "Premium" })).not.toBeInTheDocument();
    expect(screen.queryByRole("link", { name: "Account" })).not.toBeInTheDocument();
  });

  it("shows Friends, Leaderboard, Stats, and Account when permanent; hides Log in and Premium", () => {
    mockIsFirebaseConfigured.mockReturnValue(true);
    mockUsePermanentAuthUser.mockReturnValue({
      user: { uid: "u1", isAnonymous: false, email: "a@b.co" },
      isPermanent: true,
      authReady: true,
    });
    renderHome();
    expect(screen.getByRole("link", { name: "Friends" })).toHaveAttribute("href", "/friends");
    expect(screen.getByRole("link", { name: "Leaderboard" })).toHaveAttribute(
      "href",
      "/leaderboard",
    );
    expect(screen.getByRole("link", { name: "Stats" })).toHaveAttribute("href", "/stats");
    expect(screen.getByRole("link", { name: "Account" })).toHaveAttribute("href", "/account");
    expect(screen.queryByRole("link", { name: "Log in" })).not.toBeInTheDocument();
    expect(screen.queryByRole("link", { name: "Premium" })).not.toBeInTheDocument();
  });

  it("shows features + Account while auth is not ready when hydrated and permanent hint is set", () => {
    mockIsFirebaseConfigured.mockReturnValue(true);
    mockUseHydrated.mockReturnValue(true);
    mockExpectsPermanentSignIn.mockReturnValue(true);
    mockUsePermanentAuthUser.mockReturnValue({
      user: null,
      isPermanent: false,
      authReady: false,
    });
    renderHome();
    expect(screen.getByRole("link", { name: "Friends" })).toHaveAttribute("href", "/friends");
    expect(screen.getByRole("link", { name: "Account" })).toHaveAttribute("href", "/account");
    expect(screen.queryByRole("link", { name: "Log in" })).not.toBeInTheDocument();
  });

  it("shows only Log in while auth is not ready when hydrated and permanent hint is clear", () => {
    mockIsFirebaseConfigured.mockReturnValue(true);
    mockUseHydrated.mockReturnValue(true);
    mockExpectsPermanentSignIn.mockReturnValue(false);
    mockUsePermanentAuthUser.mockReturnValue({
      user: null,
      isPermanent: false,
      authReady: false,
    });
    renderHome();
    expect(screen.getByRole("link", { name: "Log in" })).toHaveAttribute("href", "/account");
    expect(screen.queryByRole("link", { name: "Friends" })).not.toBeInTheDocument();
    expect(screen.queryByRole("link", { name: "Account" })).not.toBeInTheDocument();
  });

  it("ignores permanent hint before hydrate so More matches the prerender guest set", () => {
    mockIsFirebaseConfigured.mockReturnValue(true);
    mockUseHydrated.mockReturnValue(false);
    mockExpectsPermanentSignIn.mockReturnValue(true);
    mockUsePermanentAuthUser.mockReturnValue({
      user: null,
      isPermanent: false,
      authReady: false,
    });
    renderHome();
    expect(screen.getByRole("link", { name: "Log in" })).toHaveAttribute("href", "/account");
    expect(screen.queryByRole("link", { name: "Friends" })).not.toBeInTheDocument();
    expect(screen.queryByRole("link", { name: "Account" })).not.toBeInTheDocument();
  });

  it("continues a local session without remote verification", () => {
    useSessionStore.getState().setSession(createTestSession());

    renderHome({ resetStores: false });
    fireEvent.click(screen.getByRole("button", { name: /Return to map for session TEST/i }));

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

    renderHome({ resetStores: false });
    fireEvent.click(screen.getByRole("button", { name: /Return to map for session ABCD/i }));

    await waitFor(
      () => {
        expect(mockEnsureRemoteSessionMembership).toHaveBeenCalledWith(
          remoteSession,
          "user-new",
          "seeker",
          { returningMemberUid: "user-old", persistedMyUid: "user-old" },
        );
      },
      { timeout: 5000 },
    );

    expect(navigate).toHaveBeenCalledWith("/map");
    expect(screen.queryByText(/no longer a member/i)).not.toBeInTheDocument();
  });

  it("shows resume action when a session exists", () => {
    useSessionStore
      .getState()
      .setSession(createTestSession({ id: LOCAL_SESSION_ID, code: "WXYZ" }));

    renderHome({ resetStores: false });
    expect(screen.getByText("WXYZ")).toBeInTheDocument();
  });

  it("links to the feedback page", () => {
    renderHome();

    expect(
      screen.getByRole("link", {
        name: "Feedback and suggestions",
      }),
    ).toHaveAttribute("href", "/feedback");
  });

  it("centers the home entry stack with breathing room under the safe area", () => {
    renderHome();

    const main = screen.getByRole("main");
    expect(main.className).toContain("justify-center");
    expect(main.className).toContain("overflow-y-auto");
    expect(main.className).toContain("safe-area-top)+1.25rem");
  });

  it("renders the brand mark and LEGAL_APP_NAME heading", () => {
    renderHome();

    expect(screen.getByRole("heading", { level: 1, name: LEGAL_APP_NAME })).toBeInTheDocument();
    expect(screen.getByRole("img", { name: LEGAL_APP_NAME })).toBeInTheDocument();
  });

  it("keeps the brand mark left of the title in a nowrap lockup", () => {
    renderHome();

    const heading = screen.getByRole("heading", {
      level: 1,
      name: LEGAL_APP_NAME,
    });
    const logo = screen.getByRole("img", { name: LEGAL_APP_NAME });
    const tagline = screen.getByText("Unofficial fan companion for Jet Lag: The Game.");
    const versionControl = screen.getByRole("button", {
      name: `Version ${APP_VERSION}. Open changelog`,
    });
    const titleColumn = heading.parentElement;
    const logoColumn = logo.parentElement;
    const lockup = titleColumn?.parentElement;

    expect(titleColumn).toContainElement(tagline);
    expect(logoColumn).toContainElement(versionControl);
    expect(lockup).not.toBeNull();
    expect(lockup).toContainElement(logo);
    expect(lockup).toContainElement(heading);
    expect(lockup!.style.getPropertyValue("--group-wrap").trim()).toBe("nowrap");
    expect(logo.compareDocumentPosition(heading) & Node.DOCUMENT_POSITION_FOLLOWING).toBeTruthy();
    expect(String(logoColumn?.getAttribute("class") ?? "")).toContain("shrink-0");
    expect(heading.style.minWidth).toMatch(/^0(px)?$/);
  });

  it("opens and closes the version changelog sheet", async () => {
    renderHome();

    const versionControl = screen.getByRole("button", {
      name: `Version ${APP_VERSION}. Open changelog`,
    });
    expect(versionControl).toHaveTextContent(`v${APP_VERSION}`);
    expect(versionControl.style.minHeight).toContain(`${24 / 16}rem`);
    expect(screen.queryByRole("dialog", { name: "Changelog" })).not.toBeInTheDocument();

    fireEvent.click(versionControl);

    const changelog = await screen.findByRole("dialog", { name: "Changelog" });
    expect(changelog).toBeInTheDocument();

    fireEvent.click(within(changelog).getByRole("button", { name: "Close" }));

    await waitFor(() => {
      expect(screen.queryByRole("dialog", { name: "Changelog" })).not.toBeInTheDocument();
    });
  });

  it("clears verifying when ensureFreshAnonymousUser times out", async () => {
    vi.useFakeTimers();
    mockIsFirebaseConfigured.mockReturnValue(true);
    mockEnsureAnonymousUser.mockImplementation(() => new Promise(() => undefined));

    const remoteSession = createTestRemoteSession({
      memberUids: ["user-old"],
      memberRoles: { "user-old": "seeker" },
    });
    useSessionStore.getState().setSession(remoteSession, "user-old");
    useSessionStore.getState().setMyUid("user-old");

    renderHome({ resetStores: false });
    const continueButton = screen.getByRole("button", {
      name: /Return to map for session ABCD/i,
    });
    fireEvent.click(continueButton);

    expect(continueButton).toHaveAttribute("aria-busy", "true");

    await act(async () => {
      await vi.advanceTimersByTimeAsync(15_000);
    });

    expect(
      screen.getByText("Couldn't verify the session. Check your connection and try again."),
    ).toBeInTheDocument();
    expect(continueButton).not.toHaveAttribute("aria-busy");
  });
});
