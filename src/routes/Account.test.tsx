import { MantineProvider } from "@mantine/core";
import { screen } from "@testing-library/react";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { jetlagTheme } from "@/theme/theme";
import { renderWithRouter } from "../test/renderWithRouter";
import { Account } from "./Account";

const mockCompleteOAuthRedirectIfPending = vi.fn();
const mockCompletePremiumEmailSignInLink = vi.fn();
const mockEnsureAnonymousUser = vi.fn();
const mockSignOutToAnonymous = vi.fn();

const authState = {
  user: null as { uid: string; isAnonymous: boolean; email?: string } | null,
  isPermanent: false,
  authReady: true,
};

vi.mock("@/services/core/auth/persistedAuthHint", () => ({
  expectsPermanentSignIn: () => false,
}));

vi.mock("@/services/core/auth/accountAuth", async (importOriginal) => {
  const actual = await importOriginal<typeof import("@/services/core/auth/accountAuth")>();
  return {
    ...actual,
    completeOAuthRedirectIfPending: (...args: unknown[]) =>
      mockCompleteOAuthRedirectIfPending(...args),
    completePremiumEmailSignInLink: (...args: unknown[]) =>
      mockCompletePremiumEmailSignInLink(...args),
    consumeOAuthRedirectFailureMessage: () => null,
    signOutToAnonymous: (...args: unknown[]) => mockSignOutToAnonymous(...args),
  };
});

vi.mock("@/services/core/firebase/firebase", () => ({
  isFirebaseConfigured: () => true,
  ensureAnonymousUser: (...args: unknown[]) => mockEnsureAnonymousUser(...args),
  getFirebaseAuth: () => ({ currentUser: authState.user }),
}));

vi.mock("@/hooks/billing/usePermanentAuthUser", () => ({
  usePermanentAuthUser: () => authState,
}));

vi.mock("firebase/auth", () => ({
  EmailAuthProvider: { PROVIDER_ID: "password" },
  GoogleAuthProvider: { PROVIDER_ID: "google.com" },
  isSignInWithEmailLink: () => false,
}));

function renderAccount() {
  return renderWithRouter(
    <MantineProvider theme={jetlagTheme} forceColorScheme="dark">
      <Account />
    </MantineProvider>,
  );
}

describe("Account", () => {
  beforeEach(() => {
    vi.clearAllMocks();
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
    authState.user = null;
    authState.isPermanent = false;
    authState.authReady = true;
    mockCompleteOAuthRedirectIfPending.mockResolvedValue(null);
    mockCompletePremiumEmailSignInLink.mockResolvedValue(null);
    mockEnsureAnonymousUser.mockResolvedValue({ uid: "anon-1", isAnonymous: true });
  });

  it("shows sign-in chrome when not permanent", async () => {
    renderAccount();
    // Exact label: description also starts with "Sign in with Google…".
    expect(await screen.findByText("Sign in")).toBeInTheDocument();
    expect(screen.queryByRole("link", { name: "Premium" })).not.toBeInTheDocument();
  });

  it("shows Premium link and sign-out when permanent", async () => {
    authState.user = { uid: "u1", isAnonymous: false, email: "a@b.co" };
    authState.isPermanent = true;
    renderAccount();
    expect(await screen.findByRole("link", { name: "Premium" })).toHaveAttribute(
      "href",
      "/premium",
    );
    expect(screen.getByRole("button", { name: /sign out/i })).toBeInTheDocument();
  });
});
