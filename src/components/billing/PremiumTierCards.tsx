import { useState } from "react";
import { AppLink } from "../navigation/AppLink";
import { SegmentControl } from "../ui/forms/SegmentControl";
import {
  homeCardBtnHintPremiumSessionsStyle,
  homeCardBtnHintPremiumStyle,
  homeCardBtnHintStyle,
  homeCardBtnStyle,
  premiumAccountActionsStyle,
  premiumOfferRowHintStyle,
  premiumOfferRowLabelStyle,
  premiumOfferRowStyle,
  premiumPackCellLabelStyle,
  premiumPackCellPriceStyle,
  premiumPackCellStyle,
  premiumPackGridStyle,
  type HomeCardBtnVariant,
} from "@/components/ui/entry/entryStyles";
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

function resolveCreatePremiumVariant(
  entitlements: PremiumEntitlements | null,
): HomeCardBtnVariant {
  if (hasUnlimitedPremiumHosting(entitlements)) {
    return "premium";
  }

  if ((entitlements?.premiumSessionCredits ?? 0) > 0) {
    return "premiumSessions";
  }

  return "primary";
}

function createPremiumHintStyle(variant: HomeCardBtnVariant) {
  if (variant === "premium") {
    return homeCardBtnHintPremiumStyle;
  }
  if (variant === "premiumSessions") {
    return homeCardBtnHintPremiumSessionsStyle;
  }
  return homeCardBtnHintStyle;
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
  const createVariant = resolveCreatePremiumVariant(entitlements);

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
          <div style={premiumPackGridStyle}>
            {packOffers.map((offer) => (
              <button
                key={offer.key}
                type="button"
                disabled={actionsDisabled}
                onClick={() => onCheckout(offer.key)}
                aria-label={`${offer.label}, ${offer.priceLabel}`}
                data-feedback="tap"
                style={premiumPackCellStyle}
                className="disabled:opacity-50"
              >
                <span style={premiumPackCellLabelStyle}>{offer.label}</span>
                <span style={premiumPackCellPriceStyle}>
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
              data-feedback="tap"
              style={premiumOfferRowStyle}
              className="disabled:opacity-50"
            >
              <span style={premiumOfferRowLabelStyle}>7-day free trial</span>
              <span style={premiumOfferRowHintStyle}>
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
              data-feedback="tap"
              style={premiumOfferRowStyle}
              className="disabled:opacity-50"
            >
              <span style={premiumOfferRowLabelStyle}>{offer.label}</span>
              <span style={premiumOfferRowHintStyle}>
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
              data-feedback="tap"
              style={premiumOfferRowStyle}
              className="disabled:opacity-50"
            >
              <span style={premiumOfferRowLabelStyle}>{offer.label}</span>
              <span style={premiumOfferRowHintStyle}>
                {busyProduct === offer.key ? "Opening…" : offer.priceLabel}
              </span>
            </button>
          ))}
        </div>
      )}

      <div style={premiumAccountActionsStyle}>
        {showManageSubscription ? (
          <button
            type="button"
            disabled={portalLoading}
            onClick={onPortal}
            data-feedback="tap"
            style={premiumOfferRowStyle}
            className="disabled:opacity-50"
          >
            <span style={premiumOfferRowLabelStyle}>Manage subscription</span>
            <span style={premiumOfferRowHintStyle}>
              {portalLoading ? "Opening…" : "Billing portal"}
            </span>
          </button>
        ) : null}

        {entitlements?.canCreatePremium ? (
          <AppLink
            to="/create?tier=premium"
            data-feedback="tap"
            style={homeCardBtnStyle(createVariant)}
            aria-label="Create premium session"
          >
            <span>Create premium session</span>
            <span style={createPremiumHintStyle(createVariant)}>
              {createSessionHint}
            </span>
          </AppLink>
        ) : null}
      </div>
    </>
  );
}
