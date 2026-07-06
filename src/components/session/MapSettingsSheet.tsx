import { useState, type ReactNode } from "react";
import { MobileSheet } from "../ui/MobileSheet";
import { ShareCode } from "./ShareCode";
import { useScrollLock } from "../../hooks/useScrollLock";
import { TransitControls } from "../map/TransitControls";
import {
  SettingsSegmentControl,
  type SettingsSegment,
} from "./SettingsSegmentControl";
import { SettingsToggleRow } from "./SettingsToggleRow";
import { LayerVisibilityGrid } from "./LayerVisibilityGrid";
import type { TransitRouteFilter } from "../../domain/transit";
import type { DistanceUnit } from "../../domain/distance";
import type { MapStyle } from "../../domain/mapBasemaps";
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
  mapStyle: MapStyle;
  onMapStyleChange: (style: MapStyle) => void;
  locationError?: string | null;
  transitEnabled: boolean;
  transitLiveEnabled: boolean;
  transitLiveSupported: boolean;
  sessionIsPremium?: boolean;
  transitRouteFilter: TransitRouteFilter;
  metroLabel: string | null;
  loadingStatic: boolean;
  loadingLive: boolean;
  liveDataStale?: boolean;
  stopCount: number;
  routeCount: number;
  vehicleCount: number;
  lastUpdated?: string;
  transitError?: string | null;
  onToggleTransit: () => void;
  onToggleLiveTransit: () => void;
  onTransitRouteFilterChange: (value: TransitRouteFilter) => void;
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
  mapStyle,
  onMapStyleChange,
  locationError,
  transitEnabled,
  transitLiveEnabled,
  transitLiveSupported,
  sessionIsPremium = false,
  transitRouteFilter,
  metroLabel,
  loadingStatic,
  loadingLive,
  liveDataStale = false,
  stopCount,
  routeCount,
  vehicleCount,
  lastUpdated,
  transitError,
  onToggleTransit,
  onToggleLiveTransit,
  onTransitRouteFilterChange,
  onClearMap,
  onExport,
  isHost = false,
  onResetBoard,
  onEndSession,
  sessionCode,
  remoteSession,
}: MapSettingsSheetProps) {
  const [segment, setSegment] = useState<SettingsSegment>("map");
  useScrollLock(open);

  if (!open) {
    return null;
  }

  return (
    <SettingsOverlay onClose={onClose}>
      <MobileSheet maxHeightClassName="max-h-[min(85dvh,760px)]">
        <div className="sticky top-0 z-10 -mx-4 space-y-3 bg-surface-panel px-4 pb-3 pt-1">
          <div className="jl-settings-header flex items-center justify-between gap-3">
            <div>
              <p className="font-display text-[10px] font-semibold uppercase tracking-[0.14em] text-brand-blue">
                Setup
              </p>
              <h2 className="font-display text-xl font-bold uppercase tracking-tight text-ink">
                Settings
              </h2>
            </div>
            <button
              type="button"
              onClick={onClose}
              className="btn-secondary min-h-10 px-4 text-xs"
            >
              Close
            </button>
          </div>

          {pendingWrites > 0 ? (
            <p className="border-2 border-status-warning/40 bg-status-warning-surface px-3 py-2 text-sm font-semibold text-status-warning">
              {pendingWrites} pending sync
            </p>
          ) : null}

          <SettingsSegmentControl value={segment} onChange={setSegment} />
        </div>

        <div
          key={segment}
          role="tabpanel"
          className="motion-safe:animate-[settings-fade-in_150ms_ease-out] motion-reduce:animate-none"
        >
          {segment === "map" ? (
            <MapSegment
              showCurrentLocation={showCurrentLocation}
              onShowCurrentLocationChange={onShowCurrentLocationChange}
              keepScreenAwake={keepScreenAwake}
              onKeepScreenAwakeChange={onKeepScreenAwakeChange}
              distanceUnit={distanceUnit}
              onDistanceUnitChange={onDistanceUnitChange}
              mapStyle={mapStyle}
              onMapStyleChange={onMapStyleChange}
              locationError={locationError}
              transitEnabled={transitEnabled}
              transitLiveEnabled={transitLiveEnabled}
              transitLiveSupported={transitLiveSupported}
              sessionIsPremium={sessionIsPremium}
              transitRouteFilter={transitRouteFilter}
              metroLabel={metroLabel}
              loadingStatic={loadingStatic}
              loadingLive={loadingLive}
              liveDataStale={liveDataStale}
              stopCount={stopCount}
              routeCount={routeCount}
              vehicleCount={vehicleCount}
              lastUpdated={lastUpdated}
              transitError={transitError}
              onToggleTransit={onToggleTransit}
              onToggleLiveTransit={onToggleLiveTransit}
              onTransitRouteFilterChange={onTransitRouteFilterChange}
            />
          ) : null}

          {segment === "layers" ? (
            <LayerVisibilityGrid
              layerVisibility={layerVisibility}
              onLayerVisibilityChange={onLayerVisibilityChange}
            />
          ) : null}

          {segment === "session" ? (
            <SessionSegment
              sessionCode={sessionCode}
              remoteSession={remoteSession}
              onClearMap={onClearMap}
              onExport={onExport}
              isHost={isHost}
              onResetBoard={onResetBoard}
              onEndSession={onEndSession}
            />
          ) : null}
        </div>

        <p className="mt-6 border-t-2 border-border pt-3 text-[10px] leading-relaxed text-ink-dim">
          Map data © OpenStreetMap contributors · © CARTO
        </p>
      </MobileSheet>
    </SettingsOverlay>
  );
}

function MapSegment({
  showCurrentLocation,
  onShowCurrentLocationChange,
  keepScreenAwake,
  onKeepScreenAwakeChange,
  distanceUnit,
  onDistanceUnitChange,
  mapStyle,
  onMapStyleChange,
  locationError,
  transitEnabled,
  transitLiveEnabled,
  transitLiveSupported,
  sessionIsPremium = false,
  transitRouteFilter,
  metroLabel,
  loadingStatic,
  loadingLive,
  liveDataStale = false,
  stopCount,
  routeCount,
  vehicleCount,
  lastUpdated,
  transitError,
  onToggleTransit,
  onToggleLiveTransit,
  onTransitRouteFilterChange,
}: {
  showCurrentLocation: boolean;
  onShowCurrentLocationChange: (enabled: boolean) => void;
  keepScreenAwake: boolean;
  onKeepScreenAwakeChange: (enabled: boolean) => void;
  distanceUnit: DistanceUnit;
  onDistanceUnitChange: (unit: DistanceUnit) => void;
  mapStyle: MapStyle;
  onMapStyleChange: (style: MapStyle) => void;
  locationError?: string | null;
  transitEnabled: boolean;
  transitLiveEnabled: boolean;
  transitLiveSupported: boolean;
  sessionIsPremium?: boolean;
  transitRouteFilter: TransitRouteFilter;
  metroLabel: string | null;
  loadingStatic: boolean;
  loadingLive: boolean;
  liveDataStale?: boolean;
  stopCount: number;
  routeCount: number;
  vehicleCount: number;
  lastUpdated?: string;
  transitError?: string | null;
  onToggleTransit: () => void;
  onToggleLiveTransit: () => void;
  onTransitRouteFilterChange: (value: TransitRouteFilter) => void;
}) {
  return (
    <div className="space-y-3">
      <SettingsToggleRow
        label="Show my location"
        checked={showCurrentLocation}
        onChange={onShowCurrentLocationChange}
      />
      <SettingsToggleRow
        label="Keep screen awake"
        checked={keepScreenAwake}
        onChange={onKeepScreenAwakeChange}
      />

      <ChoicePair
        left={{ value: "metric", label: "Metric (km)" }}
        right={{ value: "imperial", label: "Imperial (mi)" }}
        selected={distanceUnit}
        onSelect={onDistanceUnitChange}
      />

      <ChoicePair
        left={{ value: "standard", label: "Standard map" }}
        right={{ value: "satellite", label: "Satellite" }}
        selected={mapStyle}
        onSelect={onMapStyleChange}
      />
      <p className="text-xs text-ink-dim">
        Quick toggle: Map / Sat on the bottom tool bar.
      </p>

      {locationError ? (
        <p className="text-sm text-status-error">{locationError}</p>
      ) : null}

      <TransitControls
        variant="inline"
        enabled={transitEnabled}
        liveEnabled={transitLiveEnabled}
        liveSupported={transitLiveSupported}
        premiumSession={sessionIsPremium}
        routeFilter={transitRouteFilter}
        metroLabel={metroLabel}
        loadingStatic={loadingStatic}
        loadingLive={loadingLive}
        liveDataStale={liveDataStale}
        stopCount={stopCount}
        routeCount={routeCount}
        vehicleCount={vehicleCount}
        lastUpdated={lastUpdated}
        error={transitError}
        onToggleEnabled={onToggleTransit}
        onToggleLive={onToggleLiveTransit}
        onRouteFilterChange={onTransitRouteFilterChange}
      />
    </div>
  );
}

function ChoicePair<T extends string>({
  left,
  right,
  selected,
  onSelect,
}: {
  left: { value: T; label: string };
  right: { value: T; label: string };
  selected: T;
  onSelect: (value: T) => void;
}) {
  return (
    <div className="jl-choice-pair">
      {[left, right].map((option) => (
        <button
          key={option.value}
          type="button"
          onClick={() => onSelect(option.value)}
          className={`jl-choice-btn ${
            selected === option.value ? "jl-choice-btn-selected" : ""
          }`}
        >
          {option.label}
        </button>
      ))}
    </div>
  );
}

function SessionSegment({
  sessionCode,
  remoteSession,
  onClearMap,
  onExport,
  isHost,
  onResetBoard,
  onEndSession,
}: {
  sessionCode: string;
  remoteSession: boolean;
  onClearMap: () => void;
  onExport?: () => void;
  isHost: boolean;
  onResetBoard?: () => void;
  onEndSession?: () => void;
}) {
  return (
    <div className="space-y-4">
      <ShareCode code={sessionCode} remote={remoteSession} />

      {onExport ? (
        <button type="button" onClick={onExport} className="btn-secondary w-full">
          Export map
        </button>
      ) : null}

      <div className="space-y-2 border-t-2 border-border pt-4">
        <button
          type="button"
          onClick={onClearMap}
          className="btn-secondary w-full border-status-error/50 bg-status-error-surface text-status-error"
        >
          Clear map
        </button>

        {isHost ? (
          <>
            <button
              type="button"
              onClick={onResetBoard}
              className="btn-secondary w-full border-status-warning/50 bg-status-warning-surface text-status-warning"
            >
              Reset board for everyone
            </button>
            <button
              type="button"
              onClick={onEndSession}
              className="btn-secondary w-full border-status-error/50 bg-status-error-surface text-status-error"
            >
              End session
            </button>
          </>
        ) : null}
      </div>
    </div>
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
      className="pointer-events-auto fixed inset-0 z-[var(--z-modal)] overscroll-contain hud-scrim"
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
