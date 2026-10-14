import {
  ActionIcon,
  Box,
  Divider,
  Group,
  Text,
  Tooltip,
  UnstyledButton,
  VisuallyHidden,
} from "@mantine/core";
import { formatFreshnessAge } from "../../../domain/admin/formatAdminFreshness";
import { APP_VERSION } from "../../../domain/device/changelog";
import { useFreshnessClock } from "../../../hooks/time/useFreshnessClock";
import { AppLink } from "../../navigation/AppLink";
import {
  HudHomeIcon,
  HudLayersIcon,
  HudRefreshIcon,
  HudSettingsIcon,
} from "../../ui/brand/HudIcons";
import { StatCell } from "../shared/StatCell";
import { StatusMark } from "../shared/StatusMark";
import { AdminUtcClock } from "./AdminUtcClock";

interface AdminStatusStripProps {
  liveCount: number;
  runnerCount: number;
  needsYouCount: number;
  inQueueCount: number;
  incidentsLoading: boolean;
  refreshing: boolean;
  onRefresh: () => void;
  onOpenSettings: () => void;
  onOpenNeedsYou?: () => void;
  dataFetchedAt: Date | null;
  syncFailed: boolean;
}

function DataAge({ fetchedAt, failed }: { fetchedAt: Date | null; failed: boolean }) {
  const nowMs = useFreshnessClock();
  if (failed) return <StatusMark tone="mispunch" label="Sync failed" />;
  if (!fetchedAt) return null;
  return (
    <StatusMark tone="ok" label={`Synced ${formatFreshnessAge(fetchedAt.toISOString(), nowMs)}`} />
  );
}

export function AdminStatusStrip({
  liveCount,
  runnerCount,
  needsYouCount,
  inQueueCount,
  incidentsLoading,
  refreshing,
  onRefresh,
  onOpenSettings,
  onOpenNeedsYou,
  dataFetchedAt,
  syncFailed,
}: AdminStatusStripProps) {
  const needsYouLabel = `Needs you: ${needsYouCount} open`;
  const needsYouCell = <StatCell label="Needs you" value={needsYouCount} />;
  return (
    <Group h="100%" px="sm" gap="md" wrap="nowrap" justify="space-between">
      <Group gap="md" wrap="nowrap" miw={0} flex={1}>
        <ActionIcon component={AppLink} to="/" variant="default" aria-label="Home">
          <HudHomeIcon width={16} height={16} aria-hidden="true" />
        </ActionIcon>
        <UnstyledButton component={AppLink} to="/admin" aria-label="Jetlag event centre" miw={0}>
          <Group gap="xs" wrap="nowrap" align="baseline" miw={0}>
            <Text fw={800} truncate>
              Jetlag
            </Text>
            <Text size="sm" visibleFrom="sm">
              Event centre
            </Text>
            <Text size="xs" c="dimmed" visibleFrom="sm">{`v${APP_VERSION}`}</Text>
          </Group>
        </UnstyledButton>
        <Divider orientation="vertical" visibleFrom="sm" />
        <Box visibleFrom="sm">
          <StatCell label="Live games" value={liveCount} />
        </Box>
        <Divider orientation="vertical" visibleFrom="sm" />
        <Box visibleFrom="sm">
          <StatCell label="Runners" value={runnerCount} />
        </Box>
        <Divider orientation="vertical" visibleFrom="sm" />
        {onOpenNeedsYou ? (
          <UnstyledButton
            onClick={onOpenNeedsYou}
            aria-label={needsYouLabel}
            aria-haspopup="dialog"
          >
            {needsYouCell}
          </UnstyledButton>
        ) : (
          <UnstyledButton component={AppLink} to="/admin/incidents" aria-label={needsYouLabel}>
            {needsYouCell}
          </UnstyledButton>
        )}
        <Divider orientation="vertical" visibleFrom="sm" />
        <Box visibleFrom="sm">
          <StatCell label="In queue" value={inQueueCount} />
        </Box>
      </Group>
      {/* Mounted after the first snapshot so opening the desk doesn't announce the initial count. */}
      {incidentsLoading ? null : (
        <VisuallyHidden aria-live="polite">{needsYouLabel}</VisuallyHidden>
      )}
      <Group gap="xs" wrap="nowrap" flex="none">
        <Box visibleFrom="sm">
          <DataAge fetchedAt={dataFetchedAt} failed={syncFailed} />
        </Box>
        <Box visibleFrom="sm">
          <AdminUtcClock />
        </Box>
        <Tooltip label="Preload requests">
          <ActionIcon
            component={AppLink}
            to="/admin/preload-requests"
            onClick={onOpenNeedsYou}
            variant="default"
            aria-label="Preload requests"
          >
            <HudLayersIcon width={16} height={16} aria-hidden="true" />
          </ActionIcon>
        </Tooltip>
        <Tooltip label={refreshing ? "Refreshing" : "Refresh"}>
          <ActionIcon
            variant="default"
            loading={refreshing}
            onClick={onRefresh}
            aria-label="Refresh live sessions"
          >
            <HudRefreshIcon width={16} height={16} aria-hidden="true" />
          </ActionIcon>
        </Tooltip>
        <Tooltip label="Settings">
          <ActionIcon
            variant="default"
            onClick={onOpenSettings}
            aria-label="Settings"
            aria-haspopup="dialog"
          >
            <HudSettingsIcon width={16} height={16} aria-hidden="true" />
          </ActionIcon>
        </Tooltip>
      </Group>
    </Group>
  );
}
