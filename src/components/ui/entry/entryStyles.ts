import type { CSSProperties } from "react";

/**
 * Concrete Mantine `styles` object (not the function form).
 * Keeps `.root` accessible when callers spread/override shared chrome styles.
 */
export type EntryButtonStyles = {
  root: CSSProperties & Record<string, unknown>;
};

/** iOS filled tint control (logo orange). */
export const filledStyles: EntryButtonStyles = {
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
export const grayStyles: EntryButtonStyles = {
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
export const plainStyles: EntryButtonStyles = {
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
export const compactFilledStyles: EntryButtonStyles = {
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
export const mapIslandFilledStyles: EntryButtonStyles = {
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

export type MapToolSlotTone = "tool" | "history";

/** Caption under hunt/session slot icon (sentence case; not Survey display). */
export const mapToolSlotLabelStyle = {
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

/** Hunt / session dock chip (column icon+label). */
export function mapToolSlotStyles(
  pressed: boolean,
  tone: MapToolSlotTone = "tool",
): EntryButtonStyles {
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

export type ChoiceTone = "default" | "success" | "danger";

/** Ask kit choice chip / catalog row / binary answer under Mantine flag. */
export function choiceChipStyles(
  selected: boolean,
  tone: ChoiceTone = "default",
): EntryButtonStyles {
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
export const filterChipTrackStyle = {
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
export function filterChipStyles(selected: boolean): EntryButtonStyles {
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
export function catalogTileStyles(selected: boolean): EntryButtonStyles {
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
export const askInsetSurfaceStyle = {
  borderRadius: 14,
  backgroundColor: "oklch(from var(--color-field-ink) l c h / 0.06)",
  border: "0.33px solid oklch(from var(--color-field-ink) l c h / 0.1)",
  boxShadow: "none",
} as const;

/** Island-height icon control (pause / resume beside the clock). */
export const mapIslandIconStyles: EntryButtonStyles = {
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
export const compactGrayStyles: EntryButtonStyles = {
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
export const compactDangerStyles: EntryButtonStyles = {
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

/** Transparent TextInput sitting inside InsetGroup. */
export const insetTextInputStyles = {
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

/** Transparent Textarea sitting inside InsetGroup. */
export const insetTextareaStyles = {
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
export function bottomDrawerStyles(
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

/** Fixed entry-route backdrop (non-map routes). */
export const entryBackdropStyle: CSSProperties = {
  position: "fixed",
  inset: 0,
  zIndex: -1,
  pointerEvents: "none",
  backgroundColor: "var(--color-canvas)",
  backgroundImage: [
    "radial-gradient(ellipse 70% 45% at 100% 0%, oklch(from var(--color-flag) l c h / 0.12), transparent 55%)",
    "radial-gradient(ellipse 60% 50% at 0% 100%, oklch(from var(--color-signal) l c h / 0.08), transparent 60%)",
  ].join(", "),
};

/** Home / entry route poster shell. */
export const homePosterStyle: CSSProperties = {
  position: "relative",
  isolation: "isolate",
  backgroundColor: "transparent",
};

/** Top signal→flag accent bar (replaces `.home-terminal-accent::after`). */
export const homeTerminalAccentBarStyle: CSSProperties = {
  position: "fixed",
  top: "env(safe-area-inset-top, 0)",
  left: 0,
  right: 0,
  zIndex: 0,
  height: 3,
  pointerEvents: "none",
  background:
    "linear-gradient(90deg, var(--color-signal), var(--color-flag) 45%, var(--color-flag))",
};

export type HomeCardBtnVariant = "primary" | "secondary";

const homeCardBtnBase: CSSProperties = {
  display: "flex",
  minHeight: "3.125rem",
  width: "100%",
  alignItems: "center",
  justifyContent: "space-between",
  borderRadius: "var(--jl-control-radius, 14px)",
  border: "var(--jl-hairline, 0.33px) solid oklch(from var(--color-field-ink) l c h / 0.14)",
  padding: "0.875rem 1rem",
  fontFamily: "var(--font-body)",
  fontSize: "1.0625rem",
  fontWeight: 590,
  letterSpacing: "-0.01em",
  textTransform: "none",
  backdropFilter: "var(--jl-frost-blur, blur(20px) saturate(1.4))",
  WebkitBackdropFilter: "var(--jl-frost-blur, blur(20px) saturate(1.4))",
  textDecoration: "none",
  boxSizing: "border-box",
};

/** Frosted home / play-hub row control (was `.home-card-btn*`). */
export function homeCardBtnStyle(
  variant: HomeCardBtnVariant = "secondary",
): CSSProperties {
  switch (variant) {
    case "primary":
      return {
        ...homeCardBtnBase,
        borderColor: "var(--color-flag)",
        background: "var(--color-flag)",
        color: "var(--color-flag-ink)",
      };
    default:
      return {
        ...homeCardBtnBase,
        background: "oklch(from var(--color-canvas) calc(l + 0.04) c h)",
        color: "var(--color-field-ink)",
      };
  }
}

export const homeCardBtnHintStyle: CSSProperties = {
  fontSize: "0.8125rem",
  fontWeight: 510,
  letterSpacing: "-0.01em",
  opacity: 0.72,
};

export const homeCardBtnHintOnPrimaryStyle: CSSProperties = {
  ...homeCardBtnHintStyle,
  color: "var(--color-flag-ink)",
  opacity: 0.72,
};

export const oauthProviderButtonStyle: CSSProperties = {
  display: "flex",
  minHeight: "3.75rem",
  width: "100%",
  alignItems: "center",
  justifyContent: "center",
  gap: "0.75rem",
  borderRadius: "var(--radius-hud-md)",
  border: "2px solid oklch(0.99 0.002 250)",
  background: "oklch(0.99 0.002 250)",
  color: "oklch(0.18 0.02 250)",
  fontFamily: "var(--font-body)",
  fontSize: "1rem",
  fontWeight: 500,
  letterSpacing: "0.01em",
  textTransform: "none",
};

export const oauthProviderButtonIconStyle: CSSProperties = {
  display: "inline-flex",
  flexShrink: 0,
};

export const homeFeedbackLinkStyle: CSSProperties = {
  display: "block",
  width: "100%",
  marginTop: "0.25rem",
  padding: "0.625rem 0.25rem",
  textAlign: "center",
  fontSize: "0.8125rem",
  fontWeight: 600,
  letterSpacing: "0.04em",
  textTransform: "uppercase",
  color: "var(--color-field-ink-muted)",
  textDecoration: "none",
  backgroundColor: "transparent",
  border: "none",
  cursor: "pointer",
};

export const fieldFrameStyle: CSSProperties = {
  border: "2px solid var(--color-rule)",
  background: "var(--color-canvas)",
  padding: "1rem",
};

export const sheetHandleStyle: CSSProperties = {
  marginInline: "auto",
  marginBottom: "0.75rem",
  height: 3,
  width: "2.5rem",
  background: "var(--color-flag)",
  display: "block",
  borderRadius: 0,
};

export const toggleRowStyle: CSSProperties = {
  display: "flex",
  minHeight: "3rem",
  cursor: "pointer",
  alignItems: "center",
  justifyContent: "space-between",
  gap: "0.75rem",
  border: "2px solid var(--color-rule)",
  background: "oklch(from var(--color-canvas) calc(l + 0.04) c h)",
  paddingInline: "1rem",
  fontSize: "0.875rem",
  color: "var(--color-field-ink)",
};

export const segmentControlTrackStyle: CSSProperties = {
  display: "grid",
  gap: "0.25rem",
  border: "2px solid var(--color-rule)",
  background: "var(--color-canvas)",
  padding: "0.25rem",
};

export const segmentChipsTrackStyle: CSSProperties = {
  display: "flex",
  gap: "0.25rem",
  overflowX: "auto",
  overscrollBehaviorX: "contain",
  border: "2px solid var(--color-rule)",
  background: "var(--color-canvas)",
  padding: "0.25rem",
  WebkitOverflowScrolling: "touch",
};

export function segmentBtnStyle(selected: boolean): CSSProperties {
  return {
    minHeight: "2.75rem",
    minWidth: 0,
    borderRadius: "var(--radius-hud-sm)",
    border: selected
      ? "2px solid var(--color-flag)"
      : "2px solid transparent",
    background: selected ? "var(--color-flag-soft)" : "transparent",
    fontFamily: "var(--font-body)",
    fontSize: "0.8125rem",
    fontWeight: 590,
    letterSpacing: "0.06em",
    textTransform: "none",
    color: selected ? "var(--color-flag)" : "var(--color-field-ink-muted)",
  };
}

/** Enter animation class hook kept for motion.css reduced-motion overrides. */
export const homeEnterActionsStyle: CSSProperties = {
  animation: "home-enter 0.22s ease-out both",
};

/** Frosted map floating control (zoom / style / recenter). Was `.hud-chrome`. */
export function hudChromeStyles(pressed = false): EntryButtonStyles {
  return {
    root: {
      display: "inline-flex",
      minHeight: "2.75rem",
      minWidth: "2.75rem",
      height: "var(--map-zoom-btn-size, 2.75rem)",
      width: "var(--map-zoom-btn-size, 2.75rem)",
      alignItems: "center",
      justifyContent: "center",
      padding: 0,
      borderRadius: 14,
      border: pressed
        ? "0.33px solid oklch(from var(--color-highlight) l c h / 0.55)"
        : "0.33px solid oklch(from var(--color-rule) l c h / 0.65)",
      backgroundColor: pressed
        ? "oklch(from var(--color-highlight) l c h / 0.22)"
        : "oklch(from var(--color-canvas) l c h / 0.88)",
      color: pressed ? "var(--color-highlight)" : "var(--color-field-ink)",
      backdropFilter: "blur(24px) saturate(1.35)",
      WebkitBackdropFilter: "blur(24px) saturate(1.35)",
      boxShadow: pressed
        ? "0 0 0 1px oklch(from var(--color-highlight) l c h / 0.35), 0 4px 14px 0 oklch(0.1 0.04 265 / 0.28)"
        : "0 4px 14px 0 oklch(0.1 0.04 265 / 0.28)",
      overflow: "hidden",
      WebkitTapHighlightColor: "transparent",
      "&:hover:not(:disabled)": {
        backgroundColor: pressed
          ? "oklch(from var(--color-highlight) l c h / 0.28)"
          : "oklch(from var(--color-canvas) l c h / 0.96)",
      },
      "&:disabled": {
        opacity: 0.4,
        cursor: "not-allowed",
      },
    },
  };
}

/** Map floating panel / sheet surface (was `.hud-panel`). */
export const hudPanelStyle: CSSProperties = {
  position: "relative",
  overflow: "hidden",
  borderRadius: 16,
  border: "0.33px solid oklch(from var(--color-rule) l c h / 0.65)",
  backgroundColor: "oklch(from var(--color-canvas) l c h / 0.92)",
  backdropFilter: "blur(24px) saturate(1.35)",
  WebkitBackdropFilter: "blur(24px) saturate(1.35)",
  boxShadow: "0 8px 24px 0 oklch(0.1 0.04 265 / 0.35)",
  color: "var(--color-field-ink)",
};

/** Bottom sheet skin (was `.hud-sheet`). */
export const hudSheetStyle: CSSProperties = {
  borderTop: "3px solid var(--color-flag)",
  backgroundColor: "oklch(from var(--color-canvas) l c h / 0.96)",
  boxShadow: "0 -12px 40px oklch(0.08 0.04 265 / 0.55)",
};

/** Modal scrim (was `.hud-scrim`). */
export const hudScrimStyle: CSSProperties = {
  backgroundColor: "oklch(from var(--color-canvas) l c h / 0.88)",
};

/** Ask path frosted panel (was `.ask-hud-panel`). */
export const askHudPanelStyle: CSSProperties = {
  position: "relative",
  overflow: "hidden",
  borderRadius: 16,
  border: "0.33px solid oklch(from var(--color-rule) l c h / 0.65)",
  backgroundColor: "oklch(from var(--color-canvas) l c h / 0.94)",
  backdropFilter: "blur(24px) saturate(1.35)",
  WebkitBackdropFilter: "blur(24px) saturate(1.35)",
  boxShadow: "0 8px 24px 0 oklch(0.1 0.04 265 / 0.35)",
  color: "var(--color-field-ink)",
};

/** Detail-panel icon close (was `.jl-sync-detail-panel__close`). */
export const sheetIconCloseStyle: CSSProperties = {
  display: "inline-flex",
  height: "2rem",
  width: "2rem",
  flexShrink: 0,
  alignItems: "center",
  justifyContent: "center",
  margin: "-0.125rem -0.25rem -0.125rem 0",
  border: "none",
  borderRadius: 10,
  background: "transparent",
  color: "var(--color-field-ink-muted)",
  cursor: "pointer",
};

export type SyncBeaconStatus =
  | "synced"
  | "saving"
  | "offline"
  | "degraded"
  | "error";

const syncBeaconTone: Record<
  SyncBeaconStatus,
  { border: string; background: string; color: string; dashed?: boolean }
> = {
  synced: {
    border: "oklch(from var(--color-trail) l c h / 0.55)",
    background: "oklch(from var(--color-trail) l c h / 0.1)",
    color: "var(--color-trail)",
  },
  saving: {
    border: "oklch(from var(--color-signal) l c h / 0.55)",
    background: "oklch(from var(--color-signal) l c h / 0.1)",
    color: "var(--color-signal)",
  },
  offline: {
    border: "oklch(from var(--color-flag) l c h / 0.6)",
    background: "oklch(from var(--color-flag) l c h / 0.1)",
    color: "var(--color-flag)",
    dashed: true,
  },
  degraded: {
    border: "oklch(from var(--color-flag) l c h / 0.6)",
    background: "oklch(from var(--color-flag) l c h / 0.1)",
    color: "var(--color-flag)",
    dashed: true,
  },
  error: {
    border: "oklch(from var(--color-halt) l c h / 0.65)",
    background: "oklch(from var(--color-halt) l c h / 0.12)",
    color: "var(--color-halt)",
  },
};

/** Sync status beacon (was `.jl-sync-beacon*`). */
export function syncBeaconStyle(
  status: SyncBeaconStatus,
  size: "sm" | "md" = "md",
): CSSProperties {
  const tone = syncBeaconTone[status];
  const dim = size === "sm" ? "1.25rem" : "1.625rem";
  return {
    display: "inline-flex",
    flexShrink: 0,
    alignItems: "center",
    justifyContent: "center",
    width: dim,
    height: dim,
    borderRadius: 9999,
    border: `${tone.dashed ? "1.5px dashed" : "1.5px solid"} ${tone.border}`,
    background: tone.background,
    color: tone.color,
    boxShadow: "0 4px 14px 0 oklch(0.1 0.04 265 / 0.28)",
  };
}

/** Preload leading beacon in detail panels. */
export function preloadBeaconStyle(
  tone: "loading" | "failed",
  size: "sm" | "md" = "sm",
): CSSProperties {
  const dim = size === "sm" ? "1.25rem" : "1.625rem";
  const color =
    tone === "failed" ? "var(--color-flag)" : "var(--color-signal)";
  return {
    display: "inline-flex",
    flexShrink: 0,
    alignItems: "center",
    justifyContent: "center",
    width: dim,
    height: dim,
    borderRadius: 9999,
    border: `1.5px solid oklch(from ${color} l c h / 0.55)`,
    background: `oklch(from ${color} l c h / 0.14)`,
    color,
    boxShadow: "0 4px 14px 0 oklch(0.1 0.04 265 / 0.28)",
  };
}

/** Wizard place-phase attention ring overlay. */
export const mapAttentionRingStyle: CSSProperties = {
  position: "fixed",
  inset: 0,
  pointerEvents: "none",
  zIndex: 1001,
  boxShadow: "inset 0 0 0 3px oklch(from var(--color-highlight) l c h / 0.5)",
};

/** Icon wrap inside hunt / session slot (was `.jl-tool-slot-icon`). */
export const mapToolSlotIconStyle: CSSProperties = {
  display: "flex",
  height: "1.75rem",
  width: "1.75rem",
  alignItems: "center",
  justifyContent: "center",
};

/** Expanded map status rail sits in-flow (clears absolute overlay inset). */
export const statusRailExpandedFlowStyle: CSSProperties = {
  position: "relative",
  inset: "auto",
  top: "auto",
  right: "auto",
  left: "auto",
};

/** Chat unread pip on session dock slots (was `.jl-unread-badge`). */
export const chatUnreadBadgeStyle: CSSProperties = {
  position: "absolute",
  top: "-0.375rem",
  right: "-0.5rem",
  minWidth: "1.375rem",
  height: "1.375rem",
  borderRadius: 9999,
  border: "2px solid var(--color-surface-deep)",
  background: "var(--color-action)",
  boxShadow: "0 0 0 2px oklch(from var(--color-action) l c h / 0.35)",
  pointerEvents: "none",
  padding: "0 0.25rem",
  fontSize: "0.6875rem",
  fontWeight: 700,
  lineHeight: 1,
  color: "var(--color-action-ink)",
  display: "flex",
  alignItems: "center",
  justifyContent: "center",
};

export const chatUnreadBadgeHostStyle: CSSProperties = {
  position: "relative",
};
