import type { SyncStatus } from "@/domain/device/sync/sync";
import type { PendingQuestionRecord } from "@/domain/session/activity/sessionChat";
import type { SessionRulesInput } from "@/domain/session/rules";
import type { TimerState } from "@/domain/session/timer/timer";
import { CaretDown, CaretUp } from "@phosphor-icons/react";
import { surveySyncShortLabel } from "@/domain/device/surveyStatusCopy";
import { JlIcon } from "../../ui/brand/JlIcon";
import { SyncStatusBeacon } from "../syncUi/SyncStatusDot";
import { SYNC_TONE_CLASSES, syncRailDisplay } from "../status/syncRailDisplay";
import { mapLandscapeChipTimerLabel } from "./mapLandscapeChipTimerLabel";

export type MapLandscapeChromeChipProps = {
  collapsed: boolean;
  onToggle: () => void;
  sessionRules: SessionRulesInput;
  timerState: TimerState;
  timerHasStarted: boolean;
  pendingQuestions?: readonly PendingQuestionRecord[];
  syncStatus: SyncStatus;
  queuedWrites: number;
  syncMessage?: string | null;
};

export function MapLandscapeChromeChip({
  collapsed,
  onToggle,
  sessionRules,
  timerState,
  timerHasStarted,
  pendingQuestions = [],
  syncStatus,
  queuedWrites,
  syncMessage,
}: MapLandscapeChromeChipProps) {
  const timer = mapLandscapeChipTimerLabel({
    sessionRules,
    timerState,
    timerHasStarted,
    pendingQuestions,
  });
  const syncDisplay = syncRailDisplay(syncStatus, queuedWrites, syncMessage);
  const syncLabel = surveySyncShortLabel(syncStatus, queuedWrites);
  const syncTone =
    syncDisplay.inline?.tone ?? syncDisplay.banner?.tone;

  return (
    <button
      type="button"
      className="jl-landscape-chrome-chip pointer-events-auto fixed inset-x-3 bottom-[max(0.5rem,env(safe-area-inset-bottom))] z-[calc(var(--z-dock)+2)] mx-auto flex min-h-11 w-fit max-w-[calc(100%-1.5rem)] items-center justify-center gap-2.5 px-3 py-1.5 font-display motion-safe:transition-[opacity,transform] motion-safe:duration-200 motion-reduce:transition-none"
      onClick={onToggle}
      aria-expanded={!collapsed}
      aria-controls="map-chrome-hud-controls"
      aria-label={
        collapsed
          ? syncLabel
            ? `Show map controls. Timer ${timer.value}. ${syncLabel}`
            : `Show map controls. Timer ${timer.value}`
          : "Hide map controls"
      }
    >
      <span className="inline-flex min-w-0 items-baseline gap-1.5 font-mono text-sm font-bold tabular-nums">
        <span className="jl-landscape-chrome-chip__phase font-display font-bold tracking-wider">
          {timer.phase}
        </span>
        <span className="tracking-wide">{timer.value}</span>
      </span>
      {syncLabel ? (
        <span
          className={`inline-flex max-w-32 min-w-0 items-center gap-1.5 text-xs leading-tight font-semibold${
            syncTone ? ` ${SYNC_TONE_CLASSES[syncTone].text}` : ""
          }`}
        >
          <SyncStatusBeacon status={syncStatus} size="sm" />
          <span className="truncate">{syncLabel}</span>
        </span>
      ) : null}
      <JlIcon
        icon={collapsed ? CaretUp : CaretDown}
        size={14}
        weight="bold"
        className="shrink-0 text-[var(--color-flag)]"
      />
    </button>
  );
}
