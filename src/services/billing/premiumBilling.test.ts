import { FirebaseError } from "firebase/app";
import { beforeEach, describe, expect, it, vi } from "vitest";
import {
  createPremiumRemoteSession,
  fetchPremiumEntitlements,
  openPremiumBillingPortal,
  startPremiumCheckout,
  startPremiumTrial,
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
  getFirebaseFunctions: vi.fn(async () => ({})),
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
        trialEndsAt: null,
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

  it("maps generic INTERNAL callable errors to fallback text", async () => {
    callable.mockRejectedValueOnce(
      new FirebaseError("functions/internal", "INTERNAL"),
    );

    await expect(startPremiumCheckout("pack_1")).rejects.toThrow(
      "Could not start checkout.",
    );
  });

  it("starts checkout and returns the redirect URL", async () => {
    callable.mockResolvedValueOnce({ data: { url: "https://checkout.test" } });

    await expect(startPremiumCheckout("pack_3")).resolves.toBe(
      "https://checkout.test",
    );
    expect(callable).toHaveBeenCalledWith({
      productKey: "pack_3",
    });
  });

  it("rejects checkout when the redirect URL is missing", async () => {
    callable.mockResolvedValueOnce({ data: {} });

    await expect(startPremiumCheckout("monthly")).rejects.toThrow(
      "Checkout URL missing.",
    );
  });

  it("starts the app-managed free trial", async () => {
    callable.mockResolvedValueOnce({
      data: {
        premiumSessionCredits: 0,
        lifetimePremium: false,
        subscription: null,
        trialUsedAt: Date.now(),
        trialEndsAt: Date.now() + 7 * 24 * 60 * 60 * 1000,
        canCreatePremium: true,
        hasUnlimitedPremium: true,
      },
    });

    await expect(startPremiumTrial()).resolves.toMatchObject({
      hasUnlimitedPremium: true,
      canCreatePremium: true,
    });
    expect(httpsCallable).toHaveBeenCalledWith({}, "startPremiumTrial");
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
