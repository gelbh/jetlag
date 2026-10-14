import { SimpleGrid, Stack, Title } from "@mantine/core";
import { StatCell } from "@/components/admin/shared/StatCell";
import { APP_VERSION } from "@/domain/device/changelog";
import type { SessionRecord } from "@/domain/map/annotations";
import type { TimerState } from "@/domain/session/timer/timer";

function formatTimestamp(value: string | undefined): string {
  if (!value) {
    return "—";
  }

  const date = new Date(value);
  if (Number.isNaN(date.getTime())) {
    return value;
  }

  return date.toLocaleString();
}

interface OverviewPanelProps {
  session: SessionRecord;
  syncStatusLabel: string;
  annotationCount: number;
  seekerCount: number;
  hiderCount: number;
  questionCount: number;
  messageCount: number;
  timerState: TimerState;
}

export function OverviewPanel({
  session,
  syncStatusLabel,
  annotationCount,
  seekerCount,
  hiderCount,
  questionCount,
  messageCount,
  timerState,
}: OverviewPanelProps) {
  const diagnosticRows: Array<{ label: string; value: string }> = [
    { label: "Session ID", value: session.id },
    { label: "Code", value: session.code ?? "—" },
    { label: "Host app version", value: session.hostAppVersion ?? "—" },
    { label: "Game size", value: session.gameSize ?? "—" },
    { label: "Tier", value: session.tier ?? "free" },
    { label: "Created", value: formatTimestamp(session.createdAt) },
    { label: "Sync", value: syncStatusLabel },
    { label: "Companion", value: APP_VERSION },
  ];

  const stats = [
    { label: "Annotations", value: String(annotationCount) },
    { label: "Seekers", value: String(seekerCount) },
    { label: "Hiders", value: String(hiderCount) },
    { label: "Questions", value: String(questionCount) },
    { label: "Messages", value: String(messageCount) },
    {
      label: "Timer",
      value:
        timerState.runningSince !== null
          ? "Running"
          : timerState.accumulatedMs > 0
            ? "Paused"
            : "Idle",
    },
  ];

  return (
    <Stack gap="md">
      <Stack component="section" aria-label="Live stats" gap="xs">
        <Title order={3} size="sm">
          Live stats
        </Title>
        <SimpleGrid cols={2} spacing="sm" verticalSpacing="xs">
          {stats.map((stat) => (
            <StatCell key={stat.label} label={stat.label} value={stat.value} />
          ))}
        </SimpleGrid>
      </Stack>

      <Stack component="section" aria-label="Session diagnostics" gap="xs">
        <Title order={3} size="sm">
          Diagnostics
        </Title>
        <Stack component="dl" gap="xs" m={0}>
          {diagnosticRows.map((row) => (
            <div key={row.label} className="admin-diag-row">
              <dt>{row.label}</dt>
              <dd>{row.value}</dd>
            </div>
          ))}
        </Stack>
      </Stack>
    </Stack>
  );
}
