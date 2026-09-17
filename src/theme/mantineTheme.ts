import { colorsTuple, createTheme } from "@mantine/core";

/** Matches `--z-modal` in `src/styles/base.css`. */
export const JETLAG_MODAL_Z_INDEX = 1100;

/** Matches `--z-toast` in `src/styles/base.css`. */
export const JETLAG_TOAST_Z_INDEX = 1200;

const appleSystemSans =
  '-apple-system, BlinkMacSystemFont, "SF Pro Text", "Segoe UI", system-ui, sans-serif';

/** Apple-native controls; logo navy + sunset orange tint. */
export const jetlagMantineTheme = createTheme({
  primaryColor: "flag",
  colors: {
    flag: colorsTuple("oklch(0.688 0.155 47)"),
  },
  autoContrast: true,
  defaultRadius: "lg",
  fontFamily: appleSystemSans,
  fontFamilyMonospace: "ui-monospace, SFMono-Regular, Menlo, monospace",
  headings: {
    fontFamily: appleSystemSans,
    fontWeight: "700",
  },
  components: {
    Button: {
      defaultProps: {
        radius: 14,
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
    Notification: {
      defaultProps: {
        radius: 14,
        withBorder: true,
      },
      styles: {
        root: {
          fontFamily: appleSystemSans,
          backgroundColor: "oklch(from var(--color-canvas) l c h / 0.92)",
          border: "0.33px solid oklch(from var(--color-field-ink) l c h / 0.14)",
          backdropFilter: "blur(20px) saturate(1.4)",
          WebkitBackdropFilter: "blur(20px) saturate(1.4)",
          boxShadow: "0 8px 24px 0 oklch(0.1 0.04 265 / 0.45)",
        },
        title: {
          fontWeight: 590,
          letterSpacing: "-0.01em",
        },
        description: {
          color: "var(--color-field-ink-muted)",
        },
      },
    },
    Drawer: {
      defaultProps: {
        radius: 24,
        overlayProps: { backgroundOpacity: 0.4, blur: 3 },
      },
    },
  },
});
