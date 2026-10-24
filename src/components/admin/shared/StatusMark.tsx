import { Box } from "@mantine/core";
import type { StatusTone } from "@/theme/adminTone";

const markColor: Record<StatusTone, string> = {
  live: "var(--color-signal)",
  ok: "var(--color-trail)",
  info: "var(--color-brand-blue)",
  mispunch: "var(--color-status-error)",
  neutral: "var(--color-ink-muted)",
};

/** Dot plus word (comp `.mark`): the colour never carries the status alone. */
export function StatusMark({ tone, label }: { tone: StatusTone; label: string }) {
  if (import.meta.env.DEV && !label.trim()) console.error("StatusMark needs a visible label");
  return (
    <Box
      component="span"
      data-tone={tone}
      style={{
        display: "inline-flex",
        alignItems: "center",
        gap: 6,
        fontSize: 13,
        fontWeight: 600,
        whiteSpace: "nowrap",
        color: markColor[tone],
      }}
    >
      <Box
        component="span"
        aria-hidden="true"
        style={{ width: 8, height: 8, borderRadius: "50%", background: "currentColor" }}
      />
      {label}
    </Box>
  );
}
