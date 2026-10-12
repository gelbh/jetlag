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
import { APP_VERSION } from "../../../domain/device/changelog";
import { AppLink } from "../../navigation/AppLink";
import {
  HudHomeIcon,
  HudLayersIcon,
  HudRefreshIcon,
  HudSettingsIcon,
} from "../../ui/brand/HudIcons";
import { StatCell } from "../shared/StatCell";
import { AdminUtcClock } from "./AdminUtcClock";

interface AdminStatusStripProps {
  liveCount: number;
  runnerCount: number;
  needsYouCount: number;
  refreshing: boolean;
  onRefresh: () => void;
  onOpenSettings: () => void;
}

export function AdminStatusStrip({
  liveCount,
  runnerCount,
  needsYouCount,
  refreshing,
  onRefresh,
  onOpenSettings,
}: AdminStatusStripProps) {
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
        <UnstyledButton
          component={AppLink}
          to="/admin/incidents"
          aria-label={`Needs you: ${needsYouCount} open`}
        >
          <StatCell label="Needs you" value={needsYouCount} />
        </UnstyledButton>
      </Group>
      <VisuallyHidden aria-live="polite">{`${needsYouCount} open incidents`}</VisuallyHidden>
      <Group gap="xs" wrap="nowrap" flex="none">
        <Box visibleFrom="sm">
          <AdminUtcClock />
        </Box>
        <Tooltip label="Preload requests">
          <ActionIcon
            component={AppLink}
            to="/admin/preload-requests"
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
