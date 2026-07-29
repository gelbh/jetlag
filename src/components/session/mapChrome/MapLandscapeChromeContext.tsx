/* eslint-disable react-refresh/only-export-components -- context module pairs provider with hooks */
import {
  createContext,
  useContext,
  type ReactNode,
} from "react";
import type { SyncStatus } from "../../../domain/device/sync/sync";
import type { PendingQuestionRecord } from "../../../domain/session/activity/sessionChat";
import type { SessionRulesInput } from "../../../domain/session/rules";
import type { TimerState } from "../../../domain/session/timer/timer";
import type { MapChromeControlInset } from "../../map/helpers/mapChromeControlInset";
import {
  useMapLandscapeChromeReveal,
  type MapLandscapeChromeMode,
} from "../../../hooks/chrome/useMapLandscapeChromeReveal";
import { MapLandscapeChromeChip } from "./MapLandscapeChromeChip";

type MapLandscapeChromeContextValue = {
  mode: MapLandscapeChromeMode;
  collapsed: boolean;
  active: boolean;
  toggle: () => void;
  mapControlInset: MapChromeControlInset;
  chip: ReactNode | null;
};

const MapLandscapeChromeContext =
  createContext<MapLandscapeChromeContextValue | null>(null);

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
  const { mode, collapsed, active, toggle } = useMapLandscapeChromeReveal();

  const mapControlInset: MapChromeControlInset = active && collapsed
    ? "chrome-hidden"
    : "dock";

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
        mapControlInset,
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
      mapControlInset: "dock",
      chip: null,
    };
  }

  return context;
}
