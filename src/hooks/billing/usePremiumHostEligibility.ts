import { useEffect, useMemo } from "react";
import type { SetURLSearchParams } from "react-router-dom";
import type { SessionTier } from "../../domain/map/annotations";
import {
  canSelectPremiumSessionTier,
  formatEntitlementSummary,
  formatPremiumSessionCreditsLabel,
  type PremiumEntitlements,
} from "../../domain/billing/premiumProducts";
import { isFirebaseConfigured } from "../../services/core/firebase";
import { isPermanentUser } from "../../services/core/accountAuth";
import type { User } from "firebase/auth";
import { usePermanentAuthUser } from "./usePermanentAuthUser";

const TIER_OPTIONS = [
  {
    value: "free" as const,
    label: "Free",
    summary: "All tools, public map data.",
  },
  {
    value: "premium" as const,
    label: "Premium",
    summary: "Live transit and faster map loads.",
  },
];

export interface PremiumHostEligibilityInput {
  searchParams: URLSearchParams;
  setSearchParams: SetURLSearchParams;
  sessionTier: SessionTier;
  premiumEntitlements: PremiumEntitlements | null;
  hostHasAccessClaim: boolean;
}

export function usePremiumHostEligibility({
  searchParams,
  setSearchParams,
  sessionTier,
  premiumEntitlements,
  hostHasAccessClaim,
}: PremiumHostEligibilityInput) {
  const { isPermanent } = usePermanentAuthUser();

  const canSelectPremiumTier = canSelectPremiumSessionTier(
    premiumEntitlements,
    hostHasAccessClaim,
  );
  const packCreditsLabel = formatPremiumSessionCreditsLabel(premiumEntitlements);
  const packPremiumFlow =
    isFirebaseConfigured() &&
    searchParams.get("tier") === "premium" &&
    !canSelectPremiumTier &&
    (premiumEntitlements?.premiumSessionCredits ?? 0) > 0;
  const paidPremiumHost = premiumEntitlements?.canCreatePremium === true;

  const resolvedSessionTier = useMemo((): SessionTier => {
    if (packPremiumFlow) {
      return "premium";
    }

    if (
      sessionTier === "premium" &&
      !canSelectPremiumTier &&
      !hostHasAccessClaim
    ) {
      return "free";
    }

    return sessionTier;
  }, [
    canSelectPremiumTier,
    hostHasAccessClaim,
    packPremiumFlow,
    sessionTier,
  ]);

  const requiresPremiumSignIn =
    isFirebaseConfigured() &&
    resolvedSessionTier === "premium" &&
    !hostHasAccessClaim &&
    paidPremiumHost &&
    !isPermanent;

  const showPremiumUnlockPanel =
    isFirebaseConfigured() &&
    resolvedSessionTier === "premium" &&
    !hostHasAccessClaim &&
    !paidPremiumHost;

  const premiumEntitlementSummary = formatEntitlementSummary(premiumEntitlements);

  const visibleTierOptions = useMemo(
    () =>
      TIER_OPTIONS.filter(
        (option) => option.value === "free" || canSelectPremiumTier,
      ),
    [canSelectPremiumTier],
  );

  useEffect(() => {
    if (
      searchParams.get("tier") === "premium" &&
      resolvedSessionTier === "free"
    ) {
      setSearchParams({}, { replace: true });
    }
  }, [resolvedSessionTier, searchParams, setSearchParams]);

  const resolveSubmitTier = (): SessionTier =>
    isFirebaseConfigured() && resolvedSessionTier === "premium"
      ? "premium"
      : "free";

  const validatePremiumHostSubmit = (
    user: User | null,
    tier: SessionTier,
    useAccessClaimForPremium: boolean,
  ): string | null => {
    if (tier === "premium" && !useAccessClaimForPremium && paidPremiumHost) {
      if (!isPermanentUser(user)) {
        return "Sign in with email, Google, or Apple to host a paid premium session.";
      }
    }

    return null;
  };

  return {
    canSelectPremiumTier,
    packCreditsLabel,
    packPremiumFlow,
    paidPremiumHost,
    resolvedSessionTier,
    requiresPremiumSignIn,
    showPremiumUnlockPanel,
    premiumEntitlementSummary,
    visibleTierOptions,
    resolveSubmitTier,
    validatePremiumHostSubmit,
  };
}

export { TIER_OPTIONS };
