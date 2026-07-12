import { beforeEach, describe, expect, it, vi } from "vitest";
import { usePremiumEntitlementsStore } from "./premiumEntitlementsStore";

const mockFetchPremiumEntitlements = vi.fn();
const mockEnsureAnonymousUser = vi.fn();

vi.mock("../services/core/firebase", () => ({
  ensureAnonymousUser: () => mockEnsureAnonymousUser(),
  isFirebaseConfigured: () => true,
}));

vi.mock("../services/billing/premiumBilling", () => ({
  fetchPremiumEntitlements: () => mockFetchPremiumEntitlements(),
}));

describe("usePremiumEntitlementsStore", () => {
  beforeEach(() => {
    mockFetchPremiumEntitlements.mockReset();
    mockEnsureAnonymousUser.mockReset();
    usePremiumEntitlementsStore.setState({
      uid: null,
      entitlements: null,
      loading: false,
      hydrated: false,
      generation: 0,
    });
  });

  it("commits entitlements after uid changes during refresh", async () => {
    mockEnsureAnonymousUser.mockResolvedValue({ uid: "user-1" });
    mockFetchPremiumEntitlements.mockResolvedValue({
      premiumSessionCredits: 1,
      lifetimePremium: false,
      subscription: null,
      trialUsedAt: null,
      trialEndsAt: null,
      canCreatePremium: true,
      hasUnlimitedPremium: false,
    });

    const entitlements = await usePremiumEntitlementsStore.getState().refresh();

    expect(entitlements?.premiumSessionCredits).toBe(1);
    expect(usePremiumEntitlementsStore.getState().uid).toBe("user-1");
    expect(usePremiumEntitlementsStore.getState().entitlements?.premiumSessionCredits).toBe(1);
  });
});
