import { MantineProvider } from "@mantine/core";
import { fireEvent, screen, waitFor } from "@testing-library/react";
import type { ReactElement } from "react";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { jetlagTheme } from "@/theme/theme";
import { renderWithRouter } from "../../test/renderWithRouter";
import { PremiumSignInGate } from "./PremiumSignInGate";

const mockSignOutToAnonymous = vi.fn();
const mockCompletePremiumEmailSignInLink = vi.fn();
const mockCompleteOAuthRedirectIfPending = vi.fn();
const mockEnsureAnonymousUser = vi.fn();
const mockRecoverPremiumEntitlements = vi.fn();
const mockSignInWithGoogle = vi.fn();

let mockUser: {
  uid: string;
  isAnonymous: boolean;
  email?: string | null;
  displayName?: string | null;
} | null = null;
let mockAuthReady = true;

vi.mock("../../services/core/auth/accountAuth", async (importOriginal) => {
  const actual = await importOriginal<typeof import("../../services/core/auth/accountAuth")>();
  return {
    ...actual,
    completePremiumEmailSignInLink: (...args: unknown[]) =>
      mockCompletePremiumEmailSignInLink(...args),
    completeOAuthRedirectIfPending: (...args: unknown[]) =>
      mockCompleteOAuthRedirectIfPending(...args),
    signInWithGoogle: (...args: unknown[]) => mockSignInWithGoogle(...args),
    signOutToAnonymous: (...args: unknown[]) => mockSignOutToAnonymous(...args),
  };
});

vi.mock("../../services/core/firebase/firebase", () => ({
  ensureAnonymousUser: (...args: unknown[]) => mockEnsureAnonymousUser(...args),
  getFirebaseAuth: () => ({ currentUser: mockUser }),
  isFirebaseConfigured: () => true,
}));

vi.mock("../../services/billing/premiumBilling", () => ({
  recoverPremiumEntitlements: (...args: unknown[]) => mockRecoverPremiumEntitlements(...args),
}));

vi.mock("../../hooks/billing/usePermanentAuthUser", () => ({
  usePermanentAuthUser: () => ({
    user: mockUser,
    isPermanent: mockUser != null && !mockUser.isAnonymous,
    authReady: mockAuthReady,
  }),
}));

vi.mock("firebase/auth", () => ({
  isSignInWithEmailLink: () => false,
}));

function renderPremiumSignInGate(ui: ReactElement) {
  return renderWithRouter(
    <MantineProvider theme={jetlagTheme} forceColorScheme="dark">
      {ui}
    </MantineProvider>,
  );
}

describe("PremiumSignInGate", () => {
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
    mockUser = {
      uid: "permanent-1",
      isAnonymous: false,
      email: "player@example.com",
    };
    mockAuthReady = true;
    mockEnsureAnonymousUser.mockResolvedValue({
      uid: "anon-1",
      isAnonymous: true,
    });
    mockCompletePremiumEmailSignInLink.mockResolvedValue(null);
    mockCompleteOAuthRedirectIfPending.mockResolvedValue(null);
    mockRecoverPremiumEntitlements.mockResolvedValue(false);
    mockSignInWithGoogle.mockResolvedValue(undefined);
    mockSignOutToAnonymous.mockResolvedValue(undefined);
  });

  it("shows the signed-in account strip and children for permanent users", () => {
    renderPremiumSignInGate(
      <PremiumSignInGate>
        <p>Premium content</p>
      </PremiumSignInGate>,
    );

    expect(screen.getByText(/Signed in as player@example.com/i)).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "Sign out" })).toBeInTheDocument();
    expect(screen.getByText("Premium content")).toBeInTheDocument();
  });

  it("signs out to anonymous and hides children after sign out", async () => {
    const { rerender } = renderPremiumSignInGate(
      <PremiumSignInGate>
        <p>Premium content</p>
      </PremiumSignInGate>,
    );

    fireEvent.click(screen.getByRole("button", { name: "Sign out" }));

    await waitFor(() => {
      expect(mockSignOutToAnonymous).toHaveBeenCalledTimes(1);
    });

    mockUser = { uid: "anon-1", isAnonymous: true };
    rerender(
      <MantineProvider theme={jetlagTheme} forceColorScheme="dark">
        <PremiumSignInGate>
          <p>Premium content</p>
        </PremiumSignInGate>
      </MantineProvider>,
    );

    expect(screen.queryByText("Premium content")).not.toBeInTheDocument();
    expect(screen.getByRole("button", { name: /Continue with Google/i })).toBeInTheDocument();
  });

  it("shows a recovery success callout after sign-in restores premium entitlements", async () => {
    mockUser = { uid: "anon-1", isAnonymous: true };
    mockRecoverPremiumEntitlements.mockResolvedValue(true);

    renderPremiumSignInGate(<PremiumSignInGate />);

    fireEvent.click(screen.getByRole("button", { name: /Continue with Google/i }));

    await waitFor(() => {
      expect(mockRecoverPremiumEntitlements).toHaveBeenCalledTimes(1);
    });

    expect(screen.getByRole("status")).toHaveTextContent(
      "Premium credits from a previous device or account were moved to this sign-in.",
    );
  });

  it("shows a recovery error callout but still finishes sign-in", async () => {
    const onSignedIn = vi.fn();
    mockUser = { uid: "anon-1", isAnonymous: true };
    mockRecoverPremiumEntitlements.mockRejectedValue(new Error("boom"));

    renderPremiumSignInGate(<PremiumSignInGate onSignedIn={onSignedIn} />);

    fireEvent.click(screen.getByRole("button", { name: /Continue with Google/i }));

    await waitFor(() => {
      expect(mockRecoverPremiumEntitlements).toHaveBeenCalledTimes(1);
      expect(onSignedIn).toHaveBeenCalledTimes(1);
    });

    expect(screen.getByRole("alert")).toHaveTextContent(
      "Couldn't restore purchases. Try again from Premium.",
    );
  });
});
