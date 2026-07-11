import { describe, expect, it } from "vitest";
import {
  formatEntitlementSummary,
  formatPremiumSessionCreditsLabel,
  formatPremiumSessionTierHint,
  canSelectPremiumSessionTier,
  hasUnlimitedPremiumHosting,
  PREMIUM_PRODUCT_OFFERS,
  type PremiumEntitlements,
} from "./premiumProducts";

const baseEntitlements: PremiumEntitlements = {
  premiumSessionCredits: 0,
  lifetimePremium: false,
  subscription: null,
  trialUsedAt: null,
  canCreatePremium: false,
  hasUnlimitedPremium: false,
};

describe("premiumProducts", () => {
  it("lists all premium product offers", () => {
    expect(PREMIUM_PRODUCT_OFFERS.map((offer) => offer.key)).toEqual([
      "pack_1",
      "pack_3",
      "pack_5",
      "monthly",
      "yearly",
      "lifetime",
    ]);
  });

  describe("formatEntitlementSummary", () => {
    it("returns null when entitlements are missing", () => {
      expect(formatEntitlementSummary(null)).toBeNull();
    });

    it("summarizes a single remaining session credit", () => {
      expect(
        formatEntitlementSummary({
          ...baseEntitlements,
          premiumSessionCredits: 1,
        }),
      ).toBe("1 premium session left");
    });

    it("summarizes multiple session credits", () => {
      expect(
        formatEntitlementSummary({
          ...baseEntitlements,
          premiumSessionCredits: 3,
        }),
      ).toBe("3 premium sessions left");
    });

    it("summarizes lifetime premium", () => {
      expect(
        formatEntitlementSummary({
          ...baseEntitlements,
          lifetimePremium: true,
          hasUnlimitedPremium: true,
          canCreatePremium: true,
        }),
      ).toBe("Lifetime premium");
    });

    it("summarizes an active subscription", () => {
      expect(
        formatEntitlementSummary({
          ...baseEntitlements,
          hasUnlimitedPremium: true,
          canCreatePremium: true,
          subscription: {
            status: "active",
            plan: "monthly",
            currentPeriodEnd: 1_700_000_000_000,
          },
        }),
      ).toBe("Premium subscription active");
    });

    it("summarizes a trialing subscription", () => {
      expect(
        formatEntitlementSummary({
          ...baseEntitlements,
          hasUnlimitedPremium: true,
          canCreatePremium: true,
          subscription: {
            status: "trialing",
            plan: "yearly",
            currentPeriodEnd: 1_700_000_000_000,
          },
        }),
      ).toBe("Premium trial active");
    });

    it("returns null when no premium access remains", () => {
      expect(formatEntitlementSummary(baseEntitlements)).toBeNull();
    });
  });

  describe("premium session tier helpers", () => {
    it("allows premium tier selection for unlimited hosting only", () => {
      expect(canSelectPremiumSessionTier(null, false)).toBe(false);
      expect(
        canSelectPremiumSessionTier(
          {
            ...baseEntitlements,
            premiumSessionCredits: 2,
            canCreatePremium: true,
          },
          false,
        ),
      ).toBe(false);
      expect(
        canSelectPremiumSessionTier(
          {
            ...baseEntitlements,
            hasUnlimitedPremium: true,
            canCreatePremium: true,
            subscription: {
              status: "active",
              plan: "monthly",
              currentPeriodEnd: null,
            },
          },
          false,
        ),
      ).toBe(true);
      expect(canSelectPremiumSessionTier(null, true)).toBe(true);
    });

    it("formats pack credits and unlimited tier hints", () => {
      expect(
        formatPremiumSessionCreditsLabel({
          ...baseEntitlements,
          premiumSessionCredits: 2,
        }),
      ).toBe("2 premium sessions left");
      expect(
        formatPremiumSessionTierHint({
          ...baseEntitlements,
          lifetimePremium: true,
          hasUnlimitedPremium: true,
        }),
      ).toBe("Lifetime · unlimited sessions");
      expect(hasUnlimitedPremiumHosting(null)).toBe(false);
    });
  });
});
