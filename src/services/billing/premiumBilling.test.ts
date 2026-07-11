import { FirebaseError } from "firebase/app";
import { beforeEach, describe, expect, it, vi } from "vitest";
import {
  createPremiumRemoteSession,
  fetchPremiumEntitlements,
  openPremiumBillingPortal,
  startPremiumCheckout,
} from "./premiumBilling";
import { createTestSession } from "../../test/fixtures/sessions";

const { callable, httpsCallable, isFirebaseConfigured } = vi.hoisted(() => {
  const callable = vi.fn();
  const httpsCallable = vi.fn(() => callable);
  const isFirebaseConfigured = vi.fn(() => true);
  return { callable, httpsCallable, isFirebaseConfigured };
});

vi.mock("firebase/functions", () => ({
  httpsCallable,
}));

vi.mock("../core/firebase", () => ({
  isFirebaseConfigured,
  getFirebaseFunctions: () => ({}),
}));

describe("premiumBilling", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    isFirebaseConfigured.mockReturnValue(true);
  });

  it("returns null entitlements when Firebase is offline", async () => {
    isFirebaseConfigured.mockReturnValueOnce(false);

    await expect(fetchPremiumEntitlements()).resolves.toBeNull();
  });

  it("loads premium entitlements from the callable", async () => {
    callable.mockResolvedValueOnce({
      data: {
        premiumSessionCredits: 2,
        lifetimePremium: false,
        subscription: null,
        trialUsedAt: null,
        canCreatePremium: true,
        hasUnlimitedPremium: false,
      },
    });

    await expect(fetchPremiumEntitlements()).resolves.toMatchObject({
      premiumSessionCredits: 2,
      canCreatePremium: true,
    });
    expect(httpsCallable).toHaveBeenCalledWith({}, "getPremiumEntitlements");
  });

  it("maps callable errors when entitlements fail", async () => {
    callable.mockRejectedValueOnce(
      new FirebaseError("functions/internal", "Billing unavailable"),
    );

    await expect(fetchPremiumEntitlements()).rejects.toThrow(
      "Billing unavailable",
    );
  });

  it("starts checkout and returns the redirect URL", async () => {
    callable.mockResolvedValueOnce({ data: { url: "https://checkout.test" } });

    await expect(startPremiumCheckout("pack_3")).resolves.toBe(
      "https://checkout.test",
    );
    expect(callable).toHaveBeenCalledWith({
      productKey: "pack_3",
      startTrial: false,
    });
  });

  it("rejects checkout when the redirect URL is missing", async () => {
    callable.mockResolvedValueOnce({ data: {} });

    await expect(startPremiumCheckout("monthly", { startTrial: true })).rejects.toThrow(
      "Checkout URL missing.",
    );
  });

  it("throws when checkout is requested offline", async () => {
    isFirebaseConfigured.mockReturnValueOnce(false);

    await expect(startPremiumCheckout("pack_1")).rejects.toThrow(
      "Premium billing is not available offline.",
    );
  });

  it("opens the billing portal and returns the redirect URL", async () => {
    callable.mockResolvedValueOnce({ data: { url: "https://portal.test" } });

    await expect(openPremiumBillingPortal()).resolves.toBe("https://portal.test");
  });

  it("creates a premium session from callable payload", async () => {
    const session = createTestSession({ id: "session-premium", code: "PREM" });
    callable.mockResolvedValueOnce({
      data: {
        session: {
          id: session.id,
          code: session.code,
          gameArea: session.gameArea,
          createdAt: session.createdAt,
          memberUids: session.memberUids,
          status: session.status,
          tier: "premium",
        },
      },
    });

    const created = await createPremiumRemoteSession({
      gameArea: session.gameArea,
      hostUid: "host-uid",
      tier: "premium",
      hostRole: "seeker",
      gameSize: "medium",
      rulesPatch: {},
      distanceUnit: "imperial",
      hostAppVersion: "0.4.0",
    });

    expect(created.id).toBe("session-premium");
    expect(created.code).toBe("PREM");
  });
});
