import { Badge } from "@mantine/core";

export type StatusTone = "live" | "ok" | "info" | "mispunch" | "neutral";

export function StatusMark({ tone, label }: { tone: StatusTone; label: string }) {
  if (import.meta.env.DEV && !label.trim()) console.error("StatusMark needs a visible label");
  return (
    <Badge variant="light" data-tone={tone}>
      {label}
    </Badge>
  );
}
