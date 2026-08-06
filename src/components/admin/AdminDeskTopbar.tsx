import { APP_VERSION } from "../../domain/device/changelog";
import type { DeskPreset } from "../../domain/admin/opsDeskLayout";
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
    <header className="jl-ops-topbar" data-testid="admin-ops-topbar">
      <div className="jl-ops-brand">
        <AppLink to="/" className="jl-ops-home" aria-label="Home">
          <HudHomeIcon className="size-4" aria-hidden="true" />
        </AppLink>
        <span className="jl-ops-brand-mark">Jetlag</span>
        <span className="jl-ops-brand-title">
          Broadcast HUD // Admin ops desk v{APP_VERSION}
        </span>
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
      <div className="jl-ops-topbar-actions">
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
        <AppLink to="/admin/preload-requests" className="jl-ops-preset-chip">
          Preload requests
        </AppLink>
        {onRefreshSessions ? (
          <button
            type="button"
            className="jl-ops-preset-chip"
            onClick={onRefreshSessions}
            aria-label="Refresh live sessions"
          >
            {refreshing ? "Refreshing…" : "Refresh"}
          </button>
        ) : null}
      </div>
    </header>
  );
}
