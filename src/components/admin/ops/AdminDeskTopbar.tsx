import { Anchor, Button, Group, Stack, Text } from "@mantine/core";
import type { ReactNode } from "react";
import { APP_VERSION } from "../../../domain/device/changelog";
import { AppLink } from "../../navigation/AppLink";
import { HudHomeIcon } from "../../ui/brand/HudIcons";

function formatUtcClock(now: Date): string {
  return now.toISOString().slice(11, 19) + " UTC";
}

function TopbarStat({ label, children }: { label: string; children: ReactNode }) {
  return (
    <Stack gap={1}>
      <Text
        span
        ff="var(--font-display)"
        fz="0.5625rem"
        fw={600}
        lts="0.12em"
        tt="uppercase"
        c="var(--color-ink-dim)"
      >
        {label}
      </Text>
      <Text
        span
        ff="var(--font-mono)"
        fz="0.8125rem"
        fw={700}
        c="var(--color-ink)"
        className="tabular-nums"
      >
        {children}
      </Text>
    </Stack>
  );
}

interface AdminDeskTopbarProps {
  openIncidents: number;
  inQueue: number;
  now: Date;
  onOpenSettings: () => void;
  onRefreshSessions?: () => void;
  refreshing?: boolean;
}

export function AdminDeskTopbar({
  openIncidents,
  inQueue,
  now,
  onOpenSettings,
  onRefreshSessions,
  refreshing = false,
}: AdminDeskTopbarProps) {
  return (
    <div className="jl-ops-topbar" data-testid="admin-ops-topbar">
      <div className="jl-ops-brand">
        <AppLink to="/" className="jl-ops-home" aria-label="Home">
          <HudHomeIcon className="size-4" aria-hidden="true" />
        </AppLink>
        <Text component="span" className="jl-ops-brand-mark">
          Jetlag
        </Text>
        <Anchor
          component={AppLink}
          to="/admin"
          underline="hover"
          c="var(--color-ink-muted)"
          className="jl-ops-brand-title"
        >
          {`Admin ops v${APP_VERSION}`}
        </Anchor>
      </div>
      <Group className="jl-ops-topbar-actions" gap="xs" wrap="wrap">
        <Group className="jl-ops-top-stats" gap="lg" wrap="wrap">
          <TopbarStat label="Open incidents">
            <Anchor
              component={AppLink}
              to="/admin/incidents"
              c="inherit"
              inherit
              aria-label={`${openIncidents} open incidents`}
            >
              {openIncidents}
            </Anchor>
          </TopbarStat>
          <TopbarStat label="In queue">{inQueue}</TopbarStat>
          <TopbarStat label="Time">{formatUtcClock(now)}</TopbarStat>
        </Group>
        <Button
          component={AppLink}
          to="/admin/preload-requests"
          variant="default"
          size="compact-sm"
          className="jl-ops-topbar-chip"
        >
          Preload requests
        </Button>
        {onRefreshSessions ? (
          <Button
            type="button"
            variant="default"
            size="compact-sm"
            className="jl-ops-topbar-chip"
            onClick={onRefreshSessions}
            aria-label="Refresh live sessions"
          >
            {refreshing ? "Refreshing…" : "Refresh"}
          </Button>
        ) : null}
        <Button
          type="button"
          variant="default"
          size="compact-sm"
          className="jl-ops-topbar-chip"
          aria-haspopup="dialog"
          onClick={onOpenSettings}
        >
          Settings
        </Button>
      </Group>
    </div>
  );
}
