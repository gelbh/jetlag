import { Badge, Stack, Text } from "@mantine/core";
import { SuccessCallout } from "@/components/ui/entry/entryChrome";

export type PremiumCheckoutNotice = {
  kind: "success" | "muted";
  message: string;
};

export function PremiumFeatureList({
  entitlementSummary,
  checkoutNotice,
}: {
  entitlementSummary: string | null;
  checkoutNotice: PremiumCheckoutNotice | null;
}) {
  return (
    <Stack gap="sm">
      <Text
        size="sm"
        c="var(--color-field-ink-muted)"
        style={{ lineHeight: 1.4, textWrap: "pretty" }}
      >
        Live transit and faster map loads for hosted sessions.
      </Text>
      {entitlementSummary ? (
        <Badge
          variant="light"
          size="lg"
          radius="sm"
          data-testid="premium-entitlement-summary"
          styles={{
            root: {
              alignSelf: "flex-start",
              textTransform: "none",
              fontWeight: 510,
            },
          }}
        >
          {entitlementSummary}
        </Badge>
      ) : null}
      {checkoutNotice?.kind === "success" ? (
        <SuccessCallout>{checkoutNotice.message}</SuccessCallout>
      ) : null}
      {checkoutNotice?.kind === "muted" ? (
        <Text
          size="sm"
          c="var(--color-field-ink-muted)"
          data-testid="premium-checkout-notice-muted"
        >
          {checkoutNotice.message}
        </Text>
      ) : null}
    </Stack>
  );
}
