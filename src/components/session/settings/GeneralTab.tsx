import { Stack } from "@mantine/core";
import { TransitControls } from "../../map/chrome/TransitControls";
import type { TransitRouteFilter } from "@/domain/map/transit";
import type { DistanceUnit } from "@/domain/map/distance";
import type { MapStyle, StreetBasemap } from "@/domain/map/mapBasemaps";
import { effectiveMapStyle } from "@/domain/device/power/powerProfile";
import { SegmentControl } from "../../ui/forms/SegmentControl";
import { InsetGroup, SectionLabel } from "@/components/ui/entry/entryChrome";
import { SettingsToggleRow } from "../settings/SettingsToggleRow";
import { LayerVisibilityGrid } from "../mapChrome/LayerVisibilityGrid";
import type { LayerVisibility } from "@/state/sessionStore";

/** Flat general/layers fields bag for MapSettingsGeneralTab (W4-C peel). */
export type MapSettingsGeneralTabModel = {
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
  layerVisibility: LayerVisibility;
  onLayerVisibilityChange: (
    layer: keyof LayerVisibility,
    visible: boolean,
  ) => void;
};

export type MapSettingsGeneralTabProps = {
  model: MapSettingsGeneralTabModel;
};

export function MapSettingsGeneralTab({ model }: MapSettingsGeneralTabProps) {
  const {
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
    layerVisibility,
    onLayerVisibilityChange,
  } = model;
  const displayedMapStyle = effectiveMapStyle(mapStyle, lowPowerMode);

  return (
    <Stack gap="lg">
      <Stack gap="xs">
        <SectionLabel>Location</SectionLabel>
        <InsetGroup>
          <SettingsToggleRow
            label="Show my location"
            checked={showCurrentLocation}
            onChange={onShowCurrentLocationChange}
          />
          <SettingsToggleRow
            showSeparator
            label="Administrative borders"
            description="Reference outlines for admin divisions in the play area. Finer levels draw lighter."
            checked={showAdminBoundaries}
            onChange={onShowAdminBoundariesChange}
          />
        </InsetGroup>
        {locationError ? (
          <p className="px-1 text-sm text-[var(--color-halt)]">
            {locationError}
          </p>
        ) : null}
      </Stack>

      <Stack gap="xs">
        <SectionLabel>Units & basemap</SectionLabel>
        <InsetGroup>
          <div className="space-y-3 px-3 py-3">
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
              <p className="text-xs text-[var(--color-field-ink-muted)]">
                Host set distance units for this session.
              </p>
            ) : null}

            <SegmentControl
              variant="pill"
              value={streetBasemap}
              options={[
                { value: "light", label: "Light streets" },
                { value: "dark", label: "Dark streets" },
              ]}
              onChange={onStreetBasemapChange}
              aria-label="Street map theme"
            />

            <SegmentControl
              variant="pill"
              value={displayedMapStyle}
              options={[
                { value: "standard", label: "Street map" },
                {
                  value: "satellite",
                  label: "Satellite",
                  disabled: lowPowerMode,
                },
              ]}
              onChange={onMapStyleChange}
              aria-label="Map style"
            />
            {lowPowerMode ? (
              <p className="text-xs text-[var(--color-field-ink-muted)]">
                Low power keeps the street map. Turn it off under Session for
                satellite.
              </p>
            ) : (
              <p className="text-xs text-[var(--color-field-ink-muted)]">
                Map / Sat on the tool bar toggles style quickly.
              </p>
            )}
          </div>
        </InsetGroup>
      </Stack>

      <Stack gap="xs">
        <SectionLabel>Annotation layers</SectionLabel>
        <LayerVisibilityGrid
          layerVisibility={layerVisibility}
          onLayerVisibilityChange={onLayerVisibilityChange}
        />
      </Stack>

      <Stack gap="xs">
        <SectionLabel>Transit</SectionLabel>
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
      </Stack>
    </Stack>
  );
}
