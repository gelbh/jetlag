import { Stack, Text } from "@mantine/core";
import type { ReactNode } from "react";

export function StatCell({ label, value }: { label: string; value: ReactNode }) {
  return (
    <Stack gap={0} aria-label={label}>
      <Text size="xs" c="dimmed">
        {label}
      </Text>
      <Text fw={700}>{value}</Text>
    </Stack>
  );
}
