import {
  Button,
  SegmentedControl,
  SimpleGrid,
  Stack,
  Text,
  UnstyledButton,
} from "@mantine/core";
import { useState } from "react";
import { AppLink } from "../navigation/AppLink";
import {
  InsetGroup,
  SectionLabel,
  filledStyles,
  grayStyles,
} from "../ui/entry/entryChrome";
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

const segmentedStyles = {
  root: {
    backgroundColor: "oklch(from var(--color-field-ink) l c h / 0.08)",
    border: "0.33px solid oklch(from var(--color-field-ink) l c h / 0.12)",
    borderRadius: 12,
    padding: 2,
  },
  label: {
    color: "var(--color-field-ink)",
    fontWeight: 510,
    fontSize: "0.8125rem",
    paddingInline: 8,
  },
  indicator: {
    backgroundColor: "oklch(from var(--color-field-ink) l c h / 0.16)",
    borderRadius: 10,
  },
} as const;

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
  const bankedCreditsLabel = formatBankedPremiumSessionCreditsLabel(entitlements);
  const packCreditsLabel = formatPremiumSessionCreditsLabel(entitlements);
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
  const unlimitedRows = [
    ...(canStartTrial
      ? [
          {
            key: "trial",
            label: "7-day free trial",
            hint: trialLoading ? "Starting…" : "No auto-renew",
            disabled: actionsDisabled,
            onClick: onStartTrial,
          },
        ]
      : []),
    ...subscriptionOffers.map((offer) => ({
      key: offer.key,
      label: offer.label,
      hint: busyProduct === offer.key ? "Opening…" : offer.priceLabel,
      disabled: actionsDisabled,
      onClick: () => onCheckout(offer.key),
    })),
    ...lifetimeOffers.map((offer) => ({
      key: offer.key,
      label: offer.label,
      hint: busyProduct === offer.key ? "Opening…" : offer.priceLabel,
      disabled: actionsDisabled,
      onClick: () => onCheckout(offer.key),
    })),
  ];

  return (
    <Stack gap={18}>
      <Stack gap={8}>
        <SectionLabel>Choose plan</SectionLabel>
        <SegmentedControl
          fullWidth
          value={activeCatalogTab}
          onChange={(value) => {
            setTabTouched(true);
            setCatalogTab(value as PremiumCatalogTab);
          }}
          data={PREMIUM_CATALOG_TABS.map((tab) => ({
            value: tab.value,
            label: tab.label,
          }))}
          aria-label="Premium purchase options"
          disabled={loading}
          styles={segmentedStyles}
        />
      </Stack>

      {activeCatalogTab === "packs" ? (
        <SimpleGrid cols={2} spacing={8}>
          {packOffers.map((offer) => (
            <Button
              key={offer.key}
              type="button"
              fullWidth
              styles={grayStyles}
              disabled={actionsDisabled}
              onClick={() => onCheckout(offer.key)}
              aria-label={`${offer.label}, ${offer.priceLabel}`}
              style={{ height: "100%" }}
            >
              <Stack gap={1} align="flex-start">
                <Text size="sm" fw={600} c="var(--color-field-ink)">
                  {offer.label}
                </Text>
                <Text size="xs" c="var(--color-field-ink-muted)">
                  {busyProduct === offer.key ? "Opening…" : offer.priceLabel}
                </Text>
              </Stack>
            </Button>
          ))}
        </SimpleGrid>
      ) : (
        <InsetGroup>
          <Stack gap={0}>
            {unlimitedRows.map((row, index) => (
              <UnstyledButton
                key={row.key}
                type="button"
                disabled={row.disabled}
                onClick={row.onClick}
                style={{
                  width: "100%",
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "space-between",
                  gap: 12,
                  padding: "0.875rem 1rem",
                  textAlign: "left",
                  opacity: row.disabled ? 0.5 : 1,
                  borderTop:
                    index === 0
                      ? undefined
                      : "0.33px solid oklch(from var(--color-field-ink) l c h / 0.12)",
                }}
              >
                <Text size="sm" fw={600} c="var(--color-field-ink)">
                  {row.label}
                </Text>
                <Text size="xs" c="var(--color-field-ink-muted)" ta="right">
                  {row.hint}
                </Text>
              </UnstyledButton>
            ))}
          </Stack>
        </InsetGroup>
      )}

      <Stack gap={8}>
        {showManageSubscription ? (
          <Button
            type="button"
            fullWidth
            styles={grayStyles}
            disabled={portalLoading}
            onClick={onPortal}
          >
            <Stack gap={2} align="flex-start" w="100%">
              <Text size="sm" fw={600} c="var(--color-field-ink)">
                Manage subscription
              </Text>
              <Text size="xs" c="var(--color-field-ink-muted)">
                {portalLoading ? "Opening…" : "Billing portal"}
              </Text>
            </Stack>
          </Button>
        ) : null}

        {entitlements?.canCreatePremium ? (
          <Button
            component={AppLink}
            to="/create?tier=premium"
            fullWidth
            styles={filledStyles}
            aria-label="Create premium session"
          >
            <Stack gap={2} align="flex-start" w="100%">
              <Text size="sm" fw={600} c="var(--color-ink)">
                Create premium session
              </Text>
              <Text size="xs" c="oklch(from var(--color-ink) l c h / 0.72)">
                {createSessionHint}
              </Text>
            </Stack>
          </Button>
        ) : null}
      </Stack>
    </Stack>
  );
}
