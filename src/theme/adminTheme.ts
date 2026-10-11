import {
  Accordion,
  ActionIcon,
  Alert,
  Badge,
  Button,
  Drawer,
  Kbd,
  type MantineThemeOverride,
  Paper,
  Table,
  Tabs,
  TextInput,
} from "@mantine/core";
import type { StatusTone } from "@/components/admin/shared/StatusMark";

const rule = "1px solid var(--adm-rule)";

const toneColor: Record<StatusTone, string> = {
  live: "var(--adm-live)",
  ok: "var(--adm-ok)",
  info: "var(--adm-info)",
  mispunch: "var(--adm-mispunch)",
  neutral: "var(--adm-ink-muted)",
};

/** Overprint replaces the app's primary colour on controls without an explicit `color`. */
function controlColors(variant: string | undefined) {
  switch (variant ?? "filled") {
    case "filled":
      return {
        bg: "var(--adm-overprint)",
        hover: "var(--adm-overprint)",
        color: "var(--adm-overprint-ink)",
        hoverColor: "var(--adm-overprint-ink)",
        bd: "1px solid transparent",
      };
    case "light":
      return {
        bg: "var(--adm-overprint-soft)",
        hover: "var(--adm-overprint-soft)",
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

/** Orienteering control sheet: paper, ink, contour rules, overprint accent. Flat. */
export const adminTheme: MantineThemeOverride = {
  fontFamily: "var(--adm-font)",
  headings: { fontFamily: "var(--adm-font)", fontWeight: "700" },
  defaultRadius: 0,
  components: {
    Table: Table.extend({
      defaultProps: {
        stickyHeader: true,
        highlightOnHover: true,
        verticalSpacing: 6,
        horizontalSpacing: "xs",
      },
      styles: {
        table: { borderColor: "var(--adm-rule)", fontVariantNumeric: "tabular-nums" },
        th: { color: "var(--adm-ink-muted)", fontWeight: 600, background: "var(--adm-paper)" },
        td: { borderColor: "var(--adm-rule)" },
      },
    }),
    Tabs: Tabs.extend({
      styles: {
        list: { borderColor: "var(--adm-rule)" },
        tab: { color: "var(--adm-ink)", fontWeight: 600 },
      },
      vars: (_theme, props) => ({
        root: props.color ? {} : { "--tabs-color": "var(--adm-overprint)" },
      }),
    }),
    Accordion: Accordion.extend({
      styles: {
        item: { borderColor: "var(--adm-rule)", background: "transparent" },
        control: { color: "var(--adm-ink)" },
      },
    }),
    Badge: Badge.extend({
      defaultProps: { variant: "light" },
      styles: { root: { fontWeight: 700, letterSpacing: "0.04em" } },
      vars: (_theme, props) => {
        const tone = (props as { "data-tone"?: StatusTone })["data-tone"];
        if (!tone && props.color) return { root: {} };
        const color = toneColor[tone ?? "neutral"];
        return {
          root: {
            "--badge-bg":
              tone === "live" ? color : `color-mix(in oklch, ${color} 14%, transparent)`,
            "--badge-color": "var(--adm-ink)",
            "--badge-bd": `1px solid ${color}`,
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
      styles: {
        input: {
          fontFamily: "var(--adm-font)",
          background: "var(--adm-paper-raised)",
          color: "var(--adm-ink)",
          border: rule,
          letterSpacing: "normal",
        },
      },
    }),
    Alert: Alert.extend({
      defaultProps: { radius: 0 },
      styles: {
        root: {
          fontFamily: "var(--adm-font)",
          backgroundColor: "var(--adm-paper-raised)",
          border: rule,
          backdropFilter: "none",
          WebkitBackdropFilter: "none",
          boxShadow: "none",
        },
        title: { color: "var(--adm-ink)", fontWeight: 700 },
        message: { color: "var(--adm-ink)" },
      },
    }),
    Drawer: Drawer.extend({
      defaultProps: { radius: 0, overlayProps: { backgroundOpacity: 0.4, blur: 0 } },
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
    Kbd: Kbd.extend({
      styles: {
        root: {
          fontFamily: "var(--adm-font)",
          background: "var(--adm-paper-raised)",
          color: "var(--adm-ink)",
          border: rule,
          boxShadow: "none",
        },
      },
    }),
  },
};
