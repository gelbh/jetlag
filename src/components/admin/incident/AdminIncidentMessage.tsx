import { Box } from "@mantine/core";
import { RAISED_BG } from "../shared/adminSurface";

export function formatIncidentClock(iso: string): string {
  const date = new Date(iso);
  if (Number.isNaN(date.getTime())) {
    return iso || "-";
  }
  return date.toLocaleTimeString([], {
    hour: "2-digit",
    minute: "2-digit",
    second: "2-digit",
    hour12: false,
  });
}

export function AdminIncidentMessage({
  tone,
  meta,
  text,
  mono = false,
}: {
  tone: "player" | "admin" | "system";
  meta: string;
  text: string;
  mono?: boolean;
}) {
  return (
    <Box
      data-sender={tone}
      style={{
        display: "grid",
        gap: 3,
        maxWidth: 520,
        justifySelf: tone === "admin" ? "end" : undefined,
        userSelect: "text",
      }}
    >
      <Box component="span" style={{ fontSize: 12, color: "var(--color-ink-muted)" }}>
        {meta}
      </Box>
      <Box
        style={{
          borderRadius: 12,
          padding: "9px 12px",
          whiteSpace: "pre-wrap",
          overflowWrap: "anywhere",
          fontSize: mono ? 12 : 14,
          fontFamily: mono ? "ui-monospace, SFMono-Regular, Menlo, monospace" : undefined,
          maxHeight: mono ? "12rem" : undefined,
          overflow: mono ? "auto" : undefined,
          color: tone === "system" ? "var(--color-ink-muted)" : "var(--color-ink)",
          background:
            tone === "admin"
              ? "var(--color-flag-soft)"
              : tone === "system"
                ? "transparent"
                : RAISED_BG,
          border:
            tone === "system"
              ? "0.5px dashed color-mix(in oklch, var(--color-rule) 65%, transparent)"
              : undefined,
        }}
      >
        {text}
      </Box>
    </Box>
  );
}
