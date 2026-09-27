import { Badge, Stack, Text } from "@mantine/core";
import { SuccessCallout } from "@/components/ui/entry/entryChrome";

export function PremiumFeatureList({
  entitlementSummary,
  checkoutNotice,
}: {
  entitlementSummary: string | null;
  checkoutNotice: string | null;
}) {
  const successNotice =
    checkoutNotice && /payment received|unlock is ready/i.test(checkoutNotice)
      ? checkoutNotice
      : null;
  const mutedNotice = checkoutNotice && !successNotice ? checkoutNotice : null;

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
      {successNotice ? <SuccessCallout>{successNotice}</SuccessCallout> : null}
      {mutedNotice ? (
        <Text size="sm" c="var(--color-field-ink-muted)">
          {mutedNotice}
        </Text>
      ) : null}
    </Stack>
  );
}
