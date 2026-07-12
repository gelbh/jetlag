import { describe, expect, it } from "vitest";
import {
  canStartPremiumTrial,
  formatBankedPremiumSessionCreditsLabel,
  formatEntitlementSummary,
  formatPremiumSessionCreditsLabel,
  formatPremiumSessionTierHint,
  canSelectPremiumSessionTier,
  hasUnlimitedPremiumHosting,
  isAppPremiumTrialActive,
  shouldDefaultSessionTierToPremium,
  PREMIUM_PRODUCT_OFFERS,
  resolveHomePremiumButtonDisplay,
  type PremiumEntitlements,
} from "./premiumProducts";

const baseEntitlements: PremiumEntitlements = {
  premiumSessionCredits: 0,
  lifetimePremium: false,
  subscription: null,
  trialUsedAt: null,
  trialEndsAt: null,
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

  describe("resolveHomePremiumButtonDisplay", () => {
    it("returns the default pitch when entitlements are missing", () => {
      expect(resolveHomePremiumButtonDisplay(null)).toEqual({
        variant: "default",
        primaryLabel: "Premium",
        planLabel: null,
        detailLabel: "Live transit hosting",
      });
    });

    it("highlights lifetime premium with unlimited styling", () => {
      expect(
        resolveHomePremiumButtonDisplay({
          ...baseEntitlements,
          lifetimePremium: true,
          hasUnlimitedPremium: true,
          canCreatePremium: true,
        }),
      ).toEqual({
        variant: "unlimited",
        primaryLabel: "Premium",
        planLabel: "Lifetime",
        detailLabel: "Unlimited hosting",
      });
    });

    it("shows monthly renewal date for active subscriptions", () => {
      const display = resolveHomePremiumButtonDisplay({
        ...baseEntitlements,
        hasUnlimitedPremium: true,
        canCreatePremium: true,
        subscription: {
          status: "active",
          plan: "monthly",
          currentPeriodEnd: Date.UTC(2026, 6, 15),
        },
      });

      expect(display.variant).toBe("unlimited");
      expect(display.planLabel).toBe("Monthly");
      expect(display.detailLabel).toMatch(/^Renews Jul 15, 2026$/);
    });

    it("shows yearly trial end date", () => {
      const display = resolveHomePremiumButtonDisplay({
        ...baseEntitlements,
        hasUnlimitedPremium: true,
        canCreatePremium: true,
        subscription: {
          status: "trialing",
          plan: "yearly",
          currentPeriodEnd: Date.UTC(2026, 0, 4),
        },
      });

      expect(display.planLabel).toBe("Yearly trial");
      expect(display.detailLabel).toMatch(/^Trial ends Jan 4, 2026$/);
    });

    it("shows app-managed free trial end date", () => {
      const trialEndsAt = Date.now() + 7 * 24 * 60 * 60 * 1000;
      const display = resolveHomePremiumButtonDisplay({
        ...baseEntitlements,
        hasUnlimitedPremium: true,
        canCreatePremium: true,
        trialUsedAt: Date.now(),
        trialEndsAt,
      });

      expect(display.planLabel).toBe("Free trial");
      expect(display.detailLabel).toMatch(/^Trial ends /);
    });

    it("highlights session pack credits with sessions styling", () => {
      expect(
        resolveHomePremiumButtonDisplay({
          ...baseEntitlements,
          premiumSessionCredits: 2,
          canCreatePremium: true,
        }),
      ).toEqual({
        variant: "sessions",
        primaryLabel: "Premium",
        planLabel: "Session pack",
        detailLabel: "2 premium sessions left",
      });
    });
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

    it("summarizes an app-managed free trial", () => {
      const trialEndsAt = Date.now() + 7 * 24 * 60 * 60 * 1000;
      expect(
        formatEntitlementSummary({
          ...baseEntitlements,
          hasUnlimitedPremium: true,
          canCreatePremium: true,
          trialUsedAt: Date.now(),
          trialEndsAt,
        }),
      ).toMatch(/^Trial ends /);
    });

    it("shows banked session credits during unlimited hosting", () => {
      expect(
        formatEntitlementSummary({
          ...baseEntitlements,
          premiumSessionCredits: 2,
          hasUnlimitedPremium: true,
          canCreatePremium: true,
          subscription: {
            status: "active",
            plan: "monthly",
            currentPeriodEnd: Date.UTC(2026, 6, 15),
          },
        }),
      ).toBe("Premium subscription active · 2 sessions saved");

      expect(
        formatBankedPremiumSessionCreditsLabel({
          ...baseEntitlements,
          premiumSessionCredits: 2,
          hasUnlimitedPremium: true,
        }),
      ).toBe("2 sessions saved");

      expect(
        formatBankedPremiumSessionCreditsLabel({
          ...baseEntitlements,
          premiumSessionCredits: 2,
          hasUnlimitedPremium: false,
        }),
      ).toBeNull();
    });

    it("returns null when no premium access remains", () => {
      expect(formatEntitlementSummary(baseEntitlements)).toBeNull();
    });
  });

  describe("premium session tier helpers", () => {
    it("allows premium tier selection for subscription, trial, or lifetime only", () => {
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
      expect(
        canSelectPremiumSessionTier(
          {
            ...baseEntitlements,
            hasUnlimitedPremium: true,
            canCreatePremium: true,
            trialUsedAt: Date.now(),
            trialEndsAt: Date.now() + 7 * 24 * 60 * 60 * 1000,
          },
          false,
        ),
      ).toBe(true);
      expect(
        canSelectPremiumSessionTier(
          {
            ...baseEntitlements,
            lifetimePremium: true,
            hasUnlimitedPremium: true,
            canCreatePremium: true,
          },
          false,
        ),
      ).toBe(true);
      expect(
        canSelectPremiumSessionTier(
          {
            ...baseEntitlements,
            premiumSessionCredits: 1,
            hasUnlimitedPremium: true,
            canCreatePremium: true,
            subscription: {
              status: "canceled",
              plan: "monthly",
              currentPeriodEnd: null,
            },
          },
          false,
        ),
      ).toBe(false);
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

    it("detects app trial eligibility and active state", () => {
      const trialEndsAt = Date.now() + 7 * 24 * 60 * 60 * 1000;
      const activeTrial = {
        ...baseEntitlements,
        hasUnlimitedPremium: true,
        canCreatePremium: true,
        trialUsedAt: Date.now(),
        trialEndsAt,
      };

      expect(isAppPremiumTrialActive(activeTrial)).toBe(true);
      expect(canStartPremiumTrial(activeTrial)).toBe(false);
      expect(canStartPremiumTrial(baseEntitlements)).toBe(true);
      expect(
        canStartPremiumTrial({
          ...baseEntitlements,
          subscription: {
            status: "past_due",
            plan: "monthly",
            currentPeriodEnd: null,
          },
        }),
      ).toBe(false);
    });
  });

  describe("shouldDefaultSessionTierToPremium", () => {
    it("defaults subscription, trial, and access hosts to premium", () => {
      expect(shouldDefaultSessionTierToPremium(null, true)).toBe(true);
      expect(
        shouldDefaultSessionTierToPremium(
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
      expect(
        shouldDefaultSessionTierToPremium(
          {
            ...baseEntitlements,
            trialUsedAt: Date.now(),
            trialEndsAt: Date.now() + 86_400_000,
          },
          false,
        ),
      ).toBe(true);
      expect(shouldDefaultSessionTierToPremium(baseEntitlements, false)).toBe(
        false,
      );
    });
  });
});
