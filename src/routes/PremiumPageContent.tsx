import { Button, Stack, Text } from "@mantine/core";
import { useCallback, useEffect, useMemo, useState } from "react";
import { useSearchParams } from "react-router-dom";
import { useAppNavigate } from "../hooks/navigation/useAppNavigate";
import { PremiumSignInGate } from "../components/billing/PremiumSignInGate";
import { PremiumFeatureList } from "../components/billing/PremiumFeatureList";
import { PremiumTierCards } from "../components/billing/PremiumTierCards";
import {
  ErrorCallout,
  plainStyles,
} from "@/components/ui/entry/entryChrome";
import {
  canStartPremiumTrial,
  formatEntitlementSummary,
  type PremiumProductKey,
} from "../domain/billing/premiumProducts";
import {
  ANALYTICS_EVENTS,
  track,
} from "../services/core/analytics/analytics";
import {
  ensureAnonymousUser,
  isFirebaseConfigured,
} from "../services/core/firebase/firebase";
import {
  openPremiumBillingPortal,
  startPremiumCheckout,
  startPremiumTrial,
} from "../services/billing/premiumBilling";
import { usePremiumEntitlements } from "../hooks/billing/usePremiumEntitlements";

export function PremiumPageContent() {
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
  const [checkoutNotice, setCheckoutNotice] = useState<string | null>(null);

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
    if (checkoutState !== "success" && checkoutState !== "cancel") {
      return;
    }
    /* eslint-disable react-hooks/set-state-in-effect -- snapshot Stripe redirect notice before clearing query */
    setCheckoutNotice(
      checkoutState === "success"
        ? "Payment received. Premium unlock is ready."
        : "Checkout canceled.",
    );
    /* eslint-enable react-hooks/set-state-in-effect */
    if (checkoutState === "success") {
      track(ANALYTICS_EVENTS.premium_purchase_completed, {});
      void refreshEntitlementsWithError();
    }
    setSearchParams({}, { replace: true });
  }, [checkoutState, refreshEntitlementsWithError, setSearchParams]);

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
      <Stack gap={18}>
        <PremiumFeatureList
          entitlementSummary={null}
          checkoutNotice={null}
        />
        <Text size="sm" c="var(--color-field-ink-muted)">
          Premium billing needs an online connection. Use a synced session to
          unlock live transit.
        </Text>
      </Stack>
    );
  }

  return (
    <Stack gap={18}>
      <PremiumFeatureList
        entitlementSummary={entitlementSummary}
        checkoutNotice={checkoutNotice}
      />

      <PremiumSignInGate onSignedIn={() => void refreshEntitlementsWithError()}>
        <Stack gap="sm">
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
          {error ? <ErrorCallout>{error}</ErrorCallout> : null}
        </Stack>
      </PremiumSignInGate>

      <Button
        variant="subtle"
        styles={plainStyles}
        onClick={() => navigate("/create")}
      >
        Back to create session
      </Button>
    </Stack>
  );
}
