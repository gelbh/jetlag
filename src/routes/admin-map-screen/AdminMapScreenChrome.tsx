import { ActionIcon, Badge, Box, Group, Paper, Text } from "@mantine/core";
import { MapBottomChrome } from "../../components/map/chrome/MapBottomChrome";
import { MapChromeControl } from "../../components/map/chrome/MapChromeControl";
import { SessionTimerLabel } from "../../components/session/identity/SessionTimerLabel";
import { syncBeaconAriaLabel } from "../../components/session/status/syncRailDisplay";
import { SyncStatusBeacon } from "../../components/session/syncUi/SyncStatusDot";
import { HudHomeIcon } from "../../components/ui/brand/HudIcons";
import type { SyncStatus } from "../../domain/device/sync/sync";
import type { SessionRecord } from "../../domain/map/annotations";
import type { PlayerRole } from "../../domain/session/players/playerRole";
import { playerRoleLabel } from "../../domain/session/players/playerRole";
import type { UseMapOverlayStateResult } from "../../hooks/map/useMapOverlayState";
import type { useSessionTimer } from "../../hooks/session/useSessionTimer";
import { MapScreenChromeSlots } from "../map-screen/shared/MapScreenChromeSlots";
import { getMapScreenRoleConfig } from "../map-screen/shared/mapScreenRoleConfig";
import { adminShellCell } from "./adminShellLayout";
import type { ModerationAction } from "./useModerationConfirm";

interface AdminMapScreenChromeProps {
  session: SessionRecord;
  myRole: PlayerRole;
  timer: ReturnType<typeof useSessionTimer>;
  overlay: UseMapOverlayStateResult;
  onLeave: () => void;
  isWide: boolean;
  syncStatus: SyncStatus;
  moderationBusy: boolean;
  onModerationAction: (action: ModerationAction) => void;
  onToggleDiagnostics?: () => void;
  diagnosticsOpen?: boolean;
}

export function AdminMapScreenChrome({
  session,
  myRole,
  timer,
  overlay,
  onLeave,
  isWide,
  syncStatus,
  moderationBusy,
  onModerationAction,
  onToggleDiagnostics,
  diagnosticsOpen = false,
}: AdminMapScreenChromeProps) {
  const roleConfig =
    myRole === "admin" ? getMapScreenRoleConfig("admin") : getMapScreenRoleConfig(myRole);
  const roleLabel = playerRoleLabel(roleConfig.statusPlayerRole);

  if (isWide) {
    return (
      <MapScreenChromeSlots
        layout="fragments"
        header={
          <header data-shell-cell="top" aria-label="Monitor status" style={adminShellCell.top}>
            <Paper radius={0} px="sm" py={4} style={{ pointerEvents: "auto" }}>
              <Group gap="sm" wrap="nowrap">
                <Box miw={0} flex={1}>
                  <Text size="xs" fw={700} lts="0.18em">
                    {session.code}
                  </Text>
                  <Text size="sm" c="dimmed">
                    <SessionTimerLabel timerState={timer.timerState} />
                  </Text>
                </Box>
                <Badge variant="light" color="blue">
                  {roleLabel}
                </Badge>
                <Group gap={6} wrap="nowrap" aria-label={syncBeaconAriaLabel(syncStatus)}>
                  <SyncStatusBeacon status={syncStatus} size="sm" />
                  <Text size="sm" fw={600} c="dimmed">
                    Sync
                  </Text>
                </Group>
                <ActionIcon variant="default" aria-label="Leave admin monitor" onClick={onLeave}>
                  <HudHomeIcon width={16} height={16} aria-hidden="true" />
                </ActionIcon>
              </Group>
            </Paper>
          </header>
        }
      />
    );
  }

  const header = (
    <>
      <div className="pointer-events-none absolute inset-x-0 top-0 z-[var(--z-dock)] px-3 pt-[max(0.75rem,var(--safe-area-top))]">
        <div className="pointer-events-auto jl-status-bar mx-auto flex max-w-xl items-center justify-between gap-2 px-2.5 py-1.5">
          <div className="min-w-0">
            <p className="font-mono text-xs font-bold tracking-[0.18em] text-ink">{session.code}</p>
            <p className="text-[0.8125rem] tabular-nums text-ink-muted">
              <SessionTimerLabel timerState={timer.timerState} />
            </p>
          </div>
          <span className="shrink-0 rounded-md border border-brand-blue/50 bg-brand-blue/10 px-2 py-0.5 text-[0.8125rem] font-semibold uppercase tracking-wide text-brand-blue">
            {roleLabel}
          </span>
          <button
            type="button"
            className="hud-chrome inline-flex min-h-9 min-w-9 items-center justify-center"
            aria-label="Leave admin monitor"
            onClick={onLeave}
          >
            <HudHomeIcon className="size-4" />
          </button>
        </div>
      </div>

      <div className="pointer-events-none absolute inset-x-0 top-[calc(4.75rem+var(--safe-area-top))] z-[var(--z-dock)] px-3">
        <div className="pointer-events-auto mx-auto flex max-w-xl flex-col gap-2">
          <div className="rounded-xl border border-border bg-surface-panel/95 p-2 shadow-hud-float backdrop-blur-sm">
            <div className="flex flex-wrap gap-2">
              <button
                type="button"
                className="btn-secondary min-h-9 flex-1 px-2.5 text-xs"
                disabled={moderationBusy}
                onClick={() => onModerationAction("end")}
              >
                Force end
              </button>
              <button
                type="button"
                className="btn-secondary min-h-9 flex-1 px-2.5 text-xs"
                disabled={moderationBusy}
                onClick={() => onModerationAction("resetBoard")}
              >
                Reset board
              </button>
              <button
                type="button"
                className="btn-secondary min-h-9 flex-1 px-2.5 text-xs text-error"
                disabled={moderationBusy}
                onClick={() => onModerationAction("cleanupCode")}
              >
                Cleanup code
              </button>
              {onToggleDiagnostics ? (
                <button
                  type="button"
                  className={`min-h-9 flex-1 rounded-lg px-2.5 text-xs font-semibold uppercase tracking-wide ${
                    diagnosticsOpen ? "bg-action text-action-ink" : "bg-surface-raised text-ink"
                  }`}
                  onClick={onToggleDiagnostics}
                >
                  Diagnostics
                </button>
              ) : null}
            </div>
          </div>
        </div>
      </div>
    </>
  );

  const toolbar = (
    <MapBottomChrome
      session={
        <div className="jl-tool-dock-group jl-tool-dock-group-secondary flex w-full min-w-0 flex-col justify-start gap-1">
          <MapChromeControl
            variant="slot"
            pressed={overlay.isChatOpen}
            aria-label="Open chat"
            label="Chat"
            onClick={() => (overlay.isChatOpen ? overlay.closeSheet() : overlay.openChat())}
          />
          <MapChromeControl
            variant="slot"
            pressed={overlay.isLogOpen}
            aria-label="Open session log"
            label="Log"
            onClick={() => (overlay.isLogOpen ? overlay.closeSheet() : overlay.openLog())}
          />
        </div>
      }
    />
  );

  return <MapScreenChromeSlots layout="fragments" header={header} toolbar={toolbar} />;
}
