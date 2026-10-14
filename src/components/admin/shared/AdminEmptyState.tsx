import { Stack, Text } from "@mantine/core";
import type { ReactNode } from "react";

export function AdminEmptyState({
  title,
  body,
  action,
}: {
  title: string;
  body: ReactNode;
  action?: ReactNode;
}) {
  return (
    <Stack gap="xs">
      <Text fw={600}>{title}</Text>
      <Text c="dimmed">{body}</Text>
      {action}
    </Stack>
  );
}
