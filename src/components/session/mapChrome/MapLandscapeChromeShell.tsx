import type { ReactNode } from "react";
import type { SyncStatus } from "@/domain/device/sync/sync";
import type { PendingQuestionRecord } from "@/domain/session/activity/sessionChat";
import type { SessionRulesInput } from "@/domain/session/rules";
import type { TimerState } from "@/domain/session/timer/timer";
import { MapLandscapeChromeProvider } from "./MapLandscapeChromeContext";
import { MapLandscapeChromeShellSync } from "./MapLandscapeChromeShellSync";

export type MapLandscapeChromeShellProps = {
  children: ReactNode;
  sessionRules: SessionRulesInput;
  timerState: TimerState;
  timerHasStarted: boolean;
  pendingQuestions?: readonly PendingQuestionRecord[];
  syncStatus: SyncStatus;
  queuedWrites: number;
  syncMessage?: string | null;
};

export function MapLandscapeChromeShell({
  children,
  sessionRules,
  timerState,
  timerHasStarted,
  pendingQuestions = [],
  syncStatus,
  queuedWrites,
  syncMessage,
}: MapLandscapeChromeShellProps) {
  return (
    <MapLandscapeChromeProvider
      sessionRules={sessionRules}
      timerState={timerState}
      timerHasStarted={timerHasStarted}
      pendingQuestions={pendingQuestions}
      syncStatus={syncStatus}
      queuedWrites={queuedWrites}
      syncMessage={syncMessage}
    >
      <MapLandscapeChromeShellSync />
      {children}
    </MapLandscapeChromeProvider>
  );
}
