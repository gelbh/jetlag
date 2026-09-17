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


/** Island-height Start (matches quiet timer column, not full iOS form CTA). */
export const iosMapIslandFilledStyles: ButtonProps["styles"] = {
  root: {
    minHeight: "2.25rem",
    height: "2.25rem",
    borderRadius: 10,
    border: "none",
    fontWeight: 590,
    fontSize: "0.8125rem",
    paddingInline: "0.75rem",
    backgroundColor: "var(--color-flag)",
    color: "var(--color-flag-ink)",
    "&:hover": {
      backgroundColor: "oklch(from var(--color-flag) calc(l + 0.03) c h)",
    },
  },
};

/** Hunt / session dock chip under jl.playerUi.mantine (column icon+label). */
export function iosMapToolSlotStyles(pressed: boolean): ButtonProps["styles"] {
  return {
    root: {
      display: "flex",
      flexDirection: "column",
      alignItems: "center",
      justifyContent: "center",
      gap: "0.125rem",
      minWidth: "2.75rem",
      minHeight: "2.75rem",
      padding: "0.25rem 0.125rem",
      borderRadius: 14,
      border: pressed
        ? "0.33px solid oklch(from var(--color-highlight) l c h / 0.75)"
        : "0.33px solid transparent",
      backgroundColor: pressed
        ? "oklch(from var(--color-highlight) l c h / 0.22)"
        : "transparent",
      color: pressed
        ? "var(--color-highlight)"
        : "var(--color-field-ink-muted)",
      WebkitTapHighlightColor: "transparent",
      "&:hover:not(:disabled)": {
        backgroundColor: pressed
          ? "oklch(from var(--color-highlight) l c h / 0.28)"
          : "oklch(from var(--color-canvas) l c h / 0.55)",
        borderColor: pressed
          ? "oklch(from var(--color-highlight) l c h / 0.85)"
          : "oklch(from var(--color-rule) l c h / 0.55)",
        color: pressed
          ? "var(--color-highlight)"
          : "var(--color-field-ink)",
      },
      "&:disabled": {
        opacity: 0.35,
        cursor: "not-allowed",
      },
    },
  };
}

/** Island-height icon control (pause / resume beside the clock). */
export const iosMapIslandIconStyles: ButtonProps["styles"] = {
  root: {
    minHeight: "2.5rem",
    height: "2.5rem",
    width: "2.5rem",
    minWidth: "2.5rem",
    padding: 0,
    borderRadius: 12,
    border: "0.33px solid oklch(from var(--color-rule) l c h / 0.65)",
    backgroundColor: "oklch(from var(--color-canvas) l c h / 0.72)",
    backdropFilter: "blur(16px) saturate(1.2)",
    WebkitBackdropFilter: "blur(16px) saturate(1.2)",
    color: "var(--color-field-ink)",
    flexShrink: 0,
    "&:hover": {
      backgroundColor: "oklch(from var(--color-canvas) l c h / 0.9)",
    },
    "&:disabled": {
      opacity: 0.4,
    },
  },
};

/** Compact gray / secondary control for inset list rows. */
export const iosCompactGrayStyles: ButtonProps["styles"] = {
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
};

/** Compact halt-tinted control for destructive row actions. */
export const iosCompactDangerStyles: ButtonProps["styles"] = {
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
};

/** Transparent TextInput sitting inside IosInsetGroup. */
export const iosInsetTextInputStyles = {
  root: { width: "100%" },
  label: {
    paddingInline: "1rem",
    paddingTop: "0.65rem",
    fontSize: "0.8125rem",
    fontWeight: 510,
    color: "var(--color-field-ink-muted)",
  },
  input: {
    border: "none",
    background: "transparent",
    minHeight: "2.75rem",
    color: "var(--color-field-ink)",
    fontSize: "1rem",
    fontWeight: 510,
    paddingInline: "1rem",
    paddingBlock: "0.5rem",
  },
} as const;

/** Transparent Textarea sitting inside IosInsetGroup. */
export const iosInsetTextareaStyles = {
  root: { width: "100%" },
  label: {
    paddingInline: "1rem",
    paddingTop: "0.65rem",
    fontSize: "0.8125rem",
    fontWeight: 510,
    color: "var(--color-field-ink-muted)",
  },
  input: {
    border: "none",
    background: "transparent",
    color: "var(--color-field-ink)",
    fontSize: "0.9375rem",
    fontWeight: 510,
    paddingInline: "1rem",
    paddingBlock: "0.65rem",
    minHeight: "5.5rem",
  },
} as const;

/** Full-bleed bottom Drawer chassis (Friends / Leaderboard / report sheets). */
export function iosBottomDrawerStyles(
  maxHeight: string | false = "min(70dvh, 34rem)",
) {
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
      ...(maxHeight === false ? {} : { maxHeight }),
      backgroundColor: "var(--color-canvas)",
      borderTopLeftRadius: 24,
      borderTopRightRadius: 24,
      borderTop: "0.33px solid oklch(from var(--color-field-ink) l c h / 0.14)",
      overflow: "auto" as const,
    },
    body: {
      width: "100%",
      paddingTop: "0.5rem",
      paddingBottom: "max(1.25rem, env(safe-area-inset-bottom))",
    },
  };
}
