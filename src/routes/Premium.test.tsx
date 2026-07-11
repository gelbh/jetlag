import { fireEvent, screen, waitFor } from "@testing-library/react";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { Premium } from "./Premium";
import { renderWithRouter } from "../test/renderWithRouter";

const {
  fetchPremiumEntitlements,
  startPremiumCheckout,
  openPremiumBillingPortal,
  ensureAnonymousUser,
  isFirebaseConfigured,
  isPermanentUser,
  waitForAuthStateReady,
  mockAuth,
} = vi.hoisted(() => {
  const auth = {
    currentUser: null,
    onAuthStateChanged: vi.fn((callback: (user: null) => void) => {
      callback(null);
      return () => {};
    }),
  };

  return {
    fetchPremiumEntitlements: vi.fn(),
    startPremiumCheckout: vi.fn(),
    openPremiumBillingPortal: vi.fn(),
    ensureAnonymousUser: vi.fn(async () => undefined),
    waitForAuthStateReady: vi.fn(async () => undefined),
    isFirebaseConfigured: vi.fn(() => false),
    isPermanentUser: vi.fn(() => true),
    mockAuth: auth,
  };
});

vi.mock("../services/core/firebase", () => ({
  isFirebaseConfigured,
  ensureAnonymousUser,
  waitForAuthStateReady,
  getFirebaseAuth: () => mockAuth,
}));

vi.mock("../services/core/accountAuth", () => ({
  APPLE_SIGN_IN_ENABLED: false,
  isPermanentUser,
  isAnonymousUser: vi.fn(() => false),
  sendPremiumEmailSignInLink: vi.fn(),
  completePremiumEmailSignInLink: vi.fn(async () => null),
}));

vi.mock("../components/billing/GoogleSignInButton", () => ({
  GoogleSignInButton: ({
    onSuccess,
  }: {
    onSuccess: () => void;
  }) => (
    <button type="button" onClick={() => void onSuccess()}>
      Continue with Google
    </button>
  ),
}));

vi.mock("../components/billing/AppleSignInButton", () => ({
  AppleSignInButton: ({
    onSuccess,
  }: {
    onSuccess: () => void;
  }) => (
    <button type="button" onClick={() => void onSuccess()}>
      Continue with Apple
    </button>
  ),
}));

vi.mock("../services/billing/premiumBilling", () => ({
  fetchPremiumEntitlements,
  startPremiumCheckout,
  openPremiumBillingPortal,
  recoverPremiumEntitlements: vi.fn(async () => false),
}));

describe("Premium", () => {
  beforeEach(() => {
    isPermanentUser.mockReturnValue(true);
  });

  it("shows offline billing message when Firebase is not configured", () => {
    renderWithRouter(<Premium />);

    expect(screen.getByRole("heading", { name: "Premium" })).toBeInTheDocument();
    expect(
      screen.getByText(/Premium billing needs an online connection/i),
    ).toBeInTheDocument();
  });

  it("renders purchase options and entitlement summary when online", async () => {
    isFirebaseConfigured.mockReturnValue(true);
    fetchPremiumEntitlements.mockResolvedValueOnce({
      premiumSessionCredits: 2,
      lifetimePremium: false,
      subscription: null,
      trialUsedAt: null,
      canCreatePremium: true,
      hasUnlimitedPremium: false,
    });

    renderWithRouter(<Premium />);

    await waitFor(() => {
      expect(
        screen.getByText("2 premium sessions left", { selector: ".premium-entitlement-pill" }),
      ).toBeInTheDocument();
      expect(screen.getByRole("button", { name: /1 session/i })).toBeInTheDocument();
    });

    expect(
      screen.getByRole("link", { name: "Create premium session" }),
    ).toHaveAttribute("href", "/create?tier=premium");
  });

  it("defaults to session packs tab when user has pack credits only", async () => {
    isFirebaseConfigured.mockReturnValue(true);
    fetchPremiumEntitlements.mockResolvedValueOnce({
      premiumSessionCredits: 2,
      lifetimePremium: false,
      subscription: null,
      trialUsedAt: null,
      canCreatePremium: true,
      hasUnlimitedPremium: false,
    });

    renderWithRouter(<Premium />);

    await waitFor(() => {
      expect(screen.getByRole("button", { name: /1 session/i })).toBeVisible();
    });

    expect(screen.queryByRole("button", { name: /Monthly unlimited/i })).not.toBeInTheDocument();
  });

  it("shows unlimited offers on the unlimited tab", async () => {
    isFirebaseConfigured.mockReturnValue(true);
    fetchPremiumEntitlements.mockResolvedValueOnce({
      premiumSessionCredits: 2,
      lifetimePremium: false,
      subscription: null,
      trialUsedAt: null,
      canCreatePremium: true,
      hasUnlimitedPremium: false,
    });

    renderWithRouter(<Premium />);

    await waitFor(() => {
      expect(screen.getByRole("button", { name: /1 session/i })).toBeEnabled();
    });

    fireEvent.click(screen.getByRole("tab", { name: "Unlimited" }));

    await waitFor(() => {
      expect(screen.getByRole("tab", { name: "Unlimited" })).toHaveAttribute(
        "aria-selected",
        "true",
      );
    });

    expect(screen.getByRole("button", { name: /Monthly unlimited/i })).toBeInTheDocument();
    expect(screen.getByRole("button", { name: /Yearly unlimited/i })).toBeInTheDocument();
    expect(screen.getByRole("button", { name: /Lifetime/i })).toBeInTheDocument();
  });

  it("shows sign-in gate before checkout when user is anonymous", async () => {
    isFirebaseConfigured.mockReturnValue(true);
    isPermanentUser.mockReturnValue(false);
    fetchPremiumEntitlements.mockResolvedValueOnce({
      premiumSessionCredits: 0,
      lifetimePremium: false,
      subscription: null,
      trialUsedAt: null,
      canCreatePremium: false,
      hasUnlimitedPremium: false,
    });

    renderWithRouter(<Premium />);

    await waitFor(() => {
      expect(
        screen.getByRole("button", { name: /Continue with Google/i }),
      ).toBeInTheDocument();
    });

    expect(screen.queryByRole("button", { name: /3 sessions/i })).not.toBeInTheDocument();
  });

  it("starts checkout when a pack is selected", async () => {
    isFirebaseConfigured.mockReturnValue(true);
    fetchPremiumEntitlements.mockResolvedValueOnce({
      premiumSessionCredits: 0,
      lifetimePremium: false,
      subscription: null,
      trialUsedAt: null,
      canCreatePremium: false,
      hasUnlimitedPremium: false,
    });
    startPremiumCheckout.mockResolvedValueOnce("https://checkout.test");
    const assignSpy = vi.fn();
    Object.defineProperty(window, "location", {
      configurable: true,
      value: { assign: assignSpy },
    });

    renderWithRouter(<Premium />);

    await waitFor(() => {
      expect(screen.getByRole("tab", { name: "Session packs" })).toBeEnabled();
    });

    fireEvent.click(screen.getByRole("tab", { name: "Session packs" }));

    await waitFor(() => {
      expect(screen.getByRole("button", { name: /3 sessions/i })).toBeEnabled();
    });

    fireEvent.click(screen.getByRole("button", { name: /3 sessions/i }));

    await waitFor(() => {
      expect(startPremiumCheckout).toHaveBeenCalledWith("pack_3");
      expect(assignSpy).toHaveBeenCalledWith("https://checkout.test");
    });
  });
});
