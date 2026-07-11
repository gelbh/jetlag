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
  trialEndsAt: number | null;
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
  },
  {
    key: "yearly",
    label: "Yearly unlimited",
    priceLabel: "€74.99/yr",
    detail: "Unlimited premium sessions for a year (~31% off monthly).",
    kind: "subscription",
  },
  {
    key: "lifetime",
    label: "Lifetime",
    priceLabel: "€89.99",
    detail: "Unlimited premium sessions, one-time payment.",
    kind: "lifetime",
  },
];

export function isAppPremiumTrialActive(
  entitlements: PremiumEntitlements | null,
): boolean {
  if (!entitlements?.trialEndsAt) {
    return false;
  }

  if (entitlements.trialEndsAt <= Date.now()) {
    return false;
  }

  if (entitlements.lifetimePremium) {
    return false;
  }

  const status = entitlements.subscription?.status;
  if (status === "active" || status === "trialing") {
    return false;
  }

  return true;
}

export function canStartPremiumTrial(
  entitlements: PremiumEntitlements | null,
): boolean {
  if (!entitlements || entitlements.trialUsedAt != null) {
    return false;
  }

  if (entitlements.lifetimePremium || hasUnlimitedPremiumHosting(entitlements)) {
    return false;
  }

  return true;
}

export function hasUnlimitedPremiumHosting(
  entitlements: PremiumEntitlements | null,
): boolean {
  if (!entitlements) {
    return false;
  }

  return entitlements.lifetimePremium || entitlements.hasUnlimitedPremium;
}

export function canSelectPremiumSessionTier(
  entitlements: PremiumEntitlements | null,
  hostHasAccessClaim: boolean,
): boolean {
  if (hostHasAccessClaim) {
    return true;
  }

  if (!entitlements) {
    return false;
  }

  if (entitlements.lifetimePremium) {
    return true;
  }

  if (isAppPremiumTrialActive(entitlements)) {
    return true;
  }

  const status = entitlements.subscription?.status;
  return status === "active" || status === "trialing";
}

export function formatPremiumSessionCreditsLabel(
  entitlements: PremiumEntitlements | null,
): string | null {
  if (!entitlements || entitlements.premiumSessionCredits <= 0) {
    return null;
  }

  const count = entitlements.premiumSessionCredits;
  return count === 1 ? "1 premium session left" : `${count} premium sessions left`;
}

export function formatBankedPremiumSessionCreditsLabel(
  entitlements: PremiumEntitlements | null,
): string | null {
  if (
    !entitlements ||
    entitlements.premiumSessionCredits <= 0 ||
    !hasUnlimitedPremiumHosting(entitlements)
  ) {
    return null;
  }

  const count = entitlements.premiumSessionCredits;
  return count === 1 ? "1 session saved" : `${count} sessions saved`;
}

function joinEntitlementSummaryParts(
  ...parts: Array<string | null | undefined>
): string {
  return parts.filter((part): part is string => Boolean(part)).join(" · ");
}

export function formatPremiumSessionTierHint(
  entitlements: PremiumEntitlements | null,
): string | null {
  if (!entitlements) {
    return null;
  }

  if (hasUnlimitedPremiumHosting(entitlements)) {
    const unlimitedHint =
      isAppPremiumTrialActive(entitlements) && entitlements.trialEndsAt != null
        ? formatPremiumPeriodEndLabel(entitlements.trialEndsAt, {
            trial: true,
          })
        : entitlements.lifetimePremium
          ? "Lifetime · unlimited sessions"
          : entitlements.subscription?.status === "trialing"
            ? "Trial · unlimited sessions"
            : "Unlimited premium sessions";

    return joinEntitlementSummaryParts(
      unlimitedHint,
      formatBankedPremiumSessionCreditsLabel(entitlements),
    );
  }

  return formatPremiumSessionCreditsLabel(entitlements);
}

export type HomePremiumButtonVariant = "default" | "sessions" | "unlimited";

export interface HomePremiumButtonDisplay {
  variant: HomePremiumButtonVariant;
  primaryLabel: string;
  planLabel: string | null;
  detailLabel: string;
}

function formatPremiumPeriodEndLabel(
  currentPeriodEnd: number,
  options: { trial?: boolean } = {},
): string {
  const formatted = new Intl.DateTimeFormat(undefined, {
    month: "short",
    day: "numeric",
    year: "numeric",
  }).format(new Date(currentPeriodEnd));

  if (options.trial) {
    return `Trial ends ${formatted}`;
  }

  return `Renews ${formatted}`;
}

export function resolveHomePremiumButtonDisplay(
  entitlements: PremiumEntitlements | null,
): HomePremiumButtonDisplay {
  const defaultDisplay: HomePremiumButtonDisplay = {
    variant: "default",
    primaryLabel: "Premium",
    planLabel: null,
    detailLabel: "Live transit hosting",
  };

  if (!entitlements) {
    return defaultDisplay;
  }

  if (entitlements.lifetimePremium) {
    return {
      variant: "unlimited",
      primaryLabel: "Premium",
      planLabel: "Lifetime",
      detailLabel: joinEntitlementSummaryParts(
        "Unlimited hosting",
        formatBankedPremiumSessionCreditsLabel(entitlements),
      ),
    };
  }

  if (isAppPremiumTrialActive(entitlements) && entitlements.trialEndsAt != null) {
    return {
      variant: "unlimited",
      primaryLabel: "Premium",
      planLabel: "Free trial",
      detailLabel: joinEntitlementSummaryParts(
        formatPremiumPeriodEndLabel(entitlements.trialEndsAt, { trial: true }),
        formatBankedPremiumSessionCreditsLabel(entitlements),
      ),
    };
  }

  const subscription = entitlements.subscription;
  if (
    entitlements.hasUnlimitedPremium &&
    subscription &&
    (subscription.status === "active" || subscription.status === "trialing")
  ) {
    const isTrial = subscription.status === "trialing";
    const planLabel =
      subscription.plan === "yearly"
        ? isTrial
          ? "Yearly trial"
          : "Yearly"
        : isTrial
          ? "Monthly trial"
          : "Monthly";
    const detailLabel = joinEntitlementSummaryParts(
      subscription.currentPeriodEnd != null
        ? formatPremiumPeriodEndLabel(subscription.currentPeriodEnd, {
            trial: isTrial,
          })
        : isTrial
          ? "Trial active"
          : "Subscription active",
      formatBankedPremiumSessionCreditsLabel(entitlements),
    );

    return {
      variant: "unlimited",
      primaryLabel: "Premium",
      planLabel,
      detailLabel,
    };
  }

  const packSummary = formatPremiumSessionCreditsLabel(entitlements);
  if (packSummary) {
    return {
      variant: "sessions",
      primaryLabel: "Premium",
      planLabel: "Session pack",
      detailLabel: packSummary,
    };
  }

  return defaultDisplay;
}

export function formatEntitlementSummary(
  entitlements: PremiumEntitlements | null,
): string | null {
  if (!entitlements) {
    return null;
  }

  if (entitlements.lifetimePremium || entitlements.hasUnlimitedPremium) {
    const primarySummary =
      isAppPremiumTrialActive(entitlements) && entitlements.trialEndsAt != null
        ? formatPremiumPeriodEndLabel(entitlements.trialEndsAt, {
            trial: true,
          })
        : entitlements.subscription?.status === "trialing"
          ? "Premium trial active"
          : entitlements.lifetimePremium
            ? "Lifetime premium"
            : "Premium subscription active";

    return joinEntitlementSummaryParts(
      primarySummary,
      formatBankedPremiumSessionCreditsLabel(entitlements),
    );
  }

  if (entitlements.premiumSessionCredits > 0) {
    const count = entitlements.premiumSessionCredits;
    return count === 1 ? "1 premium session left" : `${count} premium sessions left`;
  }

  return null;
}
