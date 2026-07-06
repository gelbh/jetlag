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
import type { NotificationPreferences } from "../../domain/notifications";
import { isNativeNotificationsSupported } from "../../services/notifications";

interface MapSettingsSheetProps {
  open: boolean;
  onClose: () => void;
  pendingWrites: number;
  showCurrentLocation: boolean;
  onShowCurrentLocationChange: (enabled: boolean) => void;
  keepScreenAwake: boolean;
  onKeepScreenAwakeChange: (enabled: boolean) => void;
  lowPowerMode: boolean;
  onLowPowerModeChange: (enabled: boolean) => void;
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
  notificationPreferences?: NotificationPreferences;
  nativeNotificationsSupported?: boolean;
  onNotificationPreferencesChange?: (
    patch: Partial<NotificationPreferences>,
  ) => void;
  onEnableNotifications?: () => Promise<boolean>;
}

export function MapSettingsSheet({
  open,
  onClose,
  pendingWrites,
  showCurrentLocation,
  onShowCurrentLocationChange,
  keepScreenAwake,
  onKeepScreenAwakeChange,
  lowPowerMode,
  onLowPowerModeChange,
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
  notificationPreferences,
  nativeNotificationsSupported = isNativeNotificationsSupported(),
  onNotificationPreferencesChange,
  onEnableNotifications,
}: MapSettingsSheetProps) {
  const [segment, setSegment] = useState<SettingsSegment>("map");
  useScrollLock(open);

  if (!open) {
    return null;
  }

  return (
    <SettingsOverlay onClose={onClose}>
      <MobileSheet maxHeightClassName="max-h-[min(85dvh,760px)]" className="hud-sheet-enter">
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
              lowPowerMode={lowPowerMode}
              onLowPowerModeChange={onLowPowerModeChange}
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
              notificationPreferences={notificationPreferences}
              nativeNotificationsSupported={nativeNotificationsSupported}
              onNotificationPreferencesChange={onNotificationPreferencesChange}
              onEnableNotifications={onEnableNotifications}
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
  lowPowerMode,
  onLowPowerModeChange,
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
  notificationPreferences,
  nativeNotificationsSupported,
  onNotificationPreferencesChange,
  onEnableNotifications,
}: {
  showCurrentLocation: boolean;
  onShowCurrentLocationChange: (enabled: boolean) => void;
  keepScreenAwake: boolean;
  onKeepScreenAwakeChange: (enabled: boolean) => void;
  lowPowerMode: boolean;
  onLowPowerModeChange: (enabled: boolean) => void;
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
  notificationPreferences?: NotificationPreferences;
  nativeNotificationsSupported?: boolean;
  onNotificationPreferencesChange?: (
    patch: Partial<NotificationPreferences>,
  ) => void;
  onEnableNotifications?: () => Promise<boolean>;
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

function NotificationPreferencesSection({
  preferences,
  onChange,
  onEnableNotifications,
}: {
  preferences: NotificationPreferences;
  onChange: (patch: Partial<NotificationPreferences>) => void;
  onEnableNotifications?: () => Promise<boolean>;
}) {
  const handleMasterToggle = async (enabled: boolean) => {
    if (enabled && onEnableNotifications) {
      const granted = await onEnableNotifications();
      onChange({ enabled: granted });
      return;
    }

    onChange({ enabled });
  };

  return (
    <div className="space-y-3 border-t-2 border-border pt-3">
      <p className="font-display text-[10px] font-semibold uppercase tracking-[0.14em] text-brand-blue">
        Phone alerts
      </p>
      <SettingsToggleRow
        label="Push notifications"
        description="Alerts when questions arrive, timers change, or chat messages are sent while the app is in the background."
        checked={preferences.enabled}
        onChange={(enabled) => {
          void handleMasterToggle(enabled);
        }}
      />
      <SettingsToggleRow
        label="New questions"
        checked={preferences.newQuestions}
        onChange={(newQuestions) => onChange({ newQuestions })}
        disabled={!preferences.enabled}
      />
      <SettingsToggleRow
        label="Timer changes"
        checked={preferences.timerChanges}
        onChange={(timerChanges) => onChange({ timerChanges })}
        disabled={!preferences.enabled}
      />
      <SettingsToggleRow
        label="Chat messages"
        checked={preferences.chatMessages}
        onChange={(chatMessages) => onChange({ chatMessages })}
        disabled={!preferences.enabled}
      />
      <SettingsToggleRow
        label="Live Activities / ongoing alerts"
        description="Lock screen countdown for question deadlines and session timers on supported phones."
        checked={preferences.liveActivities}
        onChange={(liveActivities) => onChange({ liveActivities })}
        disabled={!preferences.enabled}
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
      className="pointer-events-auto fixed inset-0 z-[var(--z-modal)] overscroll-contain hud-scrim hud-scrim-enter"
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
