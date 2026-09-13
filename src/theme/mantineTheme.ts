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
  },
});
