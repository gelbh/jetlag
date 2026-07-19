import { beforeEach, describe, expect, it, vi } from "vitest";

const STORAGE_KEY = "jetlag-premium-entitlements-v1";

const mockFetchPremiumEntitlements = vi.fn();
const mockEnsureAnonymousUser = vi.fn();

vi.mock("../services/core/firebase", () => ({
  ensureAnonymousUser: () => mockEnsureAnonymousUser(),
  isFirebaseConfigured: () => true,
}));

vi.mock("../services/billing/premiumBilling", () => ({
  fetchPremiumEntitlements: () => mockFetchPremiumEntitlements(),
}));

const sampleEntitlements = {
  premiumSessionCredits: 1,
  lifetimePremium: false,
  subscription: null,
  trialUsedAt: null,
  trialEndsAt: null,
  canCreatePremium: true,
  hasUnlimitedPremium: false,
};

describe("usePremiumEntitlementsStore", () => {
  beforeEach(() => {
    localStorage.clear();
    mockFetchPremiumEntitlements.mockReset();
    mockEnsureAnonymousUser.mockReset();
    vi.resetModules();
  });

  it("commits entitlements after uid changes during refresh", async () => {
    const { usePremiumEntitlementsStore } = await import(
      "./premiumEntitlementsStore"
    );
    usePremiumEntitlementsStore.setState({
      uid: null,
      entitlements: null,
      loading: false,
      hydrated: false,
      softStale: false,
      generation: 0,
    });

    mockEnsureAnonymousUser.mockResolvedValue({ uid: "user-1" });
    mockFetchPremiumEntitlements.mockResolvedValue(sampleEntitlements);

    const entitlements = await usePremiumEntitlementsStore.getState().refresh();

    expect(entitlements?.premiumSessionCredits).toBe(1);
    expect(usePremiumEntitlementsStore.getState().uid).toBe("user-1");
    expect(
      usePremiumEntitlementsStore.getState().entitlements?.premiumSessionCredits,
    ).toBe(1);
  });

  it("hydrates last-good entitlements for matching uid", async () => {
    localStorage.setItem(
      STORAGE_KEY,
      JSON.stringify({
        uid: "u1",
        entitlements: sampleEntitlements,
        fetchedAt: Date.now(),
      }),
    );
    const { usePremiumEntitlementsStore } = await import(
      "./premiumEntitlementsStore"
    );
    usePremiumEntitlementsStore.setState({
      uid: null,
      entitlements: null,
      loading: false,
      hydrated: false,
      softStale: false,
      generation: 0,
    });
    usePremiumEntitlementsStore.getState().setUid("u1");
    expect(usePremiumEntitlementsStore.getState().entitlements).toEqual(
      sampleEntitlements,
    );
  });

  it("keeps snapshot when refresh fails", async () => {
    localStorage.setItem(
      STORAGE_KEY,
      JSON.stringify({
        uid: "user-1",
        entitlements: sampleEntitlements,
        fetchedAt: Date.now(),
      }),
    );
    const { usePremiumEntitlementsStore } = await import(
      "./premiumEntitlementsStore"
    );
    usePremiumEntitlementsStore.setState({
      uid: null,
      entitlements: null,
      loading: false,
      hydrated: false,
      softStale: false,
      generation: 0,
    });
    usePremiumEntitlementsStore.getState().setUid("user-1");

    mockEnsureAnonymousUser.mockResolvedValue({ uid: "user-1" });
    mockFetchPremiumEntitlements.mockRejectedValue(new Error("network"));

    const result = await usePremiumEntitlementsStore.getState().refresh();

    expect(result?.premiumSessionCredits).toBe(1);
    expect(usePremiumEntitlementsStore.getState().entitlements).toEqual(
      sampleEntitlements,
    );
    expect(usePremiumEntitlementsStore.getState().softStale).toBe(true);
  });
});
