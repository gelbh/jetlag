import {
  colorsTuple,
  createTheme,
  type CSSVariablesResolver,
  type MantineThemeOverride,
} from "@mantine/core";

/** Matches `--z-dock` in `src/styles/base.css`. */
export const JETLAG_DOCK_Z_INDEX = 1000;

/** Matches `--z-banner` in `src/styles/base.css`. */
export const JETLAG_BANNER_Z_INDEX = 1001;

/** Matches `--z-panel` in `src/styles/base.css`. */
export const JETLAG_PANEL_Z_INDEX = 1002;

/** Matches `--z-modal` in `src/styles/base.css`. */
export const JETLAG_MODAL_Z_INDEX = 1100;

/** Matches `--z-toast` in `src/styles/base.css`. */
export const JETLAG_TOAST_Z_INDEX = 1200;

const appleSystemSans =
  '-apple-system, BlinkMacSystemFont, "SF Pro Text", "Segoe UI", system-ui, sans-serif';

/**
 * Brand + chrome tokens for map-shell/dock.
 * Prefer reading these via `theme.other` / CSS vars over new global CSS.
 * Dock / safe-area / z-index / spacing mirror `src/styles/base.css`.
 */
export const jetlagBrand = {
  canvas: "oklch(0.285 0.036 255)",
  canvasRaised: "oklch(0.32 0.034 255)",
  fieldInk: "oklch(0.925 0 90)",
  fieldInkMuted: "oklch(0.684 0.034 256)",
  flag: "oklch(0.688 0.155 47)",
  flagInk: "oklch(0.22 0.03 47)",
  flagSoft: "oklch(0.688 0.155 47 / 0.22)",
  signal: "oklch(0.806 0.147 81)",
  trail: "oklch(0.72 0.12 145)",
  halt: "oklch(0.587 0.206 26)",
  rule: "oklch(0.445 0.038 256)",
  highlight: "oklch(0.78 0.12 85)",
  controlRadius: 14,
  sheetRadius: 24,
  insetRadius: 12,
  hairline: "0.33px",
  frostBlur: "blur(20px) saturate(1.4)",
  floatShadow: "0 8px 24px 0 oklch(0.1 0.04 265 / 0.45)",
  /** Matches `--dock-height`. */
  dockHeight: "4.25rem",
  /** Matches `--dock-content-height` (narrow default; wide media bumps to dockHeight). */
  dockContentHeight: "2.75rem",
  /** Matches `--status-bar-height`. */
  statusBarHeight: "3.25rem",
  /** Matches `--hider-action-bar-height` (phone default). */
  hiderActionBarHeight: "3.75rem",
  /** Matches `--chrome-gap-above-dock`. */
  chromeGapAboveDock: "0.5rem",
  /** Matches `--chrome-gap-bottom`. */
  chromeGapBottom: "0.75rem",
  /** Matches `--dock-island-height` (phone hunt band; wide media bumps via CSS). */
  dockIslandHeight: "3.25rem",
  /** Admin map shell rail widths (bridged to `--ops-rail-*` for map-shell.css). */
  opsRailWidth: "22rem",
  opsRailCollapsedWidth: "2.75rem",
  /** Ask HUD strip / rail height tokens (was `ask-hud.css`). ≥44px touch. */
  askHudStripHeight: "3rem",
  askHudRailMaxHeight: "40dvh",
  /** Matches `--safe-area-top` / env bridge (Cap AC may keep env until proven). */
  safeAreaTop: "var(--safe-area-top)",
  /** Matches `--safe-area-bottom`. */
  safeAreaBottom: "var(--safe-area-bottom)",
  zDock: JETLAG_DOCK_Z_INDEX,
  zBanner: JETLAG_BANNER_Z_INDEX,
  zPanel: JETLAG_PANEL_Z_INDEX,
  zModal: JETLAG_MODAL_Z_INDEX,
  zToast: JETLAG_TOAST_Z_INDEX,
} as const;

const hairlineBorder = `${jetlagBrand.hairline} solid oklch(from ${jetlagBrand.fieldInk} l c h / 0.14)`;

/** Apple-native Operate chrome; logo navy + sunset orange tint. */
export const jetlagTheme: MantineThemeOverride = createTheme({
  primaryColor: "flag",
  primaryShade: { light: 6, dark: 5 },
  colors: {
    flag: colorsTuple(jetlagBrand.flag),
    /** Error / dead-session role; prefer over unthemed Mantine red. */
    halt: colorsTuple(jetlagBrand.halt),
  },
  white: jetlagBrand.fieldInk,
  black: jetlagBrand.canvas,
  autoContrast: true,
  cursorType: "pointer",
  defaultRadius: jetlagBrand.controlRadius,
  fontFamily: appleSystemSans,
  fontFamilyMonospace: "ui-monospace, SFMono-Regular, Menlo, monospace",
  headings: {
    fontFamily: appleSystemSans,
    fontWeight: "700",
  },
  other: {
    ...jetlagBrand,
  },
  components: {
    Button: {
      defaultProps: {
        radius: jetlagBrand.controlRadius,
        size: "md",
      },
      styles: {
        root: {
          fontFamily: appleSystemSans,
          fontWeight: 590,
          textTransform: "none",
          letterSpacing: "-0.01em",
          fontSize: "1.0625rem",
        },
      },
    },
    ActionIcon: {
      defaultProps: {
        radius: 12,
        variant: "subtle",
        color: "gray",
      },
      styles: {
        root: {
          fontFamily: appleSystemSans,
        },
      },
    },
    TextInput: {
      defaultProps: {
        radius: jetlagBrand.insetRadius,
      },
      styles: {
        input: {
          fontFamily: appleSystemSans,
          fontSize: "1.0625rem",
          letterSpacing: "-0.01em",
        },
      },
    },
    Textarea: {
      defaultProps: {
        radius: jetlagBrand.insetRadius,
      },
      styles: {
        input: {
          fontFamily: appleSystemSans,
          fontSize: "1.0625rem",
          letterSpacing: "-0.01em",
        },
      },
    },
    Paper: {
      defaultProps: {
        radius: 16,
        shadow: "sm",
      },
    },
    Modal: {
      defaultProps: {
        radius: jetlagBrand.sheetRadius,
        centered: true,
        overlayProps: { backgroundOpacity: 0.4, blur: 3 },
      },
      styles: {
        content: {
          backgroundColor: `oklch(from ${jetlagBrand.canvas} l c h / 0.94)`,
          border: hairlineBorder,
          backdropFilter: jetlagBrand.frostBlur,
          WebkitBackdropFilter: jetlagBrand.frostBlur,
        },
        header: {
          backgroundColor: "transparent",
        },
        title: {
          fontWeight: 700,
          letterSpacing: "-0.02em",
        },
      },
    },
    Drawer: {
      defaultProps: {
        radius: jetlagBrand.sheetRadius,
        overlayProps: { backgroundOpacity: 0.4, blur: 3 },
      },
      styles: {
        content: {
          backgroundColor: `oklch(from ${jetlagBrand.canvas} l c h / 0.94)`,
          border: hairlineBorder,
          backdropFilter: jetlagBrand.frostBlur,
          WebkitBackdropFilter: jetlagBrand.frostBlur,
        },
        header: {
          backgroundColor: "transparent",
        },
        title: {
          fontWeight: 700,
          letterSpacing: "-0.02em",
        },
      },
    },
    Notification: {
      defaultProps: {
        radius: jetlagBrand.controlRadius,
        withBorder: true,
        color: "halt",
      },
      styles: {
        root: {
          fontFamily: appleSystemSans,
          backgroundColor: `oklch(from ${jetlagBrand.canvas} l c h / 0.92)`,
          border: hairlineBorder,
          backdropFilter: jetlagBrand.frostBlur,
          WebkitBackdropFilter: jetlagBrand.frostBlur,
          boxShadow: jetlagBrand.floatShadow,
        },
        title: {
          fontWeight: 590,
          letterSpacing: "-0.01em",
          color: jetlagBrand.fieldInk,
        },
        description: {
          color: jetlagBrand.fieldInk,
        },
      },
    },
    Alert: {
      defaultProps: {
        radius: jetlagBrand.controlRadius,
        color: "halt",
        variant: "light",
      },
      styles: {
        root: {
          fontFamily: appleSystemSans,
          backgroundColor: `oklch(from ${jetlagBrand.canvas} l c h / 0.92)`,
          border: `${jetlagBrand.hairline} solid oklch(from ${jetlagBrand.halt} l c h / 0.45)`,
          backdropFilter: jetlagBrand.frostBlur,
          WebkitBackdropFilter: jetlagBrand.frostBlur,
          boxShadow: jetlagBrand.floatShadow,
        },
        title: {
          fontWeight: 590,
          letterSpacing: "-0.01em",
        },
        message: {
          color: jetlagBrand.fieldInk,
        },
      },
    },
    SegmentedControl: {
      defaultProps: {
        radius: jetlagBrand.insetRadius,
      },
      styles: {
        root: {
          backgroundColor: `oklch(from ${jetlagBrand.fieldInk} l c h / 0.08)`,
          border: hairlineBorder,
        },
        label: {
          fontFamily: appleSystemSans,
          fontWeight: 590,
          letterSpacing: "-0.01em",
        },
      },
    },
  },
});

/** Bridges brand + chrome tokens onto `:root` for residual CSS. */
export const jetlagCssVariablesResolver: CSSVariablesResolver = () => ({
  variables: {
    "--jl-control-radius": `${jetlagBrand.controlRadius}px`,
    "--jl-sheet-radius": `${jetlagBrand.sheetRadius}px`,
    "--jl-inset-radius": `${jetlagBrand.insetRadius}px`,
    "--jl-hairline": jetlagBrand.hairline,
    "--jl-frost-blur": jetlagBrand.frostBlur,
    "--jl-float-shadow": jetlagBrand.floatShadow,
    "--jl-dock-height": jetlagBrand.dockHeight,
    "--jl-dock-content-height": jetlagBrand.dockContentHeight,
    "--jl-status-bar-height": jetlagBrand.statusBarHeight,
    "--jl-hider-action-bar-height": jetlagBrand.hiderActionBarHeight,
    "--jl-chrome-gap-above-dock": jetlagBrand.chromeGapAboveDock,
    "--jl-chrome-gap-bottom": jetlagBrand.chromeGapBottom,
    "--jl-dock-island-height": jetlagBrand.dockIslandHeight,
    "--jl-ops-rail-width": jetlagBrand.opsRailWidth,
    "--jl-ops-rail-collapsed-width": jetlagBrand.opsRailCollapsedWidth,
    /* Bridge names admin map-shell.css still reads. */
    "--ops-rail-width": jetlagBrand.opsRailWidth,
    "--ops-rail-collapsed-width": jetlagBrand.opsRailCollapsedWidth,
    "--ask-hud-strip-height": jetlagBrand.askHudStripHeight,
    "--ask-hud-rail-max-height": jetlagBrand.askHudRailMaxHeight,
    "--jl-ask-hud-strip-height": jetlagBrand.askHudStripHeight,
    "--jl-ask-hud-rail-max-height": jetlagBrand.askHudRailMaxHeight,
    "--jl-safe-area-top": jetlagBrand.safeAreaTop,
    "--jl-safe-area-bottom": jetlagBrand.safeAreaBottom,
    "--jl-z-dock": String(jetlagBrand.zDock),
    "--jl-z-banner": String(jetlagBrand.zBanner),
    "--jl-z-panel": String(jetlagBrand.zPanel),
    "--jl-z-modal": String(jetlagBrand.zModal),
    "--jl-z-toast": String(jetlagBrand.zToast),
  },
  light: {},
  dark: {
    "--mantine-color-body": jetlagBrand.canvas,
    "--mantine-color-text": jetlagBrand.fieldInk,
  },
});
