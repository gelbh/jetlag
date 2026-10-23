import {
  ActionIcon,
  Box,
  Group,
  Text,
  Tooltip,
  UnstyledButton,
  VisuallyHidden,
} from "@mantine/core";
import type { ReactNode } from "react";
import { formatFreshnessAge } from "../../../domain/admin/formatAdminFreshness";
import { useFreshnessClock } from "../../../hooks/time/useFreshnessClock";
import { AppLink } from "../../navigation/AppLink";
import {
  HudHomeIcon,
  HudLayersIcon,
  HudRefreshIcon,
  HudSettingsIcon,
} from "../../ui/brand/HudIcons";
import { AdminUtcClock } from "./AdminUtcClock";

interface AdminStatusStripProps {
  liveCount: number;
  runnerCount: number;
  needsYouCount: number;
  incidentsLoading: boolean;
  refreshing: boolean;
  onRefresh: () => void;
  onOpenSettings: () => void;
  dataFetchedAt: Date | null;
  syncFailed: boolean;
}

const hairline = "0.5px solid color-mix(in oklch, var(--color-rule) 65%, transparent)";

const iconButtonStyles = {
  root: {
    width: 36,
    height: 36,
    borderRadius: 12,
    background: "color-mix(in oklch, var(--color-canvas) 94%, var(--color-ink))",
    border: "none",
    color: "var(--color-ink-secondary)",
  },
} as const;

function BarStat({ label, value, alert }: { label: string; value: number; alert?: boolean }) {
  return (
    <Box
      role="group"
      aria-label={label}
      style={{
        display: "flex",
        flexDirection: "column",
        justifyContent: "center",
        padding: "0 14px",
        borderLeft: hairline,
        height: 32,
      }}
    >
      <Text
        component="span"
        style={{
          fontSize: 12,
          fontWeight: 600,
          letterSpacing: "0.06em",
          textTransform: "uppercase",
          whiteSpace: "nowrap",
          color: "var(--color-ink-muted)",
        }}
      >
        {label}
      </Text>
      <Text
        component="span"
        style={{
          fontSize: 17,
          fontWeight: 700,
          lineHeight: 1.1,
          color: alert ? "var(--color-flag)" : "var(--color-ink)",
        }}
      >
        {value}
      </Text>
    </Box>
  );
}

function Logo() {
  return (
    <svg width="28" height="28" viewBox="0 0 28 28" aria-hidden="true" style={{ flex: "none" }}>
      <circle cx="14" cy="14" r="11" fill="none" stroke="var(--color-flag)" strokeWidth="3" />
      <circle cx="14" cy="14" r="5" fill="none" stroke="var(--color-signal)" strokeWidth="2" />
      <path d="M14 2v24M2 14h24" stroke="var(--color-flag)" strokeWidth="1.5" />
    </svg>
  );
}

function SyncDot({ failed }: { failed: boolean }) {
  const color = failed ? "var(--color-status-error)" : "var(--color-trail)";
  const soft = failed ? "var(--color-status-error-surface)" : "var(--color-trail-soft)";
  return (
    <Box
      component="span"
      aria-hidden="true"
      style={{
        width: 10,
        height: 10,
        borderRadius: "50%",
        background: color,
        boxShadow: `0 0 0 4px ${soft}`,
        flex: "none",
      }}
    />
  );
}

function DataAge({ fetchedAt, failed }: { fetchedAt: Date | null; failed: boolean }) {
  const nowMs = useFreshnessClock();
  if (!failed && !fetchedAt) return null;
  const text = failed
    ? "Sync failed"
    : `Synced ${formatFreshnessAge(fetchedAt?.toISOString() ?? "", nowMs)}`;
  return (
    <Group gap={10} wrap="nowrap" data-tone={failed ? "mispunch" : "ok"}>
      <SyncDot failed={failed} />
      <Text component="span" style={{ fontSize: 14, color: "var(--color-ink-muted)" }}>
        {text}
      </Text>
    </Group>
  );
}

export function AdminStatusStrip({
  liveCount,
  runnerCount,
  needsYouCount,
  incidentsLoading,
  refreshing,
  onRefresh,
  onOpenSettings,
  dataFetchedAt,
  syncFailed,
}: AdminStatusStripProps) {
  const needsYouLabel = `Needs you: ${needsYouCount} open`;
  const needsYouCell = <BarStat label="Needs you" value={needsYouCount} alert />;
  const needsYouControl: ReactNode = (
    <UnstyledButton component={AppLink} to="/admin/incidents" aria-label={needsYouLabel}>
      {needsYouCell}
    </UnstyledButton>
  );
  return (
    <Group
      h={56}
      px={12}
      mx={12}
      mt={12}
      gap={4}
      wrap="nowrap"
      justify="space-between"
      style={{
        flex: "none",
        background: "var(--color-canvas)",
        border: hairline,
        borderRadius: 16,
      }}
    >
      <Group gap={4} wrap="nowrap" miw={0} flex={1}>
        <ActionIcon
          component={AppLink}
          to="/"
          variant="subtle"
          aria-label="Home"
          styles={iconButtonStyles}
        >
          <HudHomeIcon width={18} height={18} aria-hidden="true" />
        </ActionIcon>
        <UnstyledButton
          component={AppLink}
          to="/admin"
          aria-label="Jetlag event centre"
          miw={0}
          pr={14}
          ml={6}
        >
          <Group gap={10} wrap="nowrap">
            <Logo />
            <Box visibleFrom="xs">
              <Text
                component="span"
                style={{ fontSize: 16, fontWeight: 700, color: "var(--color-ink)" }}
              >
                Admin
              </Text>
            </Box>
          </Group>
        </UnstyledButton>
        <Box visibleFrom="sm">
          <BarStat label="Live games" value={liveCount} />
        </Box>
        <Box visibleFrom="sm">
          <BarStat label="Players" value={runnerCount} />
        </Box>
        {needsYouControl}
      </Group>
      {/* Mounted after the first snapshot so opening the desk doesn't announce the initial count. */}
      {incidentsLoading ? null : (
        <VisuallyHidden aria-live="polite">{needsYouLabel}</VisuallyHidden>
      )}
      <Group gap={12} wrap="nowrap" flex="none">
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
            variant="subtle"
            aria-label="Preload requests"
            styles={iconButtonStyles}
          >
            <HudLayersIcon width={18} height={18} aria-hidden="true" />
          </ActionIcon>
        </Tooltip>
        <Tooltip label={refreshing ? "Refreshing" : "Refresh"}>
          <ActionIcon
            variant="subtle"
            loading={refreshing}
            onClick={onRefresh}
            aria-label="Refresh live sessions"
            styles={iconButtonStyles}
          >
            <HudRefreshIcon width={18} height={18} aria-hidden="true" />
          </ActionIcon>
        </Tooltip>
        <Tooltip label="Settings">
          <ActionIcon
            variant="subtle"
            onClick={onOpenSettings}
            aria-label="Settings"
            aria-haspopup="dialog"
            styles={iconButtonStyles}
          >
            <HudSettingsIcon width={18} height={18} aria-hidden="true" />
          </ActionIcon>
        </Tooltip>
      </Group>
    </Group>
  );
}
