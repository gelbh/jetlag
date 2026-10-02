import { fireEvent, screen, waitFor, within } from "@testing-library/react";
import { MantineProvider } from "@mantine/core";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { Premium } from "./Premium";
import { jetlagTheme } from "@/theme/theme";
import { renderWithRouter } from "../test/renderWithRouter";
import type { PremiumEntitlements } from "../domain/billing/premiumProducts";

const {
  fetchPremiumEntitlements,
  startPremiumCheckout,
  startPremiumTrial,
  openPremiumBillingPortal,
  ensureAnonymousUser,
  isFirebaseConfigured,
  isPermanentUser,
  waitForAuthStateReady,
  mockAuth,
  mockUsePremiumEntitlements,
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
    startPremiumTrial: vi.fn(),
    openPremiumBillingPortal: vi.fn(),
    ensureAnonymousUser: vi.fn(async () => ({ uid: "user-premium" })),
    waitForAuthStateReady: vi.fn(async () => undefined),
    isFirebaseConfigured: vi.fn(() => false),
    isPermanentUser: vi.fn(() => true),
    mockAuth: auth,
    mockUsePremiumEntitlements: vi.fn(() => ({
      entitlements: null as PremiumEntitlements | null,
      loading: false,
      hydrated: true,
      refresh: vi.fn(),
      setEntitlements: vi.fn(),
    })),
  };
});

vi.mock("../services/core/firebase/authBootstrapState", () => ({
  isFirebaseConfigured,
  isAuthBootstrapReady: () => true,
  subscribeAuthBootstrapReady: () => () => undefined,
}));

vi.mock("../services/core/firebase/firebase", () => ({
  isFirebaseConfigured,
  ensureAnonymousUser,
  waitForAuthStateReady,
  getFirebaseAuth: () => mockAuth,
}));

function renderPremium() {
  return renderWithRouter(
    <MantineProvider theme={jetlagTheme} forceColorScheme="dark">
      <Premium />
    </MantineProvider>,
  );
}

vi.mock("../services/core/auth/accountAuth", () => ({
  APPLE_SIGN_IN_ENABLED: false,
  isPermanentUser,
  isAnonymousUser: vi.fn(() => false),
  sendPremiumEmailSignInLink: vi.fn(),
  completePremiumEmailSignInLink: vi.fn(async () => null),
}));

vi.mock("../components/billing/GoogleSignInButton", () => ({
  GoogleSignInButton: ({ onSuccess }: { onSuccess: () => void }) => (
    <button type="button" onClick={() => void onSuccess()}>
      Continue with Google
    </button>
  ),
}));

vi.mock("../components/billing/AppleSignInButton", () => ({
  AppleSignInButton: ({ onSuccess }: { onSuccess: () => void }) => (
    <button type="button" onClick={() => void onSuccess()}>
      Continue with Apple
    </button>
  ),
}));

// Hook loads firebase/auth dynamically; drive `isPermanent` from the mock directly.
vi.mock("../hooks/billing/usePermanentAuthUser", () => ({
  usePermanentAuthUser: () => ({
    user: null,
    isPermanent: isPermanentUser(),
    authReady: true,
  }),
}));

vi.mock("../hooks/billing/usePremiumEntitlements", () => ({
  usePremiumEntitlements: () => mockUsePremiumEntitlements(),
}));

vi.mock("../services/billing/premiumBilling", () => ({
  fetchPremiumEntitlements,
  startPremiumCheckout,
  startPremiumTrial,
  openPremiumBillingPortal,
  recoverPremiumEntitlements: vi.fn(async () => false),
}));

describe("Premium", () => {
  beforeEach(() => {
    isFirebaseConfigured.mockReturnValue(false);
    isPermanentUser.mockReturnValue(true);
    mockUsePremiumEntitlements.mockReturnValue({
      entitlements: null,
      loading: false,
      hydrated: true,
      refresh: vi.fn(),
      setEntitlements: vi.fn(),
    });
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
    vi.stubGlobal(
      "ResizeObserver",
      class {
        observe() {}
        unobserve() {}
        disconnect() {}
      },
    );
  });

  it("uses entry shell layout like Feedback", () => {
    renderPremium();
    const banner = screen.getByRole("banner", { name: "Screen header" });
    expect(banner).toBeInTheDocument();
    expect(
      within(banner).getByRole("heading", { name: "Premium" }),
    ).toBeInTheDocument();
    expect(screen.getAllByRole("heading", { name: "Premium" })).toHaveLength(1);
    expect(
      screen.queryByRole("button", { name: "Back" }),
    ).not.toBeInTheDocument();
    expect(screen.getByRole("link", { name: "Back" })).toHaveAttribute(
      "href",
      "/",
    );
    expect(
      screen.queryByText(
        "Live transit and faster map loads for hosted sessions.",
      ),
    ).toBeInTheDocument();
  });

  it("shows offline billing message when Firebase is not configured", () => {
    renderPremium();

    const banner = screen.getByRole("banner", { name: "Screen header" });
    expect(
      within(banner).getByRole("heading", { name: "Premium" }),
    ).toBeInTheDocument();
    expect(
      screen.getByText(/Premium billing needs an online connection/i),
    ).toBeInTheDocument();
    expect(
      screen.queryByRole("button", { name: /1 session/i }),
    ).not.toBeInTheDocument();
    expect(
      screen.queryByRole("button", { name: /Monthly unlimited/i }),
    ).not.toBeInTheDocument();
    expect(
      screen.queryByRole("radio", { name: /Session packs|Unlimited/i }),
    ).not.toBeInTheDocument();
  });

  it("shows success checkout notice from query param", async () => {
    isFirebaseConfigured.mockReturnValue(true);
    mockUsePremiumEntitlements.mockReturnValue({
      entitlements: {
        premiumSessionCredits: 0,
        lifetimePremium: false,
        subscription: null,
        trialUsedAt: null,
        trialEndsAt: null,
        canCreatePremium: false,
        hasUnlimitedPremium: false,
      },
      loading: false,
      hydrated: true,
      refresh: vi.fn(),
      setEntitlements: vi.fn(),
    });

    renderWithRouter(
      <MantineProvider theme={jetlagTheme} forceColorScheme="dark">
        <Premium />
      </MantineProvider>,
      { route: "/premium?checkout=success" },
    );

    await waitFor(() => {
      expect(
        screen.getByText(/Payment received\. Premium unlock is ready\./i),
      ).toBeInTheDocument();
    });
    expect(
      screen.queryByTestId("premium-checkout-notice-muted"),
    ).not.toBeInTheDocument();
  });

  it("shows muted checkout cancel notice from query param", async () => {
    isFirebaseConfigured.mockReturnValue(true);
    mockUsePremiumEntitlements.mockReturnValue({
      entitlements: {
        premiumSessionCredits: 0,
        lifetimePremium: false,
        subscription: null,
        trialUsedAt: null,
        trialEndsAt: null,
        canCreatePremium: false,
        hasUnlimitedPremium: false,
      },
      loading: false,
      hydrated: true,
      refresh: vi.fn(),
      setEntitlements: vi.fn(),
    });

    renderWithRouter(
      <MantineProvider theme={jetlagTheme} forceColorScheme="dark">
        <Premium />
      </MantineProvider>,
      { route: "/premium?checkout=cancel" },
    );

    await waitFor(() => {
      expect(
        screen.getByTestId("premium-checkout-notice-muted"),
      ).toHaveTextContent(/Checkout canceled\./i);
    });
  });

  it("renders purchase options and entitlement summary when online", async () => {
    isFirebaseConfigured.mockReturnValue(true);
    mockUsePremiumEntitlements.mockReturnValue({
      entitlements: {
        premiumSessionCredits: 2,
        lifetimePremium: false,
        subscription: null,
        trialUsedAt: null,
        trialEndsAt: null,
        canCreatePremium: true,
        hasUnlimitedPremium: false,
      },
      loading: false,
      hydrated: true,
      refresh: vi.fn(),
      setEntitlements: vi.fn(),
    });

    renderPremium();

    await waitFor(() => {
      expect(
        within(screen.getByTestId("premium-entitlement-summary")).getByText(
          "2 premium sessions left",
        ),
      ).toBeInTheDocument();
      expect(
        screen.getByRole("button", { name: /1 session/i }),
      ).toBeInTheDocument();
    });

    expect(
      screen.getByRole("link", { name: "Create premium session" }),
    ).toHaveAttribute("href", "/create?tier=premium");
  });

  it("hides manage subscription when there is no active subscription", async () => {
    isFirebaseConfigured.mockReturnValue(true);
    mockUsePremiumEntitlements.mockReturnValue({
      entitlements: {
        premiumSessionCredits: 0,
        lifetimePremium: false,
        subscription: null,
        trialUsedAt: null,
        trialEndsAt: null,
        canCreatePremium: false,
        hasUnlimitedPremium: false,
      },
      loading: false,
      hydrated: true,
      refresh: vi.fn(),
      setEntitlements: vi.fn(),
    });

    renderPremium();

    await waitFor(() => {
      expect(
        screen.getByRole("radio", { name: "Session packs" }),
      ).toBeEnabled();
    });

    expect(
      screen.queryByRole("button", { name: /Manage subscription/i }),
    ).not.toBeInTheDocument();
  });

  it("shows manage subscription when subscription is active", async () => {
    isFirebaseConfigured.mockReturnValue(true);
    mockUsePremiumEntitlements.mockReturnValue({
      entitlements: {
        premiumSessionCredits: 0,
        lifetimePremium: false,
        subscription: {
          status: "active",
          plan: "monthly",
          currentPeriodEnd: Date.UTC(2026, 6, 15),
        },
        trialUsedAt: null,
        trialEndsAt: null,
        canCreatePremium: true,
        hasUnlimitedPremium: true,
      },
      loading: false,
      hydrated: true,
      refresh: vi.fn(),
      setEntitlements: vi.fn(),
    });

    renderPremium();

    await waitFor(() => {
      expect(
        screen.getByRole("button", { name: /Manage subscription/i }),
      ).toBeInTheDocument();
    });
  });

  it("defaults to session packs tab when user has pack credits only", async () => {
    isFirebaseConfigured.mockReturnValue(true);
    mockUsePremiumEntitlements.mockReturnValue({
      entitlements: {
        premiumSessionCredits: 2,
        lifetimePremium: false,
        subscription: null,
        trialUsedAt: null,
        trialEndsAt: null,
        canCreatePremium: true,
        hasUnlimitedPremium: false,
      },
      loading: false,
      hydrated: true,
      refresh: vi.fn(),
      setEntitlements: vi.fn(),
    });

    renderPremium();

    await waitFor(() => {
      expect(screen.getByRole("button", { name: /1 session/i })).toBeVisible();
    });

    expect(
      screen.queryByRole("button", { name: /Monthly unlimited/i }),
    ).not.toBeInTheDocument();
  });

  it("shows unlimited offers on the unlimited tab", async () => {
    isFirebaseConfigured.mockReturnValue(true);
    mockUsePremiumEntitlements.mockReturnValue({
      entitlements: {
        premiumSessionCredits: 2,
        lifetimePremium: false,
        subscription: null,
        trialUsedAt: null,
        trialEndsAt: null,
        canCreatePremium: true,
        hasUnlimitedPremium: false,
      },
      loading: false,
      hydrated: true,
      refresh: vi.fn(),
      setEntitlements: vi.fn(),
    });

    renderPremium();

    await waitFor(() => {
      expect(screen.getByRole("button", { name: /1 session/i })).toBeEnabled();
    });

    fireEvent.click(screen.getByRole("radio", { name: "Unlimited" }));

    await waitFor(() => {
      expect(screen.getByRole("radio", { name: "Unlimited" })).toBeChecked();
    });

    expect(
      screen.getByRole("button", { name: /Monthly unlimited/i }),
    ).toBeInTheDocument();
    expect(
      screen.getByRole("button", { name: /Yearly unlimited/i }),
    ).toBeInTheDocument();
    expect(
      screen.getByRole("button", { name: /Lifetime/i }),
    ).toBeInTheDocument();
  });

  it("shows sign-in gate before checkout when user is anonymous", async () => {
    isFirebaseConfigured.mockReturnValue(true);
    isPermanentUser.mockReturnValue(false);
    mockUsePremiumEntitlements.mockReturnValue({
      entitlements: {
        premiumSessionCredits: 0,
        lifetimePremium: false,
        subscription: null,
        trialUsedAt: null,
        trialEndsAt: null,
        canCreatePremium: false,
        hasUnlimitedPremium: false,
      },
      loading: false,
      hydrated: true,
      refresh: vi.fn(),
      setEntitlements: vi.fn(),
    });

    renderPremium();

    await waitFor(() => {
      expect(
        screen.getByRole("button", { name: /Continue with Google/i }),
      ).toBeInTheDocument();
    });

    expect(
      screen.queryByRole("button", { name: /3 sessions/i }),
    ).not.toBeInTheDocument();
  });

  it("starts checkout when a pack is selected", async () => {
    isFirebaseConfigured.mockReturnValue(true);
    mockUsePremiumEntitlements.mockReturnValue({
      entitlements: {
        premiumSessionCredits: 0,
        lifetimePremium: false,
        subscription: null,
        trialUsedAt: null,
        trialEndsAt: null,
        canCreatePremium: false,
        hasUnlimitedPremium: false,
      },
      loading: false,
      hydrated: true,
      refresh: vi.fn(),
      setEntitlements: vi.fn(),
    });
    startPremiumCheckout.mockResolvedValueOnce("https://checkout.test");
    const assignSpy = vi.fn();
    Object.defineProperty(window, "location", {
      configurable: true,
      value: { assign: assignSpy },
    });

    renderPremium();

    await waitFor(() => {
      expect(
        screen.getByRole("radio", { name: "Session packs" }),
      ).toBeEnabled();
    });

    fireEvent.click(screen.getByRole("radio", { name: "Session packs" }));

    await waitFor(() => {
      expect(screen.getByRole("button", { name: /3 sessions/i })).toBeEnabled();
    });

    fireEvent.click(screen.getByRole("button", { name: /3 sessions/i }));

    await waitFor(() => {
      expect(startPremiumCheckout).toHaveBeenCalledWith("pack_3");
      expect(assignSpy).toHaveBeenCalledWith("https://checkout.test");
    });
  });

  it("starts checkout when a monthly unlimited offer is selected", async () => {
    isFirebaseConfigured.mockReturnValue(true);
    mockUsePremiumEntitlements.mockReturnValue({
      entitlements: {
        premiumSessionCredits: 0,
        lifetimePremium: false,
        subscription: null,
        trialUsedAt: Date.now(),
        trialEndsAt: null,
        canCreatePremium: false,
        hasUnlimitedPremium: false,
      },
      loading: false,
      hydrated: true,
      refresh: vi.fn(),
      setEntitlements: vi.fn(),
    });
    startPremiumCheckout.mockResolvedValueOnce("https://checkout.unlimited");
    const assignSpy = vi.fn();
    Object.defineProperty(window, "location", {
      configurable: true,
      value: { assign: assignSpy },
    });

    renderPremium();

    await waitFor(() => {
      expect(screen.getByRole("radio", { name: "Unlimited" })).toBeEnabled();
    });

    fireEvent.click(screen.getByRole("radio", { name: "Unlimited" }));

    await waitFor(() => {
      expect(
        screen.getByRole("button", { name: /Monthly unlimited/i }),
      ).toBeEnabled();
    });

    fireEvent.click(screen.getByRole("button", { name: /Monthly unlimited/i }));

    await waitFor(() => {
      expect(startPremiumCheckout).toHaveBeenCalledWith("monthly");
      expect(assignSpy).toHaveBeenCalledWith("https://checkout.unlimited");
    });
  });

  it("starts a free trial from the unlimited tab", async () => {
    isFirebaseConfigured.mockReturnValue(true);
    mockUsePremiumEntitlements.mockReturnValue({
      entitlements: {
        premiumSessionCredits: 0,
        lifetimePremium: false,
        subscription: null,
        trialUsedAt: null,
        trialEndsAt: null,
        canCreatePremium: false,
        hasUnlimitedPremium: false,
      },
      loading: false,
      hydrated: true,
      refresh: vi.fn(),
      setEntitlements: vi.fn((next) => {
        mockUsePremiumEntitlements.mockReturnValue({
          entitlements: next,
          loading: false,
          hydrated: true,
          refresh: vi.fn(),
          setEntitlements: vi.fn(),
        });
      }),
    });
    startPremiumTrial.mockResolvedValueOnce({
      premiumSessionCredits: 0,
      lifetimePremium: false,
      subscription: null,
      trialUsedAt: Date.now(),
      trialEndsAt: Date.now() + 7 * 24 * 60 * 60 * 1000,
      canCreatePremium: true,
      hasUnlimitedPremium: true,
    });

    renderPremium();

    await waitFor(() => {
      expect(screen.getByRole("radio", { name: "Unlimited" })).toBeEnabled();
    });

    fireEvent.click(screen.getByRole("radio", { name: "Unlimited" }));

    await waitFor(() => {
      expect(
        screen.getByRole("button", { name: /7-day free trial/i }),
      ).toBeEnabled();
    });

    fireEvent.click(screen.getByRole("button", { name: /7-day free trial/i }));

    await waitFor(() => {
      expect(startPremiumTrial).toHaveBeenCalled();
    });
  });
});
