import { useState } from "react";
import { Link } from "react-router-dom";
import { SegmentControl } from "../ui/SegmentControl";
import {
  formatBankedPremiumSessionCreditsLabel,
  formatPremiumSessionCreditsLabel,
  hasUnlimitedPremiumHosting,
  PREMIUM_PRODUCT_OFFERS,
  type PremiumEntitlements,
  type PremiumProductKey,
} from "../../domain/billing/premiumProducts";

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

export function PremiumTierCards({
  entitlements,
  loading,
  busyProduct,
  portalLoading,
  trialLoading,
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
    <>
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
        <div role="tabpanel" aria-label="Session packs" className="space-y-2">
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
    </>
  );
}
