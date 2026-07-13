import { fireEvent, screen, waitFor } from "@testing-library/react";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { PremiumSignInGate } from "./PremiumSignInGate";
import { renderWithRouter } from "../../test/renderWithRouter";

const mockSignOutToAnonymous = vi.fn();
const mockCompletePremiumEmailSignInLink = vi.fn();
const mockCompleteOAuthRedirectIfPending = vi.fn();
const mockEnsureAnonymousUser = vi.fn();
const mockRecoverPremiumEntitlements = vi.fn();

let mockUser: {
  uid: string;
  isAnonymous: boolean;
  email?: string | null;
  displayName?: string | null;
} | null = null;
let mockAuthReady = true;

vi.mock("../../services/core/accountAuth", async (importOriginal) => {
  const actual = await importOriginal<typeof import("../../services/core/accountAuth")>();
  return {
    ...actual,
    completePremiumEmailSignInLink: (...args: unknown[]) =>
      mockCompletePremiumEmailSignInLink(...args),
    completeOAuthRedirectIfPending: (...args: unknown[]) =>
      mockCompleteOAuthRedirectIfPending(...args),
    signOutToAnonymous: (...args: unknown[]) => mockSignOutToAnonymous(...args),
  };
});

vi.mock("../../services/core/firebase", () => ({
  ensureAnonymousUser: (...args: unknown[]) => mockEnsureAnonymousUser(...args),
  getFirebaseAuth: () => ({ currentUser: mockUser }),
  isFirebaseConfigured: () => true,
}));

vi.mock("../../services/billing/premiumBilling", () => ({
  recoverPremiumEntitlements: (...args: unknown[]) =>
    mockRecoverPremiumEntitlements(...args),
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

describe("PremiumSignInGate", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockUser = {
      uid: "permanent-1",
      isAnonymous: false,
      email: "player@example.com",
    };
    mockAuthReady = true;
    mockEnsureAnonymousUser.mockResolvedValue({ uid: "anon-1", isAnonymous: true });
    mockCompletePremiumEmailSignInLink.mockResolvedValue(null);
    mockCompleteOAuthRedirectIfPending.mockResolvedValue(null);
    mockRecoverPremiumEntitlements.mockResolvedValue(false);
    mockSignOutToAnonymous.mockResolvedValue(undefined);
  });

  it("shows the signed-in account strip and children for permanent users", () => {
    renderWithRouter(
      <PremiumSignInGate>
        <p>Premium content</p>
      </PremiumSignInGate>,
    );

    expect(screen.getByText(/Signed in as player@example.com/i)).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "Sign out" })).toBeInTheDocument();
    expect(screen.getByText("Premium content")).toBeInTheDocument();
  });

  it("signs out to anonymous and hides children after sign out", async () => {
    const { rerender } = renderWithRouter(
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
      <PremiumSignInGate>
        <p>Premium content</p>
      </PremiumSignInGate>,
    );

    expect(screen.queryByText("Premium content")).not.toBeInTheDocument();
    expect(screen.getByRole("button", { name: /Continue with Google/i })).toBeInTheDocument();
  });
});
