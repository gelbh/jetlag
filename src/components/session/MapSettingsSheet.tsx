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
              className="min-h-12 rounded-xl bg-surface-raised px-4 text-sm font-medium"
            >
              Close
            </button>
          </div>

          {pendingWrites > 0 ? (
            <p className="rounded-xl bg-status-warning-surface px-4 py-3 text-sm text-status-warning">
              {pendingWrites} pending sync
            </p>
          ) : null}

          <section className="space-y-3">
            <p className="text-sm font-medium text-ink-secondary">Timer</p>
            <p className="font-mono text-3xl tracking-wide text-ink">
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
            <p className="text-sm font-medium text-ink-secondary">Map</p>
            <label className="flex min-h-12 items-center justify-between gap-3 rounded-xl bg-surface-raised px-4 text-sm text-ink">
              <span>Show my location</span>
              <input
                type="checkbox"
                checked={showCurrentLocation}
                onChange={(event) =>
                  onShowCurrentLocationChange(event.target.checked)
                }
                className="h-5 w-5 accent-action"
              />
            </label>
            <label className="flex min-h-12 items-center justify-between gap-3 rounded-xl bg-surface-raised px-4 text-sm text-ink">
              <span>Keep screen awake</span>
              <input
                type="checkbox"
                checked={keepScreenAwake}
                onChange={(event) =>
                  onKeepScreenAwakeChange(event.target.checked)
                }
                className="h-5 w-5 accent-action"
              />
            </label>
            <div className="grid grid-cols-2 gap-2">
              <button
                type="button"
                onClick={() => onDistanceUnitChange("metric")}
                className={`min-h-12 rounded-xl px-3 text-sm ${
                  distanceUnit === "metric"
                    ? "bg-action text-action-ink"
                    : "bg-surface-raised text-ink"
                }`}
              >
                Metric (km)
              </button>
              <button
                type="button"
                onClick={() => onDistanceUnitChange("imperial")}
                className={`min-h-12 rounded-xl px-3 text-sm ${
                  distanceUnit === "imperial"
                    ? "bg-action text-action-ink"
                    : "bg-surface-raised text-ink"
                }`}
              >
                Imperial (mi)
              </button>
            </div>
            {locationError ? (
              <p className="text-sm text-status-error">{locationError}</p>
            ) : null}
            <div className="space-y-2">
              <p className="text-sm text-ink-muted">Layer visibility</p>
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
                  className="flex min-h-12 items-center justify-between gap-3 rounded-xl bg-surface-raised px-4 text-sm text-ink"
                >
                  <span>{label}</span>
                  <input
                    type="checkbox"
                    checked={layerVisibility[layer]}
                    onChange={(event) =>
                      onLayerVisibilityChange(layer, event.target.checked)
                    }
                    className="h-5 w-5 accent-action"
                  />
                </label>
              ))}
            </div>
          </section>

          <section className="space-y-2">
            <p className="text-sm font-medium text-ink-secondary">Transit</p>
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
            <p className="text-sm font-medium text-ink-secondary">Session</p>
            <ShareCode code={sessionCode} remote={remoteSession} />
            <SessionActions onClearMap={onClearMap} onExport={onExport} />
            {isHost ? (
              <div className="grid gap-2">
                <button
                  type="button"
                  onClick={onResetBoard}
                  className="min-h-12 rounded-xl bg-status-warning-surface px-3 text-sm font-medium text-status-warning"
                >
                  Reset board for everyone
                </button>
                <button
                  type="button"
                  onClick={onEndSession}
                  className="min-h-12 rounded-xl bg-status-error-surface px-3 text-sm font-medium text-status-error"
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
      className="pointer-events-auto fixed inset-0 z-[var(--z-modal)] hud-scrim"
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
          className="min-h-12 rounded-xl bg-surface-raised px-3 text-sm font-medium text-ink"
        >
          Export map
        </button>
      ) : null}
      <button
        type="button"
        onClick={onClearMap}
        className="min-h-12 rounded-xl bg-status-error-surface px-3 text-sm font-medium text-status-error"
      >
        Clear map
      </button>
    </div>
  );
}
