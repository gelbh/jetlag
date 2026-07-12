import { TransitControls } from "../../map/TransitControls";
import type { TransitRouteFilter } from "../../../domain/map/transit";
import type { DistanceUnit } from "../../../domain/map/distance";
import type { MapStyle } from "../../../domain/map/mapBasemaps";
import { effectiveMapStyle } from "../../../domain/device/powerProfile";
import type { NotificationPreferences } from "../../../domain/device/notifications";
import { SegmentControl } from "../../ui/SegmentControl";
import { SettingsToggleRow } from "../SettingsToggleRow";
import { NotificationPreferencesSection } from "./NotificationPreferencesSection";

export interface MapSettingsGeneralTabProps {
  showCurrentLocation: boolean;
  onShowCurrentLocationChange: (enabled: boolean) => void;
  showAdminBoundaries: boolean;
  onShowAdminBoundariesChange: (enabled: boolean) => void;
  keepScreenAwake: boolean;
  onKeepScreenAwakeChange: (enabled: boolean) => void;
  lowPowerMode: boolean;
  onLowPowerModeChange: (enabled: boolean) => void;
  distanceUnit: DistanceUnit;
  onDistanceUnitChange: (unit: DistanceUnit) => void;
  distanceUnitEditable?: boolean;
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
}

export function MapSettingsGeneralTab({
  showCurrentLocation,
  onShowCurrentLocationChange,
  showAdminBoundaries,
  onShowAdminBoundariesChange,
  keepScreenAwake,
  onKeepScreenAwakeChange,
  lowPowerMode,
  onLowPowerModeChange,
  distanceUnit,
  onDistanceUnitChange,
  distanceUnitEditable = false,
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
}: MapSettingsGeneralTabProps) {
  const displayedMapStyle = effectiveMapStyle(mapStyle, lowPowerMode);

  return (
    <div className="space-y-3">
      <SettingsToggleRow
        label="Show my location"
        checked={showCurrentLocation}
        onChange={onShowCurrentLocationChange}
      />
      <SettingsToggleRow
        label="Administrative borders"
        description="Reference outlines for admin divisions in the play area. Finer levels draw lighter."
        checked={showAdminBoundaries}
        onChange={onShowAdminBoundariesChange}
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

      <SegmentControl
        variant="pill"
        value={distanceUnit}
        options={[
          { value: "metric", label: "Metric (km)" },
          { value: "imperial", label: "Imperial (mi)" },
        ]}
        onChange={distanceUnitEditable ? onDistanceUnitChange : () => {}}
        disabled={!distanceUnitEditable}
        aria-label="Distance unit"
      />
      {!distanceUnitEditable ? (
        <p className="text-xs text-ink-dim">
          Distance edition is set for this session by the host.
        </p>
      ) : null}

      <SegmentControl
        variant="pill"
        value={displayedMapStyle}
        options={[
          { value: "standard", label: "Standard map" },
          { value: "satellite", label: "Satellite", disabled: lowPowerMode },
        ]}
        onChange={onMapStyleChange}
        aria-label="Map style"
      />
      {lowPowerMode ? (
        <p className="text-xs text-ink-dim">
          Low power mode keeps the standard map. Turn it off to use satellite.
        </p>
      ) : (
        <p className="text-xs text-ink-dim">
          Quick toggle: Map / Sat on the bottom tool bar.
        </p>
      )}

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
