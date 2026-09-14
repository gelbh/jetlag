import { Box, Text, UnstyledButton } from "@mantine/core";
import { CaretRight } from "@phosphor-icons/react";
import type { ReactNode } from "react";
import { Link } from "react-router-dom";

export function IosInsetHairline({
  insetStart = "3.25rem",
}: {
  insetStart?: string;
}) {
  return (
    <Box
      aria-hidden
      style={{
        height: "0.33px",
        marginInlineStart: insetStart,
        backgroundColor: "oklch(from var(--color-field-ink) l c h / 0.14)",
      }}
    />
  );
}

/** Home-style inset navigation row (icon · label · chevron). */
export function IosInsetRow({
  to,
  href,
  label,
  icon,
  showSeparator = false,
  onClick,
  tone = "default",
  showChevron = true,
  "aria-label": ariaLabel,
}: {
  to?: string;
  /** External URL (opens in a new tab). */
  href?: string;
  label: string;
  icon: ReactNode;
  showSeparator?: boolean;
  onClick?: () => void;
  tone?: "default" | "halt";
  showChevron?: boolean;
  "aria-label"?: string;
}) {
  const ink = tone === "halt" ? "var(--color-halt)" : "var(--color-field-ink)";
  const iconColor = tone === "halt" ? "var(--color-halt)" : "var(--color-flag)";

  const content = (
    <>
      <Box
        component="span"
        c={iconColor}
        style={{ display: "inline-flex", flexShrink: 0, width: "1.375rem" }}
        aria-hidden
      >
        {icon}
      </Box>
      <Text component="span" c={ink} style={{ flex: 1, lineHeight: 1.25 }}>
        {label}
      </Text>
      {showChevron ? (
        <Box
          component="span"
          c="oklch(from var(--color-field-ink-muted) l c h / 0.85)"
          style={{ display: "inline-flex", flexShrink: 0 }}
          aria-hidden
        >
          <CaretRight size={16} weight="bold" />
        </Box>
      ) : null}
    </>
  );

  const rootStyles = {
    root: {
      display: "flex",
      alignItems: "center",
      gap: "0.75rem",
      width: "100%",
      minHeight: "2.875rem",
      paddingInline: "1rem",
      paddingBlock: "0.625rem",
      color: "var(--color-field-ink)",
      fontWeight: 400,
      fontSize: "1.0625rem",
      letterSpacing: "-0.01em",
      transition:
        "background-color 120ms ease, transform 80ms ease, opacity 80ms ease",
      "&:hover": {
        backgroundColor: "oklch(from var(--color-field-ink) l c h / 0.06)",
      },
      "&:active": {
        backgroundColor: "oklch(from var(--color-field-ink) l c h / 0.12)",
        opacity: 0.88,
        transform: "scale(0.995)",
      },
    },
  } as const;

  return (
    <>
      {showSeparator ? <IosInsetHairline /> : null}
      {to ? (
        <UnstyledButton
          component={Link}
          to={to}
          aria-label={ariaLabel}
          styles={rootStyles}
        >
          {content}
        </UnstyledButton>
      ) : href ? (
        <UnstyledButton
          component="a"
          href={href}
          target="_blank"
          rel="noopener noreferrer"
          aria-label={ariaLabel}
          styles={rootStyles}
        >
          {content}
        </UnstyledButton>
      ) : (
        <UnstyledButton
          type="button"
          onClick={onClick}
          aria-label={ariaLabel}
          styles={rootStyles}
        >
          {content}
        </UnstyledButton>
      )}
    </>
  );
}
