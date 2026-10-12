import { Badge } from "@mantine/core";
import type { StatusTone } from "@/theme/adminTone";

export function StatusMark({ tone, label }: { tone: StatusTone; label: string }) {
  if (import.meta.env.DEV && !label.trim()) console.error("StatusMark needs a visible label");
  return (
    <Badge variant="light" data-tone={tone}>
      {label}
    </Badge>
  );
}
