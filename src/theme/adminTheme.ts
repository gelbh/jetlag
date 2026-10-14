import {
  Accordion,
  ActionIcon,
  Alert,
  AppShell,
  Badge,
  Button,
  Chip,
  Divider,
  Drawer,
  Kbd,
  type MantineThemeOverride,
  Paper,
  Popover,
  Portal,
  Select,
  Table,
  Tabs,
  TextInput,
  Tooltip,
} from "@mantine/core";
import { type StatusTone, toneColor } from "@/theme/adminTone";

const rule = "1px solid var(--adm-rule)";

const inputStyles = {
  fontFamily: "var(--adm-font)",
  background: "var(--adm-paper-raised)",
  color: "var(--adm-ink)",
  border: rule,
  letterSpacing: "normal",
};

/** Overprint replaces the app's primary colour on controls without an explicit `color`. */
function controlColors(variant: string | undefined) {
  switch (variant ?? "filled") {
    case "filled":
      return {
        bg: "var(--adm-overprint)",
        hover: "color-mix(in oklch, var(--adm-overprint) 86%, var(--adm-ink))",
        color: "var(--adm-overprint-ink)",
        hoverColor: "var(--adm-overprint-ink)",
        bd: "1px solid transparent",
      };
    case "light":
      return {
        bg: "var(--adm-overprint-soft)",
        hover: "color-mix(in oklch, var(--adm-overprint) 24%, transparent)",
        color: "var(--adm-ink)",
        hoverColor: "var(--adm-ink)",
        bd: "1px solid transparent",
      };
    case "outline":
      return {
        bg: "transparent",
        hover: "var(--adm-overprint-soft)",
        color: "var(--adm-ink)",
        hoverColor: "var(--adm-ink)",
        bd: rule,
      };
    case "subtle":
    case "transparent":
      return {
        bg: "transparent",
        hover: variant === "subtle" ? "var(--adm-overprint-soft)" : "transparent",
        color: "var(--adm-ink)",
        hoverColor: "var(--adm-ink)",
        bd: "1px solid transparent",
      };
    default:
      return null;
  }
}

export const adminTheme: MantineThemeOverride = {
  fontFamily: "var(--adm-font)",
  headings: { fontFamily: "var(--adm-font)", fontWeight: "700" },
  defaultRadius: 0,
  components: {
    // One AdminWorld per page: Portal resolves the first matching host.
    Portal: Portal.extend({ defaultProps: { target: "[data-admin-portal]" } }),
    Tabs: Tabs.extend({
      styles: {
        list: { borderColor: "var(--adm-rule)" },
        tab: { color: "var(--adm-ink)", fontWeight: 600 },
      },
      vars: (_theme, props) => ({
        root: props.color ? {} : { "--tabs-color": "var(--adm-overprint)" },
      }),
    }),
    Badge: Badge.extend({
      defaultProps: { variant: "light" },
      styles: { root: { fontWeight: 700, letterSpacing: "0.04em" } },
      vars: (_theme, props) => {
        const { "data-tone": tone, "data-latest": latest } = props as {
          "data-tone"?: StatusTone;
          "data-latest"?: boolean;
        };
        if (!tone && props.color) return { root: {} };
        const color = toneColor[tone ?? "neutral"] ?? toneColor.neutral;
        return {
          root: {
            "--badge-bg":
              tone === "live" ? color : `color-mix(in oklch, ${color} 14%, var(--adm-paper))`,
            "--badge-color": "var(--adm-ink)",
            // Latest leg strip control: overprint ring, the course colour on an O-map.
            "--badge-bd": latest ? "2px solid var(--adm-overprint)" : `1px solid ${color}`,
          },
        };
      },
    }),
    Button: Button.extend({
      defaultProps: { radius: 0 },
      vars: (_theme, props) => {
        const colors = props.color ? null : controlColors(props.variant);
        if (!colors) return { root: {} };
        return {
          root: {
            "--button-bg": colors.bg,
            "--button-hover": colors.hover,
            "--button-color": colors.color,
            "--button-hover-color": colors.hoverColor,
            "--button-bd": colors.bd,
          },
        };
      },
      styles: {
        root: {
          fontFamily: "var(--adm-font)",
          fontWeight: 600,
          letterSpacing: "0.01em",
          boxShadow: "none",
        },
      },
    }),
    ActionIcon: ActionIcon.extend({
      defaultProps: { radius: 0, color: undefined },
      styles: { root: { fontFamily: "var(--adm-font)" } },
      vars: (_theme, props) => {
        const colors = props.color ? null : controlColors(props.variant);
        if (!colors) return { root: {} };
        return {
          root: {
            "--ai-bg": colors.bg,
            "--ai-hover": colors.hover,
            "--ai-color": colors.color,
            "--ai-hover-color": colors.hoverColor,
            "--ai-bd": colors.bd,
          },
        };
      },
    }),
    TextInput: TextInput.extend({
      defaultProps: { radius: 0 },
      styles: { input: inputStyles },
    }),
    Select: Select.extend({
      defaultProps: { radius: 0 },
      styles: {
        input: inputStyles,
        dropdown: {
          background: "var(--adm-paper-raised)",
          border: rule,
          boxShadow: "none",
        },
        option: { fontFamily: "var(--adm-font)", color: "var(--adm-ink)" },
      },
    }),
    Chip: Chip.extend({
      styles: (_theme, props) => ({
        label: props.checked
          ? {
              borderRadius: 0,
              fontFamily: "var(--adm-font)",
              background: "var(--adm-overprint)",
              color: "var(--adm-overprint-ink)",
              border: "1px solid var(--adm-overprint)",
            }
          : {
              borderRadius: 0,
              fontFamily: "var(--adm-font)",
              background: "transparent",
              color: "var(--adm-ink)",
              border: rule,
            },
      }),
    }),
    Popover: Popover.extend({
      defaultProps: { radius: 0, shadow: "none" },
      styles: {
        dropdown: {
          background: "var(--adm-paper-raised)",
          color: "var(--adm-ink)",
          border: rule,
          boxShadow: "none",
        },
      },
    }),
    Tooltip: Tooltip.extend({
      defaultProps: { radius: 0 },
      styles: {
        tooltip: {
          fontFamily: "var(--adm-font)",
          background: "var(--adm-ink)",
          color: "var(--adm-paper)",
        },
      },
    }),
    Kbd: Kbd.extend({
      styles: { root: { fontFamily: "var(--adm-font)", border: rule } },
    }),
    Table: Table.extend({
      defaultProps: { stickyHeader: true, verticalSpacing: 0, horizontalSpacing: 6 },
      // Inline borders: the app's `@layer base` border reset outranks Mantine's class rule.
      styles: {
        th: {
          height: "var(--adm-cell)",
          borderBottom: rule,
          color: "var(--adm-ink-muted)",
          fontWeight: 600,
        },
        td: { height: "var(--adm-cell)", borderBottom: rule },
      },
    }),
    Alert: Alert.extend({
      defaultProps: { radius: 0 },
      // The app theme's default `color: "halt"` always merges in, so `color` alone can't mean "caller chose".
      vars: (_theme, props) => {
        const tone =
          (props as { "data-tone"?: StatusTone })["data-tone"] ??
          (props.color === "red" || props.color === "halt" ? "mispunch" : undefined);
        if (!tone && props.color) return { root: {} };
        const color = tone ? (toneColor[tone] ?? toneColor.neutral) : "var(--adm-ink)";
        return {
          root: {
            "--alert-bg": "var(--adm-paper-raised)",
            "--alert-color": color,
            "--alert-bd": tone ? `1px solid ${color}` : rule,
          },
        };
      },
      styles: {
        root: {
          fontFamily: "var(--adm-font)",
          backgroundColor: "var(--alert-bg)",
          border: "var(--alert-bd)",
          backdropFilter: "none",
          WebkitBackdropFilter: "none",
          boxShadow: "none",
        },
        title: { color: "var(--alert-color)", fontWeight: 700 },
        message: { color: "var(--adm-ink)" },
      },
    }),
    Drawer: Drawer.extend({
      defaultProps: {
        radius: 0,
        overlayProps: { backgroundOpacity: 0.4, blur: 0 },
        closeButtonProps: { "aria-label": "Close" },
      },
      styles: {
        content: {
          backgroundColor: "var(--adm-paper)",
          color: "var(--adm-ink)",
          border: rule,
          backdropFilter: "none",
          WebkitBackdropFilter: "none",
          boxShadow: "none",
        },
        header: { backgroundColor: "var(--adm-paper)", borderBottom: rule },
        title: { fontWeight: 700, letterSpacing: "normal" },
      },
    }),
    AppShell: AppShell.extend({
      styles: {
        navbar: { borderInlineEnd: rule },
        aside: { borderInlineStart: rule },
      },
    }),
    Divider: Divider.extend({
      // Inline styles: the app's `@layer base` border reset outranks Mantine's class rule.
      styles: (_theme, props) => ({
        root: props.orientation === "vertical" ? { borderInlineStart: rule } : { borderTop: rule },
      }),
    }),
    Accordion: Accordion.extend({
      defaultProps: { radius: 0 },
      // Inline borders: the app's `@layer base` border reset outranks Mantine's class rule.
      styles: {
        item: { borderBottom: rule },
        control: { fontWeight: 600 },
        chevron: { color: "var(--adm-ink)" },
      },
    }),
    Paper: Paper.extend({
      defaultProps: { radius: 0, shadow: "none", withBorder: true },
      styles: {
        root: {
          backgroundColor: "var(--adm-paper-raised)",
          borderColor: "var(--adm-rule)",
          boxShadow: "none",
        },
      },
    }),
  },
};
