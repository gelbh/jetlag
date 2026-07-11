import { useCallback, useEffect, useMemo, useState } from "react";
import { Link, useNavigate, useSearchParams } from "react-router-dom";
import { AppLogo } from "../components/ui/AppLogo";
import { EntryScreenLayout } from "../components/ui/EntryScreenLayout";
import { InlineError } from "../components/ui/InlineError";
import { ScreenNav } from "../components/ui/ScreenNav";
import {
  formatEntitlementSummary,
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
} from "../services/billing/premiumBilling";

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
    let cancelled = false;

    void (async () => {
      if (!isFirebaseConfigured()) {
        if (!cancelled) {
          setEntitlements(null);
          setLoading(false);
        }
        return;
      }

      setLoading(true);
      setError(null);

      try {
        await ensureAnonymousUser();
        const next = await fetchPremiumEntitlements();
        if (!cancelled) {
          setEntitlements(next);
        }
      } catch (nextError) {
        if (!cancelled) {
          setError(
            nextError instanceof Error
              ? nextError.message
              : "Could not load premium status.",
          );
        }
      } finally {
        if (!cancelled) {
          setLoading(false);
        }
      }
    })();

    return () => {
      cancelled = true;
    };
  }, []);

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

  const canStartTrial = entitlements?.trialUsedAt == null;

  const handleCheckout = async (
    productKey: PremiumProductKey,
    startTrial = false,
  ) => {
    setBusyProduct(productKey);
    setError(null);

    try {
      await ensureAnonymousUser();
      const url = await startPremiumCheckout(productKey, { startTrial });
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
      <EntryScreenLayout>
        <ScreenNav backTo="/" backLabel="Back" />
        <div className="space-y-3 pt-[max(3rem,env(safe-area-inset-top))]">
          <h1 className="font-display text-balance text-[clamp(2rem,10vw,3rem)] font-bold uppercase leading-[0.92] tracking-tight text-ink">
            Premium
          </h1>
          <p className="max-w-sm text-pretty text-base leading-relaxed text-ink-muted">
            Premium billing needs an online connection. Use a synced session to
            unlock live transit.
          </p>
        </div>
      </EntryScreenLayout>
    );
  }

  return (
    <EntryScreenLayout>
      <ScreenNav backTo="/" backLabel="Back" />
      <div className="space-y-3 pt-[max(3rem,env(safe-area-inset-top))]">
        <AppLogo variant="lockup" size="lg" />
        <h1 className="font-display text-balance text-[clamp(2rem,10vw,3rem)] font-bold uppercase leading-[0.92] tracking-tight text-ink">
          Premium
        </h1>
        <p className="max-w-sm text-pretty text-base leading-relaxed text-ink-muted">
          Live transit vehicles and faster map loads for your hosted sessions.
          Joiners use the regular game code.
        </p>
        {entitlementSummary ? (
          <p className="max-w-sm text-sm font-semibold text-highlight">
            {entitlementSummary}
          </p>
        ) : null}
        {checkoutNotice ? (
          <p className="max-w-sm text-sm text-ink-secondary">{checkoutNotice}</p>
        ) : null}
      </div>

      <div className="home-enter-actions space-y-2.5 pb-[max(1rem,env(safe-area-inset-bottom))]">
        <p className="font-display text-[10px] font-semibold uppercase tracking-[0.12em] text-ink-dim">
          Session packs
        </p>
        {PREMIUM_PRODUCT_OFFERS.filter((offer) => offer.kind === "pack").map(
          (offer) => (
            <button
              key={offer.key}
              type="button"
              disabled={loading || busyProduct !== null}
              onClick={() => void handleCheckout(offer.key)}
              className="home-card-btn home-card-btn-secondary disabled:opacity-50"
            >
              <span>{offer.label}</span>
              <span className="home-card-btn-hint">
                {busyProduct === offer.key ? "Opening checkout…" : offer.priceLabel}
              </span>
            </button>
          ),
        )}

        <p className="pt-2 font-display text-[10px] font-semibold uppercase tracking-[0.12em] text-ink-dim">
          Unlimited hosting
        </p>
        {PREMIUM_PRODUCT_OFFERS.filter(
          (offer) => offer.kind === "subscription",
        ).map((offer) => (
          <div key={offer.key} className="space-y-1.5">
            <button
              type="button"
              disabled={loading || busyProduct !== null}
              onClick={() => void handleCheckout(offer.key)}
              className="home-card-btn home-card-btn-primary w-full disabled:opacity-50"
            >
              <span>{offer.label}</span>
              <span className="home-card-btn-hint">
                {busyProduct === offer.key ? "Opening checkout…" : offer.priceLabel}
              </span>
            </button>
            {offer.trialEligible && canStartTrial ? (
              <button
                type="button"
                disabled={loading || busyProduct !== null}
                onClick={() => void handleCheckout(offer.key, true)}
                className="w-full py-2 text-sm font-semibold text-brand-blue disabled:opacity-50"
              >
                {busyProduct === offer.key
                  ? "Opening checkout…"
                  : "Start 7-day free trial"}
              </button>
            ) : null}
            <p className="text-xs leading-relaxed text-ink-dim">{offer.detail}</p>
          </div>
        ))}

        {PREMIUM_PRODUCT_OFFERS.filter((offer) => offer.kind === "lifetime").map(
          (offer) => (
            <button
              key={offer.key}
              type="button"
              disabled={loading || busyProduct !== null}
              onClick={() => void handleCheckout(offer.key)}
              className="home-card-btn home-card-btn-secondary disabled:opacity-50"
            >
              <span>{offer.label}</span>
              <span className="home-card-btn-hint">
                {busyProduct === offer.key ? "Opening checkout…" : offer.priceLabel}
              </span>
            </button>
          ),
        )}

        {entitlements?.subscription?.status === "active" ||
        entitlements?.subscription?.status === "trialing" ? (
          <button
            type="button"
            disabled={portalLoading}
            onClick={() => void handlePortal()}
            className="home-card-btn home-card-btn-secondary disabled:opacity-50"
          >
            <span>Manage subscription</span>
            <span className="home-card-btn-hint">
              {portalLoading ? "Opening…" : "Stripe billing portal"}
            </span>
          </button>
        ) : null}

        {entitlements?.canCreatePremium ? (
          <Link
            to="/create"
            className="home-card-btn home-card-btn-primary"
            aria-label="Create premium session"
          >
            <span>Create premium session</span>
            <span className="home-card-btn-hint">Host a game</span>
          </Link>
        ) : null}

        {error ? <InlineError>{error}</InlineError> : null}

        <button
          type="button"
          onClick={() => navigate("/create")}
          className="home-feedback-link"
        >
          Back to create session
        </button>
      </div>
    </EntryScreenLayout>
  );
}
