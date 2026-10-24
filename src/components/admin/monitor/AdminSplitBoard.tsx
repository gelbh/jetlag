import { AccordionChevron, Box, Collapse, Group, Text, UnstyledButton } from "@mantine/core";
import { type ReactNode, useId, useState } from "react";
import { DESK_HAIRLINE } from "../shared/adminSurface";

interface AdminSplitBoardProps {
  count: number;
  defaultOpen: boolean;
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
    <Box
      component="section"
      aria-label="Player roster"
      style={{
        position: "absolute",
        left: 12,
        bottom: placement === "bottom" ? 56 : 12,
        width: "min(300px, calc(100% - 24px))",
        overflow: "hidden",
        zIndex: "var(--z-panel)",
        background: "color-mix(in oklch, var(--color-canvas) 92%, transparent)",
        backdropFilter: "blur(20px) saturate(1.4)",
        border: DESK_HAIRLINE,
        borderRadius: 16,
        boxShadow: "0 8px 24px 0 oklch(0.1 0.04 265 / 0.45)",
      }}
    >
      <UnstyledButton
        w="100%"
        h={48}
        px={16}
        aria-expanded={open}
        aria-controls={bodyId}
        onClick={() => setOpen((value) => !value)}
      >
        <Group justify="space-between" wrap="nowrap">
          <Group gap={10} wrap="nowrap" align="baseline">
            <Text
              component="span"
              style={{
                fontSize: 12,
                fontWeight: 600,
                letterSpacing: "0.06em",
                textTransform: "uppercase",
                color: "var(--color-ink-muted)",
              }}
            >
              Players
            </Text>
            <Text component="span" fw={700} c="var(--color-ink)">
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
    </Box>
  );
}
