import type { ButtonProps } from "@mantine/core";

/** iOS filled tint control (logo orange). */
export const iosFilledStyles: ButtonProps["styles"] = {
  root: {
    minHeight: "3.125rem",
    borderRadius: 14,
    border: "none",
    fontWeight: 590,
    backgroundColor: "var(--color-flag)",
    color: "var(--color-flag-ink)",
    "&:hover": {
      backgroundColor: "oklch(from var(--color-flag) calc(l + 0.03) c h)",
    },
  },
};

/** iOS gray / secondary filled control. */
export const iosGrayStyles: ButtonProps["styles"] = {
  root: {
    minHeight: "3.125rem",
    borderRadius: 14,
    border: "none",
    fontWeight: 590,
    backgroundColor: "oklch(from var(--color-rule) l c h / 0.45)",
    color: "var(--color-field-ink)",
    "&:hover": {
      backgroundColor: "oklch(from var(--color-rule) l c h / 0.55)",
    },
  },
};

/** iOS plain tinted text control. */
export const iosPlainStyles: ButtonProps["styles"] = {
  root: {
    minHeight: "2.75rem",
    borderRadius: 14,
    border: "none",
    backgroundColor: "transparent",
    color: "var(--color-flag)",
    fontWeight: 510,
    "&:hover": {
      backgroundColor: "oklch(from var(--color-flag) l c h / 0.12)",
    },
  },
};

/** Compact flag control for inset list rows (friends, presets). */
export const iosCompactFilledStyles: ButtonProps["styles"] = {
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
};

/** Full-bleed bottom Drawer chassis (Friends / Leaderboard / report sheets). */
export function iosBottomDrawerStyles(maxHeight = "min(70dvh, 34rem)") {
  return {
    inner: {
      width: "100%",
      maxWidth: "100%",
      padding: 0,
    },
    content: {
      flex: "0 0 100%",
      width: "100%",
      maxWidth: "100%",
      height: "auto",
      maxHeight,
      backgroundColor: "var(--color-canvas)",
      borderTopLeftRadius: 24,
      borderTopRightRadius: 24,
      borderTop: "0.33px solid oklch(from var(--color-field-ink) l c h / 0.14)",
      overflow: "auto" as const,
    },
    body: {
      width: "100%",
      paddingBottom: "max(1.25rem, env(safe-area-inset-bottom))",
    },
  };
}
