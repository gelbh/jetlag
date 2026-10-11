import {
  ActionIcon,
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
    <Group h="100%" px="sm" gap="md" wrap="nowrap">
      <ActionIcon component={AppLink} to="/" variant="default" aria-label="Home">
        <HudHomeIcon width={16} height={16} aria-hidden="true" />
      </ActionIcon>
      <UnstyledButton component={AppLink} to="/admin">
        <Group gap="xs" wrap="nowrap" align="baseline">
          <Text fw={800}>Jetlag</Text>
          <Text size="sm">Event centre</Text>
          <Text size="xs" c="dimmed">{`v${APP_VERSION}`}</Text>
        </Group>
      </UnstyledButton>
      <Divider orientation="vertical" />
      <StatCell label="Live games" value={liveCount} />
      <Divider orientation="vertical" />
      <StatCell label="Runners" value={runnerCount} />
      <Divider orientation="vertical" />
      <UnstyledButton component={AppLink} to="/admin/incidents">
        <StatCell label="Needs you" value={needsYouCount} />
      </UnstyledButton>
      <VisuallyHidden aria-live="polite">{`${needsYouCount} open incidents`}</VisuallyHidden>
      <Group gap="xs" wrap="nowrap" ml="auto">
        <AdminUtcClock />
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
