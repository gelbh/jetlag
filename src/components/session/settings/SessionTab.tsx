import { useState } from "react";
import type { NotificationPreferences } from "@/domain/device/chrome/notifications";
import { ShareCode } from "../identity/ShareCode";
import { SettingsToggleRow } from "../settings/SettingsToggleRow";
import { NotificationPreferencesSection } from "./NotificationPreferencesSection";
import { RolePasscodeSettings } from "./RolePasscodeSettings";
import {
  LOCAL_SESSION_ID,
  type SessionRecord,
} from "@/domain/map/annotations";
import { timerNeverStarted } from "@/domain/session/rules/core";
import { useAdminAccessState } from "@/hooks/admin/useAdminAccessState";
import { BoardEconomyOpsToggle } from "../board/BoardEconomyOpsToggle";

export interface MapSettingsSessionTabProps {
  sessionCode: string;
  remoteSession: boolean;
  keepScreenAwake: boolean;
  onKeepScreenAwakeChange: (enabled: boolean) => void;
  lowPowerMode: boolean;
  onLowPowerModeChange: (enabled: boolean) => void;
  notificationPreferences?: NotificationPreferences;
  nativeNotificationsSupported?: boolean;
  onNotificationPreferencesChange?: (
    patch: Partial<NotificationPreferences>,
  ) => void;
  onEnableNotifications?: () => Promise<boolean>;
  onClearMap?: () => void;
  onExport?: () => void;
  isHost: boolean;
  onResetBoard?: () => void;
  onResetSession?: () => void;
  onEndSession?: () => void;
  onLeaveSession?: () => void;
  endGameBlocked?: boolean;
  expansionPackEnabled?: boolean;
  onOpenCurseReference?: () => void;
  onReportProblem?: () => void;
  onReviewMapTools?: () => void;
  session?: SessionRecord | null;
  myUid?: string;
}

export function MapSettingsSessionTab({
  sessionCode,
  remoteSession,
  keepScreenAwake,
  onKeepScreenAwakeChange,
  lowPowerMode,
  onLowPowerModeChange,
  notificationPreferences,
  nativeNotificationsSupported = false,
  onNotificationPreferencesChange,
  onEnableNotifications,
  onClearMap,
  onExport,
  isHost,
  onResetBoard,
  onResetSession,
  onEndSession,
  onLeaveSession,
  endGameBlocked = false,
  expansionPackEnabled = false,
  onOpenCurseReference,
  onReportProblem,
  onReviewMapTools,
  session,
  myUid,
}: MapSettingsSessionTabProps) {
  const [deviceSectionOpen, setDeviceSectionOpen] = useState(false);
  const [resetMenuOpen, setResetMenuOpen] = useState(false);
  const { state: adminAccessState } = useAdminAccessState();
  const showBoardEconomyOps =
    adminAccessState === "admin" &&
    Boolean(session?.id) &&
    session?.id !== LOCAL_SESSION_ID &&
    remoteSession;
  const boardEconomyTimerLocked = session
    ? !timerNeverStarted(session)
    : false;

  return (
    <div className="space-y-4">
      <ShareCode code={sessionCode} remote={remoteSession} />

      {session && myUid ? (
        <RolePasscodeSettings session={session} myUid={myUid} isHost={isHost} />
      ) : null}

      {showBoardEconomyOps && session ? (
        <BoardEconomyOpsToggle
          sessionId={session.id}
          enabled={session.boardEconomyEnabled === true}
          disabled={boardEconomyTimerLocked}
          disabledReason={
            boardEconomyTimerLocked
              ? "Hide timer already started — board economy can only be toggled before the timer runs (including a 0:00 running clock)."
              : null
          }
        />
      ) : null}

      <div className="space-y-2 border-t-2 border-border pt-4">
        <button
          type="button"
          onClick={() => setDeviceSectionOpen((open) => !open)}
          aria-expanded={deviceSectionOpen}
          className="btn-secondary w-full"
        >
          Device & alerts
        </button>
        {deviceSectionOpen ? (
          <div className="space-y-3 border-l-2 border-border pl-3">
            <SettingsToggleRow
              label="Keep screen awake"
              checked={keepScreenAwake}
              onChange={onKeepScreenAwakeChange}
            />
            <SettingsToggleRow
              label="Low power mode"
              description="Reduces GPS polling, live transit, animations, and background downloads. Core session sync and tools stay available."
              checked={lowPowerMode}
              onChange={onLowPowerModeChange}
            />
            {nativeNotificationsSupported &&
            notificationPreferences &&
            onNotificationPreferencesChange ? (
              <NotificationPreferencesSection
                preferences={notificationPreferences}
                onChange={onNotificationPreferencesChange}
                onEnableNotifications={onEnableNotifications}
              />
            ) : null}
          </div>
        ) : null}
      </div>

      {onReviewMapTools ? (
        <button
          type="button"
          onClick={onReviewMapTools}
          className="btn-secondary w-full"
        >
          Map tools guide
        </button>
      ) : null}

      {onReportProblem ? (
        <button
          type="button"
          onClick={onReportProblem}
          className="btn-secondary w-full"
        >
          Report a problem
        </button>
      ) : null}

      {expansionPackEnabled && onOpenCurseReference ? (
        <button
          type="button"
          onClick={onOpenCurseReference}
          className="btn-secondary w-full"
        >
          Expansion curse reference
        </button>
      ) : null}

      {onExport ? (
        <button type="button" onClick={onExport} className="btn-secondary w-full">
          Export map
        </button>
      ) : null}

      <div className="space-y-2 border-t-2 border-border pt-4">
        {endGameBlocked ? (
          <p className="text-sm text-ink-muted">
            Clear map and reset board are unavailable during end game.
          </p>
        ) : null}
        {onClearMap ? (
          <button
            type="button"
            onClick={onClearMap}
            disabled={endGameBlocked}
            className="btn-secondary w-full border-status-error/50 bg-status-error-surface text-status-error disabled:opacity-50"
          >
            Clear map
          </button>
        ) : null}

        {isHost ? (
          <>
            <button
              type="button"
              onClick={() => setResetMenuOpen((open) => !open)}
              aria-expanded={resetMenuOpen}
              className="btn-secondary w-full border-status-warning/50 bg-status-warning-surface text-status-warning"
            >
              Reset…
            </button>
            {resetMenuOpen ? (
              <div className="space-y-2 border-l-2 border-status-warning/40 pl-3">
                <button
                  type="button"
                  onClick={() => {
                    setResetMenuOpen(false);
                    onResetBoard?.();
                  }}
                  disabled={endGameBlocked}
                  className="btn-secondary w-full border-status-warning/50 bg-status-warning-surface text-status-warning disabled:opacity-50"
                >
                  Reset board for everyone
                </button>
                {remoteSession && onResetSession ? (
                  <>
                    <button
                      type="button"
                      onClick={() => {
                        setResetMenuOpen(false);
                        void onResetSession();
                      }}
                      className="btn-secondary w-full border-status-error/50 bg-status-error-surface text-status-error"
                    >
                      Reset session progress
                    </button>
                    <p className="text-xs leading-relaxed text-ink-muted">
                      Reset session keeps the code and roster. It clears timer,
                      map, questions, chat, zones, traps, and end-game state.
                    </p>
                  </>
                ) : null}
              </div>
            ) : null}
            <button
              type="button"
              onClick={onEndSession}
              className="btn-secondary w-full border-status-error/50 bg-status-error-surface text-status-error"
            >
              End session for everyone
            </button>
          </>
        ) : null}

        {onLeaveSession ? (
          <button
            type="button"
            onClick={onLeaveSession}
            className="btn-secondary w-full"
          >
            Leave session
          </button>
        ) : null}
      </div>
    </div>
  );
}
