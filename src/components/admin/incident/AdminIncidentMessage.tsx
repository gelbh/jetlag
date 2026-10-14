import { Paper, Text } from "@mantine/core";

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

/** One thread message: player lines carry the live rule, system lines sit on the page. */
export function AdminIncidentMessage({
  tone,
  meta,
  text,
}: {
  tone: "player" | "admin" | "system";
  meta: string;
  text: string;
}) {
  return (
    <Paper
      p="xs"
      data-sender={tone}
      bg={tone === "system" ? "var(--adm-paper)" : undefined}
      style={tone === "player" ? { borderColor: "var(--adm-live)" } : undefined}
    >
      <Text size="xs" fw={600} c="dimmed">
        {meta}
      </Text>
      <Text
        size="sm"
        c={tone === "system" ? "dimmed" : undefined}
        style={{ whiteSpace: "pre-wrap" }}
      >
        {text}
      </Text>
    </Paper>
  );
}
