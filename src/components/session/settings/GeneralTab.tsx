import { TransitControls } from "../../map/TransitControls";
import type { TransitRouteFilter } from "../../../domain/map/transit";
import type { DistanceUnit } from "../../../domain/map/distance";
import type { MapStyle, StreetBasemap } from "../../../domain/map/mapBasemaps";
import { effectiveMapStyle } from "../../../domain/device/power/powerProfile";
import { SegmentControl } from "../../ui/forms/SegmentControl";
import { SettingsToggleRow } from "../SettingsToggleRow";

export interface MapSettingsGeneralTabProps {
  showCurrentLocation: boolean;
  onShowCurrentLocationChange: (enabled: boolean) => void;
  showAdminBoundaries: boolean;
  onShowAdminBoundariesChange: (enabled: boolean) => void;
  /** Read-only: satellite option and effective style respect low power from Session tab. */
  lowPowerMode: boolean;
  distanceUnit: DistanceUnit;
  onDistanceUnitChange: (unit: DistanceUnit) => void;
  distanceUnitEditable?: boolean;
  mapStyle: MapStyle;
  onMapStyleChange: (style: MapStyle) => void;
  streetBasemap: StreetBasemap;
  onStreetBasemapChange: (theme: StreetBasemap) => void;
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
}

export function MapSettingsGeneralTab({
  showCurrentLocation,
  onShowCurrentLocationChange,
  showAdminBoundaries,
  onShowAdminBoundariesChange,
  lowPowerMode,
  distanceUnit,
  onDistanceUnitChange,
  distanceUnitEditable = false,
  mapStyle,
  onMapStyleChange,
  streetBasemap,
  onStreetBasemapChange,
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
        value={streetBasemap}
        options={[
          { value: "light", label: "Light" },
          { value: "dark", label: "Dark" },
        ]}
        onChange={onStreetBasemapChange}
        aria-label="Street map theme"
      />
      <p className="text-xs text-ink-dim">
        Light / Dark apply to the street map. Map / Sat stays on the map.
      </p>

      <SegmentControl
        variant="pill"
        value={displayedMapStyle}
        options={[
          { value: "standard", label: "Street map" },
          { value: "satellite", label: "Satellite", disabled: lowPowerMode },
        ]}
        onChange={onMapStyleChange}
        aria-label="Map style"
      />
      {lowPowerMode ? (
        <p className="text-xs text-ink-dim">
          Low power mode keeps the street map. Turn it off to use satellite.
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
