import { Button, Group, Text } from "@mantine/core";
import type { DeskPreset } from "../../domain/admin/opsDeskLayout";
import { APP_VERSION } from "../../domain/device/changelog";
import { AppLink } from "../navigation/AppLink";
import { HudHomeIcon } from "../ui/brand/HudIcons";
import { AdminPresetMenu } from "./AdminPresetMenu";

function formatUtcClock(now: Date): string {
  return now.toISOString().slice(11, 19) + " UTC";
}

interface AdminDeskTopbarProps {
  openIncidents: number;
  inQueue: number;
  now: Date;
  activePresetId: string;
  defaultPresetId: string;
  presetOrder: string[];
  userPresets: DeskPreset[];
  onSelectPreset: (presetId: string) => void;
  onSaveCurrent: () => void;
  onDeleteUserPreset: (presetId: string) => void;
  onSetDefault: (presetId: string) => void;
  onReorderPresets: (orderedIds: string[]) => void;
  onRenameUserPreset: (presetId: string) => void;
  onOverwriteUserPreset: () => void;
  onRefreshSessions?: () => void;
  refreshing?: boolean;
}

export function AdminDeskTopbar({
  openIncidents,
  inQueue,
  now,
  activePresetId,
  defaultPresetId,
  presetOrder,
  userPresets,
  onSelectPreset,
  onSaveCurrent,
  onDeleteUserPreset,
  onSetDefault,
  onReorderPresets,
  onRenameUserPreset,
  onOverwriteUserPreset,
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
        <Text component="span" className="jl-ops-brand-title">
          {`Broadcast HUD // Admin ops desk v${APP_VERSION}`}
        </Text>
      </div>
      <AdminPresetMenu
        activePresetId={activePresetId}
        defaultPresetId={defaultPresetId}
        presetOrder={presetOrder}
        userPresets={userPresets}
        onSelectPreset={onSelectPreset}
        onSaveCurrent={onSaveCurrent}
        onDeleteUserPreset={onDeleteUserPreset}
        onSetDefault={onSetDefault}
        onReorderPresets={onReorderPresets}
        onRenameUserPreset={onRenameUserPreset}
        onOverwriteUserPreset={onOverwriteUserPreset}
      />
      <Group className="jl-ops-topbar-actions" gap="xs" wrap="wrap">
        <dl className="jl-ops-top-stats">
          <div className="jl-ops-stat">
            <dt>Open incidents</dt>
            <dd>{openIncidents}</dd>
          </div>
          <div className="jl-ops-stat">
            <dt>In queue</dt>
            <dd>{inQueue}</dd>
          </div>
          <div className="jl-ops-stat">
            <dt>Time</dt>
            <dd>{formatUtcClock(now)}</dd>
          </div>
        </dl>
        <Button
          component={AppLink}
          to="/admin/preload-requests"
          variant="default"
          size="compact-sm"
          className="jl-ops-preset-chip"
        >
          Preload requests
        </Button>
        {onRefreshSessions ? (
          <Button
            type="button"
            variant="default"
            size="compact-sm"
            className="jl-ops-preset-chip"
            onClick={onRefreshSessions}
            aria-label="Refresh live sessions"
          >
            {refreshing ? "Refreshing…" : "Refresh"}
          </Button>
        ) : null}
      </Group>
    </div>
  );
}
