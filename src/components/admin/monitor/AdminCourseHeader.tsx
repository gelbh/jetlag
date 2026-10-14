import { ActionIcon, Group, Tooltip } from "@mantine/core";
import { SessionTimerLabel } from "@/components/session/identity/SessionTimerLabel";
import { HudHomeIcon } from "@/components/ui/brand/HudIcons";
import type { SyncStatus } from "@/domain/device/sync/sync";
import type { TimerState } from "@/domain/session/timer/timer";
import type { StatusTone } from "@/theme/adminTone";
import { SessionCode } from "../shared/SessionCode";
import { StatCell } from "../shared/StatCell";
import { StatusMark } from "../shared/StatusMark";

const SYNC_MARK: Record<SyncStatus, { tone: StatusTone; label: string }> = {
  synced: { tone: "ok", label: "Synced" },
  saving: { tone: "info", label: "Saving changes" },
  degraded: { tone: "info", label: "Unstable connection" },
  stale: { tone: "info", label: "Showing last known state" },
  error: { tone: "mispunch", label: "Sync issue" },
  offline: { tone: "neutral", label: "Offline" },
};

interface AdminCourseHeaderProps {
  code: string;
  timerState: TimerState;
  seekerCount: number;
  hiderCount: number;
  questionCount: number;
  syncStatus: SyncStatus;
  onLeave: () => void;
}

export function AdminCourseHeader({
  code,
  timerState,
  seekerCount,
  hiderCount,
  questionCount,
  syncStatus,
  onLeave,
}: AdminCourseHeaderProps) {
  const sync = SYNC_MARK[syncStatus];
  return (
    <Group
      component="section"
      aria-label="Course header"
      px="sm"
      py={6}
      gap="md"
      wrap="nowrap"
      justify="space-between"
      align="flex-start"
    >
      {/* The course column can be narrow beside the rail: cells wrap rather than collide. */}
      <Group gap="sm" wrap="wrap" miw={0} flex={1}>
        <SessionCode code={code} size="md" />
        <StatCell label="Clock" value={<SessionTimerLabel timerState={timerState} />} />
        <StatCell label="Seekers" value={seekerCount} />
        <StatCell label="Hiders" value={hiderCount} />
        <StatCell label="Questions" value={questionCount} />
      </Group>
      <Group gap="xs" wrap="nowrap" flex="none">
        <StatusMark tone={sync.tone} label={sync.label} />
        <Tooltip label="Back to start list">
          <ActionIcon variant="subtle" aria-label="Leave admin monitor" onClick={onLeave}>
            <HudHomeIcon width={16} height={16} aria-hidden="true" />
          </ActionIcon>
        </Tooltip>
      </Group>
    </Group>
  );
}
