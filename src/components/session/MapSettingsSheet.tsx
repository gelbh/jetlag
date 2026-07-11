import { useState } from "react";
import { AnimatedOverlay } from "../ui/AnimatedOverlay";
import { SheetHeader } from "../ui/SheetHeader";
import { CurseReferenceSheet } from "../expansion/CurseReferenceSheet";
import {
  SettingsSegmentControl,
  type SettingsSegment,
} from "./SettingsSegmentControl";
import { LayerVisibilityGrid } from "./LayerVisibilityGrid";
import type { DistanceUnit } from "../../domain/map/distance";
import type { GameSize } from "../../domain/session/gameSize";
import { type AdvancedSessionSettingsValue } from "../../domain/session/advancedSessionSettings";
import { AdvancedSessionSettings } from "./AdvancedSessionSettings";
import type { MapStyle } from "../../domain/map/mapBasemaps";
import type { LayerVisibility } from "../../state/sessionStore";
import type { NotificationPreferences } from "../../domain/device/notifications";
import { isNativeNotificationsSupported } from "../../services/core/notifications";
import type { TransitRouteFilter } from "../../domain/map/transit";
import { MapSettingsGeneralTab } from "./settings/GeneralTab";
import { MapSettingsSessionTab } from "./settings/SessionTab";

interface MapSettingsSheetProps {
  open: boolean;
  onClose: () => void;
  pendingWrites: number;
  showCurrentLocation: boolean;
  onShowCurrentLocationChange: (enabled: boolean) => void;
  showAdminBoundaries: boolean;
  onShowAdminBoundariesChange: (enabled: boolean) => void;
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
  onClearMap: () => void;
  onExport?: () => void;
  isHost?: boolean;
  onResetBoard?: () => void;
  onEndSession?: () => void;
  onLeaveSession?: () => void;
  sessionCode: string;
  remoteSession: boolean;
  notificationPreferences?: NotificationPreferences;
  nativeNotificationsSupported?: boolean;
  onNotificationPreferencesChange?: (
    patch: Partial<NotificationPreferences>,
  ) => void;
  onEnableNotifications?: () => Promise<boolean>;
  gameRulesEditable?: boolean;
  gameSize?: GameSize;
  advancedSettings?: AdvancedSessionSettingsValue;
  onAdvancedSettingsChange?: (value: AdvancedSessionSettingsValue) => void;
  onSaveGameRules?: () => void | Promise<void>;
  gameRulesSaveLabel?: string;
  endGameBlocked?: boolean;
  expansionPackEnabled?: boolean;
}

export function MapSettingsSheet({
  open,
  onClose,
  pendingWrites,
  showCurrentLocation,
  onShowCurrentLocationChange,
  showAdminBoundaries,
  onShowAdminBoundariesChange,
  keepScreenAwake,
  onKeepScreenAwakeChange,
  lowPowerMode,
  onLowPowerModeChange,
  layerVisibility,
  onLayerVisibilityChange,
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
  onClearMap,
  onExport,
  isHost = false,
  onResetBoard,
  onEndSession,
  onLeaveSession,
  sessionCode,
  remoteSession,
  notificationPreferences,
  nativeNotificationsSupported = isNativeNotificationsSupported(),
  onNotificationPreferencesChange,
  onEnableNotifications,
  gameRulesEditable = false,
  gameSize = "medium",
  advancedSettings,
  onAdvancedSettingsChange,
  onSaveGameRules,
  gameRulesSaveLabel = "Save game rules",
  endGameBlocked = false,
  expansionPackEnabled = false,
}: MapSettingsSheetProps) {
  const [segment, setSegment] = useState<SettingsSegment>("map");
  const [curseSheetOpen, setCurseSheetOpen] = useState(false);

  return (
    <AnimatedOverlay
      open={open}
      onClose={onClose}
      ariaLabel="Settings"
      maxHeightClassName="max-h-[min(85dvh,760px)]"
      pinned={
        <div className="space-y-3 pb-3">
          <SheetHeader
            title="Settings"
            eyebrow="Setup"
            onClose={onClose}
            titleSize="xl"
            flush
            className="jl-settings-header"
          />

          {pendingWrites > 0 ? (
            <p className="border-2 border-status-warning/40 bg-status-warning-surface px-3 py-2 text-sm font-semibold text-status-warning">
              {pendingWrites} pending sync
            </p>
          ) : null}

          <SettingsSegmentControl value={segment} onChange={setSegment} />
        </div>
      }
    >
      <div
        key={segment}
        role="tabpanel"
        className="jl-step-enter motion-reduce:animate-none"
      >
        {segment === "map" ? (
          <MapSettingsGeneralTab
            showCurrentLocation={showCurrentLocation}
            onShowCurrentLocationChange={onShowCurrentLocationChange}
            showAdminBoundaries={showAdminBoundaries}
            onShowAdminBoundariesChange={onShowAdminBoundariesChange}
            keepScreenAwake={keepScreenAwake}
            onKeepScreenAwakeChange={onKeepScreenAwakeChange}
            lowPowerMode={lowPowerMode}
            onLowPowerModeChange={onLowPowerModeChange}
            distanceUnit={distanceUnit}
            onDistanceUnitChange={onDistanceUnitChange}
            distanceUnitEditable={distanceUnitEditable}
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

        {segment === "rules" && advancedSettings && onAdvancedSettingsChange ? (
          <div className="space-y-3">
            {!gameRulesEditable ? (
              <p className="border-2 border-border bg-surface-deep px-3 py-2 text-sm text-ink-muted">
                Game rules lock after the timer starts. Host can edit before
                start.
              </p>
            ) : null}
            <AdvancedSessionSettings
              gameSize={gameSize}
              distanceUnit={distanceUnit}
              value={advancedSettings}
              onChange={onAdvancedSettingsChange}
              disabled={!gameRulesEditable}
              collapsible={false}
            />
            {gameRulesEditable && onSaveGameRules ? (
              <button
                type="button"
                onClick={() => void onSaveGameRules()}
                className="btn-primary min-h-11 w-full"
              >
                {gameRulesSaveLabel}
              </button>
            ) : null}
          </div>
        ) : null}

        {segment === "session" ? (
          <MapSettingsSessionTab
            sessionCode={sessionCode}
            remoteSession={remoteSession}
            onClearMap={onClearMap}
            onExport={onExport}
            isHost={isHost}
            onResetBoard={onResetBoard}
            onEndSession={onEndSession}
            onLeaveSession={onLeaveSession}
            endGameBlocked={endGameBlocked}
            expansionPackEnabled={expansionPackEnabled}
            onOpenCurseReference={() => setCurseSheetOpen(true)}
          />
        ) : null}
      </div>

      <p className="mt-6 border-t-2 border-border pt-3 text-[10px] leading-relaxed text-ink-dim">
        Map data © OpenStreetMap contributors · © CARTO
      </p>

      <CurseReferenceSheet
        open={curseSheetOpen}
        onClose={() => setCurseSheetOpen(false)}
      />
    </AnimatedOverlay>
  );
}
