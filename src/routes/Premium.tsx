import { useCallback, useEffect, useMemo, useState } from "react";
import { Link, useNavigate, useSearchParams } from "react-router-dom";
import { EntryScreenLayout } from "../components/ui/EntryScreenLayout";
import { InlineError } from "../components/ui/InlineError";
import { SegmentControl } from "../components/ui/SegmentControl";
import {
  ScreenHeader,
  screenHeaderOffsetClassName,
} from "../components/ui/ScreenHeader";
import { PremiumSignInGate } from "../components/billing/PremiumSignInGate";
import {
  canStartPremiumTrial,
  formatBankedPremiumSessionCreditsLabel,
  formatEntitlementSummary,
  formatPremiumSessionCreditsLabel,
  hasUnlimitedPremiumHosting,
  PREMIUM_PRODUCT_OFFERS,
  type PremiumEntitlements,
  type PremiumProductKey,
} from "../domain/billing/premiumProducts";
import {
  ensureAnonymousUser,
  isFirebaseConfigured,
} from "../services/core/firebase";
import {
  fetchPremiumEntitlements,
  openPremiumBillingPortal,
  startPremiumCheckout,
  startPremiumTrial,
} from "../services/billing/premiumBilling";

type PremiumCatalogTab = "packs" | "unlimited";

const PREMIUM_CATALOG_TABS = [
  { value: "packs" as const, label: "Session packs" },
  { value: "unlimited" as const, label: "Unlimited" },
] as const;

function resolveDefaultCatalogTab(
  entitlements: PremiumEntitlements | null,
): PremiumCatalogTab {
  if (
    entitlements &&
    entitlements.premiumSessionCredits > 0 &&
    !hasUnlimitedPremiumHosting(entitlements)
  ) {
    return "packs";
  }

  return "unlimited";
}

function resolveCreatePremiumButtonClass(
  entitlements: PremiumEntitlements | null,
): string {
  if (hasUnlimitedPremiumHosting(entitlements)) {
    return "home-card-btn home-card-btn-premium";
  }

  if ((entitlements?.premiumSessionCredits ?? 0) > 0) {
    return "home-card-btn home-card-btn-premium-sessions";
  }

  return "home-card-btn home-card-btn-primary";
}

function PremiumHero({
  entitlementSummary,
  checkoutNotice,
}: {
  entitlementSummary: string | null;
  checkoutNotice: string | null;
}) {
  return (
    <div className={`space-y-2 ${screenHeaderOffsetClassName}`}>
      <h1 className="font-display text-2xl font-bold uppercase leading-none tracking-tight text-ink">
        Premium
      </h1>
      <p className="max-w-sm text-sm leading-snug text-ink-muted">
        Live transit and faster map loads for hosted sessions.
      </p>
      {entitlementSummary ? (
        <p className="premium-entitlement-pill">{entitlementSummary}</p>
      ) : null}
      {checkoutNotice ? (
        <p className="text-sm text-ink-secondary">{checkoutNotice}</p>
      ) : null}
    </div>
  );
}

function PremiumCatalog({
  entitlements,
  loading,
  busyProduct,
  portalLoading,
  trialLoading,
  error,
  canStartTrial,
  onCheckout,
  onStartTrial,
  onPortal,
}: {
  entitlements: PremiumEntitlements | null;
  loading: boolean;
  busyProduct: PremiumProductKey | null;
  portalLoading: boolean;
  trialLoading: boolean;
  error: string | null;
  canStartTrial: boolean;
  onCheckout: (productKey: PremiumProductKey) => void;
  onStartTrial: () => void;
  onPortal: () => void;
}) {
  const packCreditsLabel = formatPremiumSessionCreditsLabel(entitlements);
  const bankedCreditsLabel = formatBankedPremiumSessionCreditsLabel(entitlements);
  const createSessionHint =
    bankedCreditsLabel ?? packCreditsLabel ?? "Host a game";
  const [catalogTab, setCatalogTab] = useState<PremiumCatalogTab>("unlimited");
  const [tabTouched, setTabTouched] = useState(false);
  const activeCatalogTab =
    !tabTouched && entitlements !== null
      ? resolveDefaultCatalogTab(entitlements)
      : catalogTab;

  const packOffers = PREMIUM_PRODUCT_OFFERS.filter((offer) => offer.kind === "pack");
  const subscriptionOffers = PREMIUM_PRODUCT_OFFERS.filter(
    (offer) => offer.kind === "subscription",
  );
  const lifetimeOffers = PREMIUM_PRODUCT_OFFERS.filter(
    (offer) => offer.kind === "lifetime",
  );

  const actionsDisabled = loading || busyProduct !== null || trialLoading;
  const showManageSubscription =
    entitlements?.subscription?.status === "active" ||
    entitlements?.subscription?.status === "trialing";

  return (
    <div className="home-enter-actions space-y-3">
      <SegmentControl
        value={activeCatalogTab}
        options={PREMIUM_CATALOG_TABS}
        onChange={(value) => {
          setTabTouched(true);
          setCatalogTab(value);
        }}
        aria-label="Premium purchase options"
        disabled={loading}
      />

      {activeCatalogTab === "packs" ? (
        <div
          role="tabpanel"
          aria-label="Session packs"
          className="space-y-2"
        >
          <div className="premium-pack-grid">
            {packOffers.map((offer) => (
              <button
                key={offer.key}
                type="button"
                disabled={actionsDisabled}
                onClick={() => onCheckout(offer.key)}
                aria-label={`${offer.label}, ${offer.priceLabel}`}
                className="premium-pack-cell disabled:opacity-50"
              >
                <span className="premium-pack-cell-label">{offer.label}</span>
                <span className="premium-pack-cell-price">
                  {busyProduct === offer.key ? "Opening…" : offer.priceLabel}
                </span>
              </button>
            ))}
          </div>
        </div>
      ) : (
        <div
          role="tabpanel"
          aria-label="Unlimited hosting"
          className="space-y-2"
        >
          {canStartTrial ? (
            <button
              type="button"
              disabled={actionsDisabled}
              onClick={onStartTrial}
              className="premium-offer-row disabled:opacity-50"
            >
              <span className="premium-offer-row-label">7-day free trial</span>
              <span className="premium-offer-row-hint">
                {trialLoading ? "Starting…" : "No auto-renew"}
              </span>
            </button>
          ) : null}

          {subscriptionOffers.map((offer) => (
            <button
              key={offer.key}
              type="button"
              disabled={actionsDisabled}
              onClick={() => onCheckout(offer.key)}
              className="premium-offer-row disabled:opacity-50"
            >
              <span className="premium-offer-row-label">{offer.label}</span>
              <span className="premium-offer-row-hint">
                {busyProduct === offer.key ? "Opening…" : offer.priceLabel}
              </span>
            </button>
          ))}

          {lifetimeOffers.map((offer) => (
            <button
              key={offer.key}
              type="button"
              disabled={actionsDisabled}
              onClick={() => onCheckout(offer.key)}
              className="premium-offer-row disabled:opacity-50"
            >
              <span className="premium-offer-row-label">{offer.label}</span>
              <span className="premium-offer-row-hint">
                {busyProduct === offer.key ? "Opening…" : offer.priceLabel}
              </span>
            </button>
          ))}
        </div>
      )}

      <div className="premium-account-actions">
        {showManageSubscription ? (
          <button
            type="button"
            disabled={portalLoading}
            onClick={onPortal}
            className="premium-offer-row disabled:opacity-50"
          >
            <span className="premium-offer-row-label">Manage subscription</span>
            <span className="premium-offer-row-hint">
              {portalLoading ? "Opening…" : "Billing portal"}
            </span>
          </button>
        ) : null}

        {entitlements?.canCreatePremium ? (
          <Link
            to="/create?tier=premium"
            className={resolveCreatePremiumButtonClass(entitlements)}
            aria-label="Create premium session"
          >
            <span>Create premium session</span>
            <span className="home-card-btn-hint">{createSessionHint}</span>
          </Link>
        ) : null}
      </div>

      {error ? <InlineError>{error}</InlineError> : null}
    </div>
  );
}

export function Premium() {
  const navigate = useNavigate();
  const [searchParams, setSearchParams] = useSearchParams();
  const checkoutState = searchParams.get("checkout");
  const [entitlements, setEntitlements] = useState<PremiumEntitlements | null>(
    null,
  );
  const [loading, setLoading] = useState(true);
  const [busyProduct, setBusyProduct] = useState<PremiumProductKey | null>(
    null,
  );
  const [portalLoading, setPortalLoading] = useState(false);
  const [trialLoading, setTrialLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const refreshEntitlements = useCallback(async () => {
    if (!isFirebaseConfigured()) {
      setEntitlements(null);
      setLoading(false);
      return;
    }

    setLoading(true);
    setError(null);

    try {
      await ensureAnonymousUser();
      const next = await fetchPremiumEntitlements();
      setEntitlements(next);
    } catch (nextError) {
      setError(
        nextError instanceof Error
          ? nextError.message
          : "Could not load premium status.",
      );
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    /* eslint-disable react-hooks/set-state-in-effect -- initial entitlement load */
    void refreshEntitlements();
    /* eslint-enable react-hooks/set-state-in-effect */
  }, [refreshEntitlements]);

  const checkoutNotice = useMemo(() => {
    if (checkoutState === "success") {
      return "Payment received. Premium unlock is ready.";
    }
    if (checkoutState === "cancel") {
      return "Checkout canceled.";
    }
    return null;
  }, [checkoutState]);

  useEffect(() => {
    if (checkoutState === "success") {
      /* eslint-disable react-hooks/set-state-in-effect -- refresh entitlements after Stripe redirect */
      void refreshEntitlements();
      /* eslint-enable react-hooks/set-state-in-effect */
    }
    if (checkoutState === "success" || checkoutState === "cancel") {
      setSearchParams({}, { replace: true });
    }
  }, [checkoutState, refreshEntitlements, setSearchParams]);

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
        <PremiumHero entitlementSummary={null} checkoutNotice={null} />
        <p className="max-w-sm text-sm text-ink-muted">
          Premium billing needs an online connection. Use a synced session to
          unlock live transit.
        </p>
      </EntryScreenLayout>
    );
  }

  return (
    <EntryScreenLayout justify="start">
      <ScreenHeader backTo="/" backLabel="Back" />
      <PremiumHero
        entitlementSummary={entitlementSummary}
        checkoutNotice={checkoutNotice}
      />

      <PremiumSignInGate onSignedIn={() => void refreshEntitlements()}>
        <PremiumCatalog
          entitlements={entitlements}
          loading={loading}
          busyProduct={busyProduct}
          portalLoading={portalLoading}
          trialLoading={trialLoading}
          error={error}
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
      </PremiumSignInGate>

      <button
        type="button"
        onClick={() => navigate("/create")}
        className="home-feedback-link"
      >
        Back to create session
      </button>
    </EntryScreenLayout>
  );
}
