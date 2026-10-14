import { Badge, Group, ScrollArea, Stack, Title } from "@mantine/core";
import { type ReactNode, useId } from "react";

export function AdminRegion({
  title,
  count,
  actions,
  loading,
  empty,
  error,
  scroll = true,
  children,
  "data-testid": testId,
}: {
  title: string;
  count?: number;
  actions?: ReactNode;
  loading?: ReactNode;
  empty?: ReactNode;
  error?: ReactNode;
  scroll?: boolean;
  children?: ReactNode;
  "data-testid"?: string;
}) {
  const titleId = useId();
  const body = error ?? loading ?? empty;

  return (
    <Stack
      component="section"
      aria-labelledby={titleId}
      gap="sm"
      flex={1}
      mih={0}
      data-testid={testId}
    >
      <Group justify="space-between" wrap="nowrap">
        <Group gap="xs" wrap="nowrap">
          <Title order={2} id={titleId}>
            {title}
          </Title>
          {count != null && <Badge>{count}</Badge>}
        </Group>
        {actions}
      </Group>
      {body ??
        (scroll ? (
          <ScrollArea flex={1} mih={0}>
            {children}
          </ScrollArea>
        ) : (
          <Stack gap={0} flex={1} mih={0}>
            {children}
          </Stack>
        ))}
    </Stack>
  );
}
