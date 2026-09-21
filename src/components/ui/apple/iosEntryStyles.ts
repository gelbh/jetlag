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

export type IosMapToolSlotTone = "tool" | "history";

/** Caption under hunt/session slot icon (sentence case; not Survey display). */
export const iosMapToolSlotLabelStyle = {
  display: "block",
  maxWidth: "100%",
  overflow: "hidden",
  textOverflow: "ellipsis",
  fontFamily: "var(--mantine-font-family)",
  fontSize: "0.625rem",
  fontWeight: 510,
  letterSpacing: "-0.01em",
  lineHeight: 1.15,
  textTransform: "none" as const,
  whiteSpace: "nowrap" as const,
};

/** Hunt / session dock chip under jl.playerUi.mantine (column icon+label). */
export function iosMapToolSlotStyles(
  pressed: boolean,
  tone: IosMapToolSlotTone = "tool",
): ButtonProps["styles"] {
  const history = tone === "history";
  return {
    root: {
      display: "flex",
      flexDirection: "column",
      alignItems: "center",
      justifyContent: "center",
      gap: "0.125rem",
      minWidth: history ? "2.5rem" : "2.75rem",
      minHeight: "2.75rem",
      flex: history ? "0 0 auto" : "1 1 0",
      padding: history ? "0.2rem 0.1rem" : "0.25rem 0.125rem",
      borderRadius: history ? 12 : 10,
      border: pressed
        ? "0.33px solid oklch(from var(--color-highlight) l c h / 0.75)"
        : "0.33px solid transparent",
      backgroundColor: pressed
        ? "oklch(from var(--color-highlight) l c h / 0.22)"
        : history
          ? "transparent"
          : "transparent",
      color: pressed
        ? "var(--color-highlight)"
        : history
          ? "oklch(from var(--color-field-ink-muted) l c h / 0.85)"
          : "var(--color-field-ink-muted)",
      opacity: history && !pressed ? 0.88 : 1,
      WebkitTapHighlightColor: "transparent",
      "&:hover:not(:disabled)": {
        backgroundColor: pressed
          ? "oklch(from var(--color-highlight) l c h / 0.28)"
          : "oklch(from var(--color-field-ink) l c h / 0.1)",
        borderColor: pressed
          ? "oklch(from var(--color-highlight) l c h / 0.85)"
          : "oklch(from var(--color-field-ink) l c h / 0.14)",
        color: pressed
          ? "var(--color-highlight)"
          : "var(--color-field-ink)",
        opacity: 1,
      },
      "&:disabled": {
        opacity: 0.35,
        cursor: "not-allowed",
      },
    },
  };
}

export type IosChoiceTone = "default" | "success" | "danger";

/** Ask kit choice chip / catalog row / binary answer under Mantine flag. */
export function iosChoiceChipStyles(
  selected: boolean,
  tone: IosChoiceTone = "default",
): ButtonProps["styles"] {
  const selectedBg =
    tone === "success"
      ? "var(--color-status-success, var(--color-trail))"
      : tone === "danger"
        ? "var(--color-halt)"
        : "var(--color-flag)";
  const selectedFg =
    tone === "danger"
      ? "var(--color-canvas)"
      : tone === "success"
        ? "var(--color-action-ink, var(--color-canvas))"
        : "var(--color-flag-ink)";

  return {
    root: {
      minHeight: "3rem",
      borderRadius: 14,
      border: "none",
      fontWeight: 590,
      fontSize: "0.875rem",
      paddingInline: "0.75rem",
      display: "inline-flex",
      alignItems: "center",
      backgroundColor: selected
        ? selectedBg
        : "oklch(from var(--color-rule) l c h / 0.45)",
      color: selected ? selectedFg : "var(--color-field-ink)",
      "&:hover:not(:disabled)": {
        backgroundColor: selected
          ? selectedBg
          : "oklch(from var(--color-rule) l c h / 0.55)",
      },
      "&:disabled": {
        opacity: 0.4,
        cursor: "not-allowed",
      },
    },
  };
}

/** Frosted track for horizontally scrolling iOS filter chips. */
export const iosFilterChipTrackStyle = {
  display: "flex",
  gap: 4,
  padding: 3,
  borderRadius: 12,
  backgroundColor: "oklch(from var(--color-field-ink) l c h / 0.08)",
  border: "0.33px solid oklch(from var(--color-field-ink) l c h / 0.12)",
  overflowX: "auto" as const,
  WebkitOverflowScrolling: "touch" as const,
};

/**
 * Compact filter pill (Photos / Music style) for category selectors.
 * Selected = elevated white segment on the frosted track.
 */
export function iosFilterChipStyles(selected: boolean): ButtonProps["styles"] {
  return {
    root: {
      flex: "0 0 auto",
      display: "inline-flex",
      alignItems: "center",
      gap: 6,
      height: 32,
      minHeight: 32,
      paddingInline: 12,
      borderRadius: 10,
      border: "none",
      fontWeight: 590,
      fontSize: "0.8125rem",
      letterSpacing: "-0.01em",
      lineHeight: 1,
      whiteSpace: "nowrap",
      color: "var(--color-field-ink)",
      backgroundColor: selected
        ? "oklch(from var(--color-canvas) l c h / 0.96)"
        : "transparent",
      boxShadow: selected
        ? "0 1px 2px oklch(from var(--color-field-ink) l c h / 0.14), 0 0 0 0.33px oklch(from var(--color-field-ink) l c h / 0.08)"
        : "none",
      transition:
        "background-color 140ms ease, box-shadow 140ms ease, color 140ms ease",
      "&:hover:not(:disabled)": {
        backgroundColor: selected
          ? "oklch(from var(--color-canvas) l c h / 0.96)"
          : "oklch(from var(--color-field-ink) l c h / 0.06)",
      },
      "&:active:not(:disabled)": {
        opacity: 0.85,
      },
    },
  };
}

/**
 * Quiet 2-col catalog tile (Matching categories). Soft inset, no drop shadow.
 * Selected uses a light flag wash + hairline, not a solid flag brick.
 */
export function iosCatalogTileStyles(selected: boolean): ButtonProps["styles"] {
  return {
    root: {
      width: "100%",
      minHeight: "4.75rem",
      height: "100%",
      display: "flex",
      flexDirection: "column",
      alignItems: "center",
      justifyContent: "center",
      gap: 8,
      padding: "0.7rem 0.55rem",
      borderRadius: 14,
      border: selected
        ? "0.33px solid oklch(from var(--color-flag) l c h / 0.4)"
        : "0.33px solid oklch(from var(--color-field-ink) l c h / 0.1)",
      backgroundColor: selected
        ? "oklch(from var(--color-flag) l c h / 0.12)"
        : "oklch(from var(--color-field-ink) l c h / 0.045)",
      color: "var(--color-field-ink)",
      fontWeight: 590,
      fontSize: "0.8125rem",
      letterSpacing: "-0.015em",
      lineHeight: 1.25,
      boxShadow: "none",
      transition:
        "background-color 140ms ease, border-color 140ms ease, transform 120ms ease",
      "&:hover:not(:disabled)": {
        backgroundColor: selected
          ? "oklch(from var(--color-flag) l c h / 0.16)"
          : "oklch(from var(--color-field-ink) l c h / 0.08)",
      },
      "&:active:not(:disabled)": {
        transform: "scale(0.98)",
      },
    },
  };
}

/** Flat question / callout surface inside Ask sheets (no elevation shadow). */
export const iosAskInsetSurfaceStyle = {
  borderRadius: 14,
  backgroundColor: "oklch(from var(--color-field-ink) l c h / 0.06)",
  border: "0.33px solid oklch(from var(--color-field-ink) l c h / 0.1)",
  boxShadow: "none",
} as const;

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
