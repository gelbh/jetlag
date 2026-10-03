import { createContext, type ReactNode, useContext } from "react";
import type { SyncStatus } from "@/domain/device/sync/sync";
import type { PendingQuestionRecord } from "@/domain/session/activity/sessionChat";
import type { SessionRulesInput } from "@/domain/session/rules";
import type { TimerState } from "@/domain/session/timer/timer";
import {
  type MapLandscapeChromeMode,
  useMapLandscapeChromeReveal,
} from "@/hooks/chrome/useMapLandscapeChromeReveal";
import { MapLandscapeChromeChip } from "./MapLandscapeChromeChip";

type MapLandscapeChromeContextValue = {
  mode: MapLandscapeChromeMode;
  collapsed: boolean;
  active: boolean;
  toggle: () => void;
  chip: ReactNode | null;
};

const MapLandscapeChromeContext = createContext<MapLandscapeChromeContextValue | null>(null);

export type MapLandscapeChromeProviderProps = {
  children: ReactNode;
  sessionRules: SessionRulesInput;
  timerState: TimerState;
  timerHasStarted: boolean;
  pendingQuestions?: readonly PendingQuestionRecord[];
  syncStatus: SyncStatus;
  queuedWrites: number;
  syncMessage?: string | null;
};

export function MapLandscapeChromeProvider({
  children,
  sessionRules,
  timerState,
  timerHasStarted,
  pendingQuestions = [],
  syncStatus,
  queuedWrites,
  syncMessage,
}: MapLandscapeChromeProviderProps) {
  "use memo";
  const { mode, collapsed, active, toggle } = useMapLandscapeChromeReveal();

  const chip = active ? (
    <MapLandscapeChromeChip
      collapsed={collapsed}
      onToggle={toggle}
      sessionRules={sessionRules}
      timerState={timerState}
      timerHasStarted={timerHasStarted}
      pendingQuestions={pendingQuestions}
      syncStatus={syncStatus}
      queuedWrites={queuedWrites}
      syncMessage={syncMessage}
    />
  ) : null;

  return (
    <MapLandscapeChromeContext.Provider
      value={{
        mode,
        collapsed,
        active,
        toggle,
        chip,
      }}
    >
      {children}
    </MapLandscapeChromeContext.Provider>
  );
}

export function useMapLandscapeChrome(): MapLandscapeChromeContextValue {
  const context = useContext(MapLandscapeChromeContext);
  if (!context) {
    return {
      mode: "portrait",
      collapsed: false,
      active: false,
      toggle: () => undefined,
      chip: null,
    };
  }

  return context;
}
