export type StatusTone = "live" | "ok" | "info" | "mispunch" | "neutral";

export const toneColor: Record<StatusTone, string> = {
  live: "var(--adm-live)",
  ok: "var(--adm-ok)",
  info: "var(--adm-info)",
  mispunch: "var(--adm-mispunch)",
  neutral: "var(--adm-ink-muted)",
};
