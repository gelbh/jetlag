import type { CSSProperties } from "react";

export type StatusTone = "live" | "ok" | "info" | "mispunch" | "neutral";

export const toneColor: Record<StatusTone, string> = {
  live: "var(--adm-live)",
  ok: "var(--adm-ok)",
  info: "var(--adm-info)",
  mispunch: "var(--adm-mispunch)",
  neutral: "var(--adm-ink-muted)",
};

/**
 * Reversed plate (selected row): ink ground, paper text. Set on plain cells, not the row,
 * so the row's `var(--adm-ink)` background resolves unswapped; status badges keep their ground.
 */
export const reversedInk = {
  "--adm-ink": "var(--adm-paper)",
  "--mantine-color-text": "var(--adm-paper)",
  "--mantine-color-dimmed": "var(--adm-paper)",
} as CSSProperties;
