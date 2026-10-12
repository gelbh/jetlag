import { Button, Stack, Table, Text } from "@mantine/core";
import type { CSSProperties } from "react";
import { resolveAdminSessionAreaLabel } from "../../../domain/admin/adminSessionAreaLabel";
import { adminSessionPhaseLabel } from "../../../domain/admin/sessionPhase";
import type { AdminSessionSummary } from "../../../services/admin/adminSessions";
import { PunchTime } from "../shared/PunchTime";
import { SessionCode } from "../shared/SessionCode";
import { StatusMark } from "../shared/StatusMark";

interface AdminSessionRowProps {
  summary: AdminSessionSummary;
  observingCode: string | null;
  monitored?: boolean;
  cursor?: boolean;
  flashing?: boolean;
  mispunchCount?: number;
  onMonitor: (summary: AdminSessionSummary) => void;
}

// Set on cells, not the row: the row's own `var(--adm-ink)` background must resolve unswapped.
const reversedInk = {
  "--adm-ink": "var(--adm-paper)",
  "--mantine-color-text": "var(--adm-paper)",
  "--mantine-color-dimmed": "var(--adm-paper)",
} as CSSProperties;

const cursorOutline: CSSProperties = {
  outline: "2px solid var(--adm-overprint)",
  outlineOffset: "-2px",
};

export function AdminSessionRow({
  summary,
  observingCode,
  monitored = false,
  cursor = false,
  flashing = false,
  mispunchCount = 0,
  onMonitor,
}: AdminSessionRowProps) {
  const areaLabel = resolveAdminSessionAreaLabel(summary);
  const cellStyle = monitored ? reversedInk : undefined;

  return (
    <Table.Tr
      aria-current={monitored ? "true" : undefined}
      aria-selected={cursor ? "true" : undefined}
      bg={monitored ? "var(--adm-ink)" : undefined}
      c={monitored ? "var(--adm-paper)" : undefined}
      style={cursor ? cursorOutline : undefined}
    >
      <Table.Td colSpan={3} style={cellStyle}>
        <Button
          type="button"
          variant="subtle"
          fullWidth
          justify="flex-start"
          h="var(--adm-cell)"
          px={0}
          aria-label={`Monitor ${summary.code}`}
          loading={observingCode === summary.code}
          disabled={observingCode !== null}
          onClick={() => onMonitor(summary)}
        >
          <Stack component="span" gap={0} align="flex-start" maw="100%">
            <SessionCode code={summary.code} />
            {areaLabel ? (
              <Text component="span" size="xs" c="dimmed" fw={400} maw="100%" truncate>
                {areaLabel}
              </Text>
            ) : null}
          </Stack>
        </Button>
      </Table.Td>
      <Table.Td colSpan={2} style={cellStyle}>
        <StatusMark
          tone={summary.isLive ? "live" : "neutral"}
          label={adminSessionPhaseLabel(summary.phase)}
        />
      </Table.Td>
      <Table.Td style={cellStyle}>{summary.memberCount}</Table.Td>
      <Table.Td style={cellStyle}>
        <PunchTime at={summary.lastActivityAt} flashing={flashing} />
      </Table.Td>
      <Table.Td style={cellStyle}>
        {mispunchCount > 0 ? <StatusMark tone="mispunch" label={String(mispunchCount)} /> : null}
      </Table.Td>
    </Table.Tr>
  );
}
