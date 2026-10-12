import { MantineProvider } from "@mantine/core";
import { screen, waitFor } from "@testing-library/react";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { jetlagTheme } from "@/theme/theme";
import { renderWithRouter } from "../../test/renderWithRouter";
import { AccountSignInGate } from "./AccountSignInGate";

const mockCompleteOAuthRedirectIfPending = vi.fn();
const mockCompletePremiumEmailSignInLink = vi.fn();
const mockEnsureAnonymousUser = vi.fn();

vi.mock("@/services/core/auth/persistedAuthHint", () => ({
  expectsPermanentSignIn: () => false,
}));

vi.mock("../../services/core/auth/accountAuth", async (importOriginal) => {
  const actual = await importOriginal<typeof import("../../services/core/auth/accountAuth")>();
  return {
    ...actual,
    completeOAuthRedirectIfPending: (...args: unknown[]) =>
      mockCompleteOAuthRedirectIfPending(...args),
    completePremiumEmailSignInLink: (...args: unknown[]) =>
      mockCompletePremiumEmailSignInLink(...args),
    consumeOAuthRedirectFailureMessage: () => null,
  };
});

vi.mock("../../services/core/firebase/firebase", () => ({
  ensureAnonymousUser: (...args: unknown[]) => mockEnsureAnonymousUser(...args),
  getFirebaseAuth: () => ({ currentUser: { uid: "anon-1", isAnonymous: true } }),
  isFirebaseConfigured: () => true,
}));

vi.mock("../../hooks/billing/usePermanentAuthUser", () => ({
  usePermanentAuthUser: () => ({
    user: { uid: "anon-1", isAnonymous: true },
    isPermanent: false,
    authReady: true,
  }),
}));

vi.mock("firebase/auth", () => ({
  EmailAuthProvider: { PROVIDER_ID: "password" },
  GoogleAuthProvider: { PROVIDER_ID: "google.com" },
  isSignInWithEmailLink: () => true,
}));

describe("AccountSignInGate", () => {
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
    mockCompletePremiumEmailSignInLink.mockResolvedValue(null);
    mockEnsureAnonymousUser.mockResolvedValue({ uid: "anon-1", isAnonymous: true });
  });

  it("re-enables sign-in after an OAuth redirect completes on an email-link URL", async () => {
    const onSignedIn = vi.fn();
    mockCompleteOAuthRedirectIfPending.mockResolvedValue({
      uid: "permanent-1",
      isAnonymous: false,
    });

    renderWithRouter(
      <MantineProvider theme={jetlagTheme} forceColorScheme="dark">
        <AccountSignInGate onSignedIn={onSignedIn} />
      </MantineProvider>,
    );

    await waitFor(() => expect(onSignedIn).toHaveBeenCalledTimes(1));
    await waitFor(() =>
      expect(screen.getByRole("button", { name: /Continue with Google/i })).toBeEnabled(),
    );
    expect(mockCompletePremiumEmailSignInLink).not.toHaveBeenCalled();
  });
});
