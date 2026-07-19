import { useCallback, useEffect, useMemo, useState } from "react";
import { useSearchParams } from "react-router-dom";
import { useAppNavigate } from "../hooks/useAppNavigate";
import { DesktopContentColumn } from "../components/ui/DesktopContentColumn";
import { EntryScreenLayout } from "../components/ui/EntryScreenLayout";
import { InlineError } from "../components/ui/InlineError";
import { ScreenHeader } from "../components/ui/ScreenHeader";
import { PremiumSignInGate } from "../components/billing/PremiumSignInGate";
import { PremiumFeatureList } from "../components/billing/PremiumFeatureList";
import { PremiumTierCards } from "../components/billing/PremiumTierCards";
import {
  canStartPremiumTrial,
  formatEntitlementSummary,
  type PremiumProductKey,
} from "../domain/billing/premiumProducts";
import {
  ensureAnonymousUser,
  isFirebaseConfigured,
} from "../services/core/firebase";
import {
  openPremiumBillingPortal,
  startPremiumCheckout,
  startPremiumTrial,
} from "../services/billing/premiumBilling";
import { usePremiumEntitlements } from "../hooks/billing/usePremiumEntitlements";

export function Premium() {
  const navigate = useAppNavigate();
  const [searchParams, setSearchParams] = useSearchParams();
  const checkoutState = searchParams.get("checkout");
  const {
    entitlements,
    loading,
    refresh: refreshEntitlements,
    setEntitlements,
  } = usePremiumEntitlements();
  const [busyProduct, setBusyProduct] = useState<PremiumProductKey | null>(
    null,
  );
  const [portalLoading, setPortalLoading] = useState(false);
  const [trialLoading, setTrialLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const refreshEntitlementsWithError = useCallback(async () => {
    if (!isFirebaseConfigured()) {
      return;
    }

    setError(null);

    try {
      await refreshEntitlements();
    } catch (nextError) {
      setError(
        nextError instanceof Error
          ? nextError.message
          : "Could not load premium status.",
      );
    }
  }, [refreshEntitlements]);

  useEffect(() => {
    /* eslint-disable react-hooks/set-state-in-effect -- refresh entitlements after Stripe redirect */
    if (checkoutState === "success") {
      void refreshEntitlementsWithError();
    }
    /* eslint-enable react-hooks/set-state-in-effect */
    if (checkoutState === "success" || checkoutState === "cancel") {
      setSearchParams({}, { replace: true });
    }
  }, [checkoutState, refreshEntitlementsWithError, setSearchParams]);

  const checkoutNotice = useMemo(() => {
    if (checkoutState === "success") {
      return "Payment received. Premium unlock is ready.";
    }
    if (checkoutState === "cancel") {
      return "Checkout canceled.";
    }
    return null;
  }, [checkoutState]);

  const entitlementSummary = useMemo(
    () => formatEntitlementSummary(entitlements),
    [entitlements],
  );

  const canStartTrial = canStartPremiumTrial(entitlements);

  const handleCheckout = async (productKey: PremiumProductKey) => {
    setBusyProduct(productKey);
    setError(null);

    try {
      await ensureAnonymousUser();
      const url = await startPremiumCheckout(productKey);
      window.location.assign(url);
    } catch (nextError) {
      setError(
        nextError instanceof Error
          ? nextError.message
          : "Could not start checkout.",
      );
      setBusyProduct(null);
    }
  };

  const handleStartTrial = async () => {
    setTrialLoading(true);
    setError(null);

    try {
      await ensureAnonymousUser();
      const next = await startPremiumTrial();
      setEntitlements(next);
    } catch (nextError) {
      setError(
        nextError instanceof Error
          ? nextError.message
          : "Could not start free trial.",
      );
    } finally {
      setTrialLoading(false);
    }
  };

  const handlePortal = async () => {
    setPortalLoading(true);
    setError(null);

    try {
      await ensureAnonymousUser();
      const url = await openPremiumBillingPortal();
      window.location.assign(url);
    } catch (nextError) {
      setError(
        nextError instanceof Error
          ? nextError.message
          : "Could not open billing portal.",
      );
      setPortalLoading(false);
    }
  };

  if (!isFirebaseConfigured()) {
    return (
      <EntryScreenLayout justify="start">
        <ScreenHeader backTo="/" backLabel="Back" />
        <DesktopContentColumn maxWidth="entry">
          <PremiumFeatureList entitlementSummary={null} checkoutNotice={null} />
          <p className="max-w-sm text-sm text-ink-muted">
            Premium billing needs an online connection. Use a synced session to
            unlock live transit.
          </p>
        </DesktopContentColumn>
      </EntryScreenLayout>
    );
  }

  return (
    <EntryScreenLayout justify="start">
      <ScreenHeader backTo="/" backLabel="Back" />
      <DesktopContentColumn maxWidth="entry">
        <PremiumFeatureList
          entitlementSummary={entitlementSummary}
          checkoutNotice={checkoutNotice}
        />

        <PremiumSignInGate onSignedIn={() => void refreshEntitlementsWithError()}>
          <div className="home-enter-actions space-y-3">
            <PremiumTierCards
              entitlements={entitlements}
              loading={loading}
              busyProduct={busyProduct}
              portalLoading={portalLoading}
              trialLoading={trialLoading}
              canStartTrial={canStartTrial}
              onCheckout={(productKey) => {
                void handleCheckout(productKey);
              }}
              onStartTrial={() => {
                void handleStartTrial();
              }}
              onPortal={() => {
                void handlePortal();
              }}
            />
            {error ? <InlineError>{error}</InlineError> : null}
          </div>
        </PremiumSignInGate>

        <button
          type="button"
          onClick={() => navigate("/create")}
          className="home-feedback-link"
        >
          Back to create session
        </button>
      </DesktopContentColumn>
    </EntryScreenLayout>
  );
}
