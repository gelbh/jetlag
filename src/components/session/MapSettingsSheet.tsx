import type { ReactNode } from "react";
import { MobileSheet } from "../ui/MobileSheet";
import { TimerActions } from "../tools/TimerActions";
import { ShareCode } from "./ShareCode";
import { TransitControls } from "../map/TransitControls";
import type { TransitRouteFilter } from "../../domain/transit";
import type { DistanceUnit } from "../../domain/distance";
import type { LayerVisibility } from "../../state/sessionStore";

interface MapSettingsSheetProps {
  open: boolean;
  onClose: () => void;
  pendingWrites: number;
  showCurrentLocation: boolean;
  onShowCurrentLocationChange: (enabled: boolean) => void;
  keepScreenAwake: boolean;
  onKeepScreenAwakeChange: (enabled: boolean) => void;
  layerVisibility: LayerVisibility;
  onLayerVisibilityChange: (
    layer: keyof LayerVisibility,
    visible: boolean,
  ) => void;
  distanceUnit: DistanceUnit;
  onDistanceUnitChange: (unit: DistanceUnit) => void;
  locationError?: string | null;
  timerRunning: boolean;
  timerHasStarted: boolean;
  timerLabel: string;
  onTimerStart: () => void;
  onTimerPause: () => void;
  onTimerReset: () => void;
  transitEnabled: boolean;
  transitLiveEnabled: boolean;
  transitLiveSupported: boolean;
  transitRouteFilter: TransitRouteFilter;
  metroLabel: string | null;
  loadingStatic: boolean;
  loadingLive: boolean;
  stopCount: number;
  routeCount: number;
  vehicleCount: number;
  lastUpdated?: string;
  transitError?: string | null;
  onToggleTransit: () => void;
  onToggleLiveTransit: () => void;
  onTransitRouteFilterChange: (value: TransitRouteFilter) => void;
  onOpenLog: () => void;
  onClearMap: () => void;
  onExport?: () => void;
  isHost?: boolean;
  onResetBoard?: () => void;
  onEndSession?: () => void;
  sessionCode: string;
  remoteSession: boolean;
}

export function MapSettingsSheet({
  open,
  onClose,
  pendingWrites,
  showCurrentLocation,
  onShowCurrentLocationChange,
  keepScreenAwake,
  onKeepScreenAwakeChange,
  layerVisibility,
  onLayerVisibilityChange,
  distanceUnit,
  onDistanceUnitChange,
  locationError,
  timerRunning,
  timerHasStarted,
  timerLabel,
  onTimerStart,
  onTimerPause,
  onTimerReset,
  transitEnabled,
  transitLiveEnabled,
  transitLiveSupported,
  transitRouteFilter,
  metroLabel,
  loadingStatic,
  loadingLive,
  stopCount,
  routeCount,
  vehicleCount,
  lastUpdated,
  transitError,
  onToggleTransit,
  onToggleLiveTransit,
  onTransitRouteFilterChange,
  onOpenLog,
  onClearMap,
  onExport,
  isHost = false,
  onResetBoard,
  onEndSession,
  sessionCode,
  remoteSession,
}: MapSettingsSheetProps) {
  if (!open) {
    return null;
  }

  return (
    <SettingsOverlay onClose={onClose}>
      <MobileSheet maxHeightClassName="max-h-[min(85dvh,760px)]">
        <div className="space-y-5">
          <div className="flex items-center justify-between gap-3">
            <h2 className="text-lg font-semibold">Settings</h2>
            <button
              type="button"
              onClick={onClose}
              className="min-h-12 rounded-xl bg-slate-800 px-4 text-sm font-medium"
            >
              Close
            </button>
          </div>

          {pendingWrites > 0 ? (
            <p className="rounded-xl bg-amber-500/20 px-4 py-3 text-sm text-amber-100">
              {pendingWrites} pending sync
            </p>
          ) : null}

          <section className="space-y-3">
            <p className="text-sm font-medium text-slate-200">Timer</p>
            <p className="font-mono text-3xl tracking-wide text-slate-50">
              {timerLabel}
            </p>
            <TimerActions
              timerRunning={timerRunning}
              timerHasStarted={timerHasStarted}
              onTimerStart={onTimerStart}
              onTimerPause={onTimerPause}
              onTimerReset={onTimerReset}
              onOpenLog={onOpenLog}
            />
          </section>

          <section className="space-y-3">
            <p className="text-sm font-medium text-slate-200">Map</p>
            <label className="flex min-h-12 items-center justify-between gap-3 rounded-xl bg-slate-800 px-4 text-sm text-slate-100">
              <span>Show my location</span>
              <input
                type="checkbox"
                checked={showCurrentLocation}
                onChange={(event) =>
                  onShowCurrentLocationChange(event.target.checked)
                }
                className="h-5 w-5 accent-sky-500"
              />
            </label>
            <label className="flex min-h-12 items-center justify-between gap-3 rounded-xl bg-slate-800 px-4 text-sm text-slate-100">
              <span>Keep screen awake</span>
              <input
                type="checkbox"
                checked={keepScreenAwake}
                onChange={(event) =>
                  onKeepScreenAwakeChange(event.target.checked)
                }
                className="h-5 w-5 accent-sky-500"
              />
            </label>
            <div className="grid grid-cols-2 gap-2">
              <button
                type="button"
                onClick={() => onDistanceUnitChange("metric")}
                className={`min-h-12 rounded-xl px-3 text-sm ${
                  distanceUnit === "metric"
                    ? "bg-sky-500 text-slate-950"
                    : "bg-slate-800 text-slate-100"
                }`}
              >
                Metric (km)
              </button>
              <button
                type="button"
                onClick={() => onDistanceUnitChange("imperial")}
                className={`min-h-12 rounded-xl px-3 text-sm ${
                  distanceUnit === "imperial"
                    ? "bg-sky-500 text-slate-950"
                    : "bg-slate-800 text-slate-100"
                }`}
              >
                Imperial (mi)
              </button>
            </div>
            {locationError ? (
              <p className="text-sm text-rose-300">{locationError}</p>
            ) : null}
            <div className="space-y-2">
              <p className="text-sm text-slate-300">Layer visibility</p>
              {(
                [
                  ["radar", "Radar"],
                  ["thermometer", "Thermometer"],
                  ["measuring", "Measuring"],
                  ["matching", "Matching"],
                  ["zone", "Zone"],
                  ["pin", "Pin"],
                  ["tentacle", "Tentacle"],
                  ["transit", "Transit"],
                ] as const
              ).map(([layer, label]) => (
                <label
                  key={layer}
                  className="flex min-h-12 items-center justify-between gap-3 rounded-xl bg-slate-800 px-4 text-sm text-slate-100"
                >
                  <span>{label}</span>
                  <input
                    type="checkbox"
                    checked={layerVisibility[layer]}
                    onChange={(event) =>
                      onLayerVisibilityChange(layer, event.target.checked)
                    }
                    className="h-5 w-5 accent-sky-500"
                  />
                </label>
              ))}
            </div>
          </section>

          <section className="space-y-2">
            <p className="text-sm font-medium text-slate-200">Transit</p>
            <TransitControls
              enabled={transitEnabled}
              liveEnabled={transitLiveEnabled}
              liveSupported={transitLiveSupported}
              routeFilter={transitRouteFilter}
              metroLabel={metroLabel}
              loadingStatic={loadingStatic}
              loadingLive={loadingLive}
              stopCount={stopCount}
              routeCount={routeCount}
              vehicleCount={vehicleCount}
              lastUpdated={lastUpdated}
              error={transitError}
              onToggleEnabled={onToggleTransit}
              onToggleLive={onToggleLiveTransit}
              onRouteFilterChange={onTransitRouteFilterChange}
            />
          </section>

          <section className="space-y-2">
            <p className="text-sm font-medium text-slate-200">Session</p>
            <ShareCode code={sessionCode} remote={remoteSession} />
            <SessionActions onClearMap={onClearMap} onExport={onExport} />
            {isHost ? (
              <div className="grid gap-2">
                <button
                  type="button"
                  onClick={onResetBoard}
                  className="min-h-12 rounded-xl bg-amber-500/20 px-3 text-sm font-medium text-amber-100"
                >
                  Reset board for everyone
                </button>
                <button
                  type="button"
                  onClick={onEndSession}
                  className="min-h-12 rounded-xl bg-rose-500/20 px-3 text-sm font-medium text-rose-100"
                >
                  End session
                </button>
              </div>
            ) : null}
          </section>
        </div>
      </MobileSheet>
    </SettingsOverlay>
  );
}

function SettingsOverlay({
  onClose,
  children,
}: {
  onClose: () => void;
  children: ReactNode;
}) {
  return (
    <div
      className="pointer-events-auto fixed inset-0 z-[1100] bg-slate-950/70 backdrop-blur-sm"
      onClick={onClose}
      onKeyDown={(event) => {
        if (event.key === "Escape") {
          onClose();
        }
      }}
    >
      <div onClick={(event) => event.stopPropagation()}>{children}</div>
    </div>
  );
}

function SessionActions({
  onClearMap,
  onExport,
}: {
  onClearMap: () => void;
  onExport?: () => void;
}) {
  return (
    <div className="grid gap-2">
      {onExport ? (
        <button
          type="button"
          onClick={onExport}
          className="min-h-12 rounded-xl bg-slate-800 px-3 text-sm font-medium text-slate-100"
        >
          Export map
        </button>
      ) : null}
      <button
        type="button"
        onClick={onClearMap}
        className="min-h-12 rounded-xl bg-rose-500/20 px-3 text-sm font-medium text-rose-100"
      >
        Clear map
      </button>
    </div>
  );
}
