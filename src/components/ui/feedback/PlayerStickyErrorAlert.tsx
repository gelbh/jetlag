import { Alert, Button, Group } from "@mantine/core";
import type { UserErrorDisplay } from "@/domain/device/feedback/userErrors";
import { jetlagBrand } from "@/theme/theme";

export type PlayerStickyErrorAlertProps = {
  error: UserErrorDisplay;
  onAction?: () => void;
  onSecondaryAction?: () => void;
};

const stickyHaltAlertStyles = {
  root: {
    backgroundColor: `oklch(from ${jetlagBrand.halt} l c h / 0.12)`,
    border: `${jetlagBrand.hairline} solid oklch(from ${jetlagBrand.halt} l c h / 0.35)`,
  },
  title: {
    color: jetlagBrand.halt,
  },
} as const;

/** Thin channel-2 adapter: UserErrorDisplay + callbacks → Mantine Alert + Buttons. */
export function PlayerStickyErrorAlert({
  error,
  onAction,
  onSecondaryAction,
}: PlayerStickyErrorAlertProps) {
  const showPrimary = Boolean(error.action && onAction && error.actionLabel);
  const showSecondary = Boolean(
    error.secondaryAction && onSecondaryAction && error.secondaryActionLabel,
  );

  return (
    <Alert
      color="halt"
      title={error.title}
      variant="light"
      styles={stickyHaltAlertStyles}
    >
      {error.message}
      {showPrimary || showSecondary ? (
        <Group gap="sm" mt="sm" wrap="wrap">
          {showPrimary ? (
            <Button variant="default" size="compact-md" onClick={onAction}>
              {error.actionLabel}
            </Button>
          ) : null}
          {showSecondary ? (
            <Button variant="filled" size="compact-md" onClick={onSecondaryAction}>
              {error.secondaryActionLabel}
            </Button>
          ) : null}
        </Group>
      ) : null}
    </Alert>
  );
}
