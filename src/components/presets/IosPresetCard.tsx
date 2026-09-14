import { Box, Button, Group, Text } from "@mantine/core";
import type { ReactNode } from "react";
import { Link } from "react-router-dom";
import { IosInsetGroup } from "@/components/ui/apple/iosEntryChrome";

const iosRowPrimaryStyles = {
  root: {
    minHeight: "2.5rem",
    borderRadius: 10,
    border: "none",
    fontWeight: 590,
    fontSize: "0.875rem",
    paddingInline: "0.85rem",
    backgroundColor: "var(--color-flag)",
    color: "var(--color-flag-ink)",
    "&:hover": {
      backgroundColor: "oklch(from var(--color-flag) calc(l + 0.03) c h)",
    },
  },
} as const;

const iosRowSecondaryStyles = {
  root: {
    minHeight: "2.5rem",
    borderRadius: 10,
    border: "none",
    fontWeight: 590,
    fontSize: "0.875rem",
    paddingInline: "0.85rem",
    backgroundColor: "oklch(from var(--color-rule) l c h / 0.45)",
    color: "var(--color-field-ink)",
    "&:hover": {
      backgroundColor: "oklch(from var(--color-rule) l c h / 0.55)",
    },
  },
} as const;

const iosRowDangerStyles = {
  root: {
    minHeight: "2.5rem",
    borderRadius: 10,
    border: "none",
    fontWeight: 590,
    fontSize: "0.875rem",
    paddingInline: "0.85rem",
    backgroundColor: "oklch(from var(--color-rule) l c h / 0.45)",
    color: "var(--color-halt)",
    "&:hover": {
      backgroundColor: "oklch(from var(--color-rule) l c h / 0.55)",
    },
  },
} as const;

export function IosPresetHostButton({
  to,
  children,
}: {
  to: string;
  children: ReactNode;
}) {
  return (
    <Button component={Link} to={to} styles={iosRowPrimaryStyles}>
      {children}
    </Button>
  );
}

export function IosPresetSecondaryLink({
  to,
  children,
}: {
  to: string;
  children: ReactNode;
}) {
  return (
    <Button component={Link} to={to} styles={iosRowSecondaryStyles}>
      {children}
    </Button>
  );
}

export function IosPresetDangerButton({
  onClick,
  children,
}: {
  onClick: () => void;
  children: ReactNode;
}) {
  return (
    <Button type="button" onClick={onClick} styles={iosRowDangerStyles}>
      {children}
    </Button>
  );
}

/** Frosted preset card for Mantine / iOS browse surfaces. */
export function IosPresetCard({
  name,
  meta,
  location,
  description,
  badges,
  headerAction,
  actions,
}: {
  name: string;
  meta: ReactNode;
  location?: ReactNode;
  description?: ReactNode;
  badges?: ReactNode;
  headerAction?: ReactNode;
  actions: ReactNode;
}) {
  return (
    <IosInsetGroup>
      <Box px="md" py="md">
        <Group align="flex-start" justify="space-between" wrap="nowrap" gap="sm">
          <Box style={{ minWidth: 0, flex: 1 }}>
            <Text fw={590} c="var(--color-field-ink)" style={{ lineHeight: 1.25 }}>
              {name}
            </Text>
            <Text size="xs" c="var(--color-field-ink-muted)" mt={6}>
              {meta}
            </Text>
            {location ? (
              <Text size="xs" c="var(--color-field-ink-muted)" mt={4}>
                {location}
              </Text>
            ) : null}
            {description ? (
              <Text size="xs" c="var(--color-field-ink-muted)" mt={8}>
                {description}
              </Text>
            ) : null}
            {badges ? (
              <Group gap={6} mt={8}>
                {badges}
              </Group>
            ) : null}
          </Box>
          {headerAction ? <Box style={{ flexShrink: 0 }}>{headerAction}</Box> : null}
        </Group>
        <Group gap={8} mt="sm" wrap="wrap">
          {actions}
        </Group>
      </Box>
    </IosInsetGroup>
  );
}

export function IosPresetBadge({
  children,
  tone = "neutral",
}: {
  children: ReactNode;
  tone?: "neutral" | "warning";
}) {
  return (
    <Box
      component="span"
      style={{
        borderRadius: 999,
        padding: "0.15rem 0.55rem",
        fontSize: "0.6875rem",
        fontWeight: 590,
        letterSpacing: "0.04em",
        textTransform: "uppercase",
        color:
          tone === "warning" ? "var(--color-status-warning)" : "var(--color-signal)",
        backgroundColor:
          tone === "warning"
            ? "oklch(from var(--color-status-warning) l c h / 0.14)"
            : "oklch(from var(--color-signal) l c h / 0.12)",
        border:
          tone === "warning"
            ? "0.33px solid oklch(from var(--color-status-warning) l c h / 0.35)"
            : "0.33px solid oklch(from var(--color-signal) l c h / 0.28)",
      }}
    >
      {children}
    </Box>
  );
}
