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

  if (entitlements.subscription?.status === "past_due") {
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

export type PremiumEntitlementDisplayKind =
  | "none"
  | "packCredits"
  | "lifetime"
  | "appTrial"
  | "stripeTrialing"
  | "stripeActive";

export interface PremiumEntitlementDisplayState {
  kind: PremiumEntitlementDisplayKind;
  periodEnd: number | null;
  subscriptionPlan: "monthly" | "yearly" | null;
  packCredits: number;
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

export function resolvePremiumEntitlementDisplayState(
  entitlements: PremiumEntitlements | null,
): PremiumEntitlementDisplayState {
  if (!entitlements) {
    return {
      kind: "none",
      periodEnd: null,
      subscriptionPlan: null,
      packCredits: 0,
    };
  }

  if (entitlements.lifetimePremium) {
    return {
      kind: "lifetime",
      periodEnd: null,
      subscriptionPlan: null,
      packCredits: entitlements.premiumSessionCredits,
    };
  }

  if (isAppPremiumTrialActive(entitlements) && entitlements.trialEndsAt != null) {
    return {
      kind: "appTrial",
      periodEnd: entitlements.trialEndsAt,
      subscriptionPlan: null,
      packCredits: entitlements.premiumSessionCredits,
    };
  }

  const subscription = entitlements.subscription;
  if (
    entitlements.hasUnlimitedPremium &&
    subscription &&
    (subscription.status === "active" || subscription.status === "trialing")
  ) {
    return {
      kind: subscription.status === "trialing" ? "stripeTrialing" : "stripeActive",
      periodEnd: subscription.currentPeriodEnd,
      subscriptionPlan: subscription.plan,
      packCredits: entitlements.premiumSessionCredits,
    };
  }

  if (entitlements.premiumSessionCredits > 0) {
    return {
      kind: "packCredits",
      periodEnd: null,
      subscriptionPlan: null,
      packCredits: entitlements.premiumSessionCredits,
    };
  }

  return {
    kind: "none",
    periodEnd: null,
    subscriptionPlan: null,
    packCredits: 0,
  };
}

function bankedCreditsLabelForState(
  entitlements: PremiumEntitlements | null,
): string | null {
  return formatBankedPremiumSessionCreditsLabel(entitlements);
}

export function formatPremiumSessionTierHint(
  entitlements: PremiumEntitlements | null,
): string | null {
  if (!entitlements) {
    return null;
  }

  const state = resolvePremiumEntitlementDisplayState(entitlements);

  switch (state.kind) {
    case "lifetime":
      return joinEntitlementSummaryParts(
        "Lifetime · unlimited sessions",
        bankedCreditsLabelForState(entitlements),
      );
    case "appTrial":
      return joinEntitlementSummaryParts(
        state.periodEnd != null
          ? formatPremiumPeriodEndLabel(state.periodEnd, { trial: true })
          : "Trial · unlimited sessions",
        bankedCreditsLabelForState(entitlements),
      );
    case "stripeTrialing":
      return joinEntitlementSummaryParts(
        "Trial · unlimited sessions",
        bankedCreditsLabelForState(entitlements),
      );
    case "stripeActive":
      return joinEntitlementSummaryParts(
        "Unlimited premium sessions",
        bankedCreditsLabelForState(entitlements),
      );
    case "packCredits":
      return formatPremiumSessionCreditsLabel(entitlements);
    case "none":
      return null;
    default: {
      const _exhaustive: never = state.kind;
      return _exhaustive;
    }
  }
}

export type HomePremiumButtonVariant = "default" | "sessions" | "unlimited";

export interface HomePremiumButtonDisplay {
  variant: HomePremiumButtonVariant;
  primaryLabel: string;
  planLabel: string | null;
  detailLabel: string;
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

  const state = resolvePremiumEntitlementDisplayState(entitlements);
  const bankedLabel = bankedCreditsLabelForState(entitlements);

  switch (state.kind) {
    case "lifetime":
      return {
        variant: "unlimited",
        primaryLabel: "Premium",
        planLabel: "Lifetime",
        detailLabel: joinEntitlementSummaryParts("Unlimited hosting", bankedLabel),
      };
    case "appTrial":
      return {
        variant: "unlimited",
        primaryLabel: "Premium",
        planLabel: "Free trial",
        detailLabel: joinEntitlementSummaryParts(
          state.periodEnd != null
            ? formatPremiumPeriodEndLabel(state.periodEnd, { trial: true })
            : "Trial active",
          bankedLabel,
        ),
      };
    case "stripeTrialing":
    case "stripeActive": {
      const isTrial = state.kind === "stripeTrialing";
      const planLabel =
        state.subscriptionPlan === "yearly"
          ? isTrial
            ? "Yearly trial"
            : "Yearly"
          : isTrial
            ? "Monthly trial"
            : "Monthly";
      const detailLabel = joinEntitlementSummaryParts(
        state.periodEnd != null
          ? formatPremiumPeriodEndLabel(state.periodEnd, { trial: isTrial })
          : isTrial
            ? "Trial active"
            : "Subscription active",
        bankedLabel,
      );

      return {
        variant: "unlimited",
        primaryLabel: "Premium",
        planLabel,
        detailLabel,
      };
    }
    case "packCredits": {
      const packSummary = formatPremiumSessionCreditsLabel(entitlements);
      return {
        variant: "sessions",
        primaryLabel: "Premium",
        planLabel: "Session pack",
        detailLabel: packSummary ?? "Session pack",
      };
    }
    case "none":
      return defaultDisplay;
    default: {
      const _exhaustive: never = state.kind;
      return _exhaustive;
    }
  }
}

export function formatEntitlementSummary(
  entitlements: PremiumEntitlements | null,
): string | null {
  if (!entitlements) {
    return null;
  }

  const state = resolvePremiumEntitlementDisplayState(entitlements);
  const bankedLabel = bankedCreditsLabelForState(entitlements);

  switch (state.kind) {
    case "lifetime":
      return joinEntitlementSummaryParts("Lifetime premium", bankedLabel);
    case "appTrial":
      return joinEntitlementSummaryParts(
        state.periodEnd != null
          ? formatPremiumPeriodEndLabel(state.periodEnd, { trial: true })
          : "Premium trial active",
        bankedLabel,
      );
    case "stripeTrialing":
      return joinEntitlementSummaryParts("Premium trial active", bankedLabel);
    case "stripeActive":
      return joinEntitlementSummaryParts("Premium subscription active", bankedLabel);
    case "packCredits": {
      const count = state.packCredits;
      return count === 1 ? "1 premium session left" : `${count} premium sessions left`;
    }
    case "none":
      return null;
    default: {
      const _exhaustive: never = state.kind;
      return _exhaustive;
    }
  }
}
