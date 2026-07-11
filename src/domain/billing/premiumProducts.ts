export type PremiumProductKey =
  | "pack_1"
  | "pack_3"
  | "pack_5"
  | "monthly"
  | "yearly"
  | "lifetime";

export interface PremiumEntitlements {
  premiumSessionCredits: number;
  lifetimePremium: boolean;
  subscription: {
    status: string | null;
    plan: "monthly" | "yearly" | null;
    currentPeriodEnd: number | null;
  } | null;
  trialUsedAt: number | null;
  canCreatePremium: boolean;
  hasUnlimitedPremium: boolean;
}

export interface PremiumProductOffer {
  key: PremiumProductKey;
  label: string;
  priceLabel: string;
  detail: string;
  kind: "pack" | "subscription" | "lifetime";
  sessions?: number;
  trialEligible?: boolean;
}

export const PREMIUM_PRODUCT_OFFERS: PremiumProductOffer[] = [
  {
    key: "pack_1",
    label: "1 session",
    priceLabel: "€2.99",
    detail: "One premium session with live transit.",
    kind: "pack",
    sessions: 1,
  },
  {
    key: "pack_3",
    label: "3 sessions",
    priceLabel: "€7.99",
    detail: "Three premium sessions. Credits never expire.",
    kind: "pack",
    sessions: 3,
  },
  {
    key: "pack_5",
    label: "5 sessions",
    priceLabel: "€11.99",
    detail: "Five premium sessions. Best per-session value.",
    kind: "pack",
    sessions: 5,
  },
  {
    key: "monthly",
    label: "Monthly unlimited",
    priceLabel: "€8.99/mo",
    detail: "Create as many premium sessions as you need each month.",
    kind: "subscription",
    trialEligible: true,
  },
  {
    key: "yearly",
    label: "Yearly unlimited",
    priceLabel: "€74.99/yr",
    detail: "Unlimited premium sessions for a year (~31% off monthly).",
    kind: "subscription",
    trialEligible: true,
  },
  {
    key: "lifetime",
    label: "Lifetime",
    priceLabel: "€89.99",
    detail: "Unlimited premium sessions, one-time payment.",
    kind: "lifetime",
  },
];

export function formatEntitlementSummary(
  entitlements: PremiumEntitlements | null,
): string | null {
  if (!entitlements) {
    return null;
  }

  if (entitlements.lifetimePremium || entitlements.hasUnlimitedPremium) {
    if (entitlements.subscription?.status === "trialing") {
      return "Premium trial active";
    }
    if (entitlements.lifetimePremium) {
      return "Lifetime premium";
    }
    return "Premium subscription active";
  }

  if (entitlements.premiumSessionCredits > 0) {
    const count = entitlements.premiumSessionCredits;
    return count === 1 ? "1 premium session left" : `${count} premium sessions left`;
  }

  return null;
}
