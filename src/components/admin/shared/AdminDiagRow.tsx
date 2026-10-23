import { Box, Text } from "@mantine/core";
import type { ReactNode } from "react";

/**
 * One `dt`/`dd` pair for a diagnostics `dl`. Theme-neutral (dimmed + monospace):
 * the monitor panels also render on standalone `/map` under the player theme.
 */
export function AdminDiagRow({ label, children }: { label: string; children: ReactNode }) {
  return (
    <Box
      display="grid"
      // The app shell disables selection; diagnostics are copied into bug reports.
      style={{ gridTemplateColumns: "7rem minmax(0, 1fr)", gap: "0.5rem", userSelect: "text" }}
    >
      <Text component="dt" size="xs" fw={600} tt="uppercase" lts="0.04em" c="dimmed">
        {label}
      </Text>
      <Text component="dd" m={0} size="sm" ff="monospace" style={{ overflowWrap: "anywhere" }}>
        {children}
      </Text>
    </Box>
  );
}
