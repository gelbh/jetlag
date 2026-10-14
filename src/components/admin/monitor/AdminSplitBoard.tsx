import { AccordionChevron, Collapse, Group, Paper, Text, UnstyledButton } from "@mantine/core";
import { type ReactNode, useId, useState } from "react";

interface AdminSplitBoardProps {
  count: number;
  defaultOpen: boolean;
  /** Narrow course: sit above the code plate at the bottom instead of the top corner. */
  placement?: "top" | "bottom";
  children: ReactNode;
}

export function AdminSplitBoard({
  count,
  defaultOpen,
  placement = "top",
  children,
}: AdminSplitBoardProps) {
  const [open, setOpen] = useState(defaultOpen);
  const bodyId = useId();

  return (
    <Paper
      component="section"
      aria-label="Player roster"
      pos="absolute"
      left={12}
      top={placement === "top" ? 12 : undefined}
      bottom={placement === "bottom" ? 56 : undefined}
      w="min(18rem, calc(100% - 24px))"
      style={{ zIndex: "var(--z-panel)" }}
    >
      <UnstyledButton
        w="100%"
        h="var(--adm-cell)"
        px="sm"
        aria-expanded={open}
        aria-controls={bodyId}
        onClick={() => setOpen((value) => !value)}
      >
        <Group justify="space-between" wrap="nowrap">
          <Group gap="xs" wrap="nowrap" align="baseline">
            <Text fw={700}>Runners</Text>
            <Text fw={700} c="dimmed">
              {count}
            </Text>
          </Group>
          <AccordionChevron
            aria-hidden="true"
            style={{
              transform: open ? "rotate(180deg)" : undefined,
              transition: "transform 200ms",
            }}
          />
        </Group>
      </UnstyledButton>
      <Collapse expanded={open} id={bodyId}>
        {children}
      </Collapse>
    </Paper>
  );
}
