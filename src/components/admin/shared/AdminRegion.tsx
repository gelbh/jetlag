import { Box, Group, ScrollArea, Stack, VisuallyHidden } from "@mantine/core";
import { type ReactNode, useId } from "react";

export function AdminRegion({
  title,
  count,
  actions,
  loading,
  empty,
  error,
  scroll = true,
  headerless = false,
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
  /** No 48px header row (the toolbar leads); the title stays as the accessible name. */
  headerless?: boolean;
  children?: ReactNode;
  "data-testid"?: string;
}) {
  const titleId = useId();
  const body = error ?? loading ?? empty;

  return (
    <Stack
      component="section"
      aria-labelledby={titleId}
      gap={0}
      flex={1}
      mih={0}
      miw={0}
      data-testid={testId}
      style={{
        background: "var(--color-canvas)",
        border: "0.5px solid color-mix(in oklch, var(--color-rule) 65%, transparent)",
        borderRadius: 16,
        overflow: "hidden",
      }}
    >
      {headerless ? (
        <VisuallyHidden component="h2" id={titleId}>
          {title}
        </VisuallyHidden>
      ) : (
        <Group
          h={48}
          px={16}
          gap={10}
          wrap="nowrap"
          justify="space-between"
          style={{ flex: "none" }}
        >
          <Group gap={10} wrap="nowrap">
            <Box
              component="h2"
              id={titleId}
              m={0}
              style={{
                fontSize: 12,
                fontWeight: 600,
                letterSpacing: "0.06em",
                textTransform: "uppercase",
                color: "var(--color-ink-muted)",
                whiteSpace: "nowrap",
              }}
            >
              {title}
            </Box>
            {count != null && (
              <Box component="span" style={{ fontWeight: 700, color: "var(--color-ink)" }}>
                {count}
              </Box>
            )}
          </Group>
          {actions}
        </Group>
      )}
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
