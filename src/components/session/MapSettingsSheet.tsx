import { useState } from "react";
import { MotionSheet } from "../motion/MotionSheet";
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
import type { MapTilt } from "../../domain/map/mapTilt";
import type { LayerVisibility } from "../../state/sessionStore";
import type { NotificationPreferences } from "../../domain/device/notifications";
import { isNativeNotificationsSupported } from "../../services/core/notifications";
import type { TransitRouteFilter } from "../../domain/map/transit";
import { MapSettingsGeneralTab } from "./settings/GeneralTab";
import { MapSettingsSessionTab } from "./settings/SessionTab";

export interface MapSettingsGeneralProps {
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
  mapTilt: MapTilt;
  onMapTiltChange: (tilt: MapTilt) => void;
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

export interface MapSettingsLayersProps {
  layerVisibility: LayerVisibility;
  onLayerVisibilityChange: (
    layer: keyof LayerVisibility,
    visible: boolean,
  ) => void;
}

export interface MapSettingsRulesProps {
  gameRulesEditable?: boolean;
  gameSize?: GameSize;
  advancedSettings: AdvancedSessionSettingsValue;
  onAdvancedSettingsChange: (value: AdvancedSessionSettingsValue) => void;
  onSaveGameRules?: () => void | Promise<void>;
  gameRulesSaveLabel?: string;
}

export interface MapSettingsSessionProps {
  sessionCode: string;
  remoteSession: boolean;
  onClearMap?: () => void;
  onExport?: () => void;
  isHost?: boolean;
  onResetBoard?: () => void;
  onResetSession?: () => void;
  onEndSession?: () => void;
  onLeaveSession?: () => void;
  endGameBlocked?: boolean;
  expansionPackEnabled?: boolean;
}

interface MapSettingsSheetProps {
  open: boolean;
  onClose: () => void;
  pendingWrites: number;
  general: MapSettingsGeneralProps;
  layers: MapSettingsLayersProps;
  rules?: MapSettingsRulesProps;
  session: MapSettingsSessionProps;
}

export function MapSettingsSheet({
  open,
  onClose,
  pendingWrites,
  general,
  layers,
  rules,
  session,
}: MapSettingsSheetProps) {
  const [segment, setSegment] = useState<SettingsSegment>("map");
  const [curseSheetOpen, setCurseSheetOpen] = useState(false);

  const nativeNotificationsSupported =
    general.nativeNotificationsSupported ?? isNativeNotificationsSupported();
  const gameRulesEditable = rules?.gameRulesEditable ?? false;
  const gameSize = rules?.gameSize ?? "medium";
  const gameRulesSaveLabel = rules?.gameRulesSaveLabel ?? "Save game rules";

  return (
    <MotionSheet
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
            showCurrentLocation={general.showCurrentLocation}
            onShowCurrentLocationChange={general.onShowCurrentLocationChange}
            showAdminBoundaries={general.showAdminBoundaries}
            onShowAdminBoundariesChange={general.onShowAdminBoundariesChange}
            keepScreenAwake={general.keepScreenAwake}
            onKeepScreenAwakeChange={general.onKeepScreenAwakeChange}
            lowPowerMode={general.lowPowerMode}
            onLowPowerModeChange={general.onLowPowerModeChange}
            distanceUnit={general.distanceUnit}
            onDistanceUnitChange={general.onDistanceUnitChange}
            distanceUnitEditable={general.distanceUnitEditable}
            mapStyle={general.mapStyle}
            onMapStyleChange={general.onMapStyleChange}
            mapTilt={general.mapTilt}
            onMapTiltChange={general.onMapTiltChange}
            locationError={general.locationError}
            transitEnabled={general.transitEnabled}
            transitLiveEnabled={general.transitLiveEnabled}
            transitLiveSupported={general.transitLiveSupported}
            sessionIsPremium={general.sessionIsPremium}
            transitRouteFilter={general.transitRouteFilter}
            metroLabel={general.metroLabel}
            loadingStatic={general.loadingStatic}
            loadingLive={general.loadingLive}
            liveDataStale={general.liveDataStale}
            stopCount={general.stopCount}
            routeCount={general.routeCount}
            vehicleCount={general.vehicleCount}
            lastUpdated={general.lastUpdated}
            transitError={general.transitError}
            onToggleTransit={general.onToggleTransit}
            onToggleLiveTransit={general.onToggleLiveTransit}
            onTransitRouteFilterChange={general.onTransitRouteFilterChange}
            notificationPreferences={general.notificationPreferences}
            nativeNotificationsSupported={nativeNotificationsSupported}
            onNotificationPreferencesChange={
              general.onNotificationPreferencesChange
            }
            onEnableNotifications={general.onEnableNotifications}
          />
        ) : null}

        {segment === "layers" ? (
          <LayerVisibilityGrid
            layerVisibility={layers.layerVisibility}
            onLayerVisibilityChange={layers.onLayerVisibilityChange}
          />
        ) : null}

        {segment === "rules" && rules ? (
          <div className="space-y-3">
            {!gameRulesEditable ? (
              <p className="border-2 border-border bg-surface-deep px-3 py-2 text-sm text-ink-muted">
                Game rules lock after the timer starts. Host can edit before
                start.
              </p>
            ) : null}
            <AdvancedSessionSettings
              gameSize={gameSize}
              distanceUnit={general.distanceUnit}
              value={rules.advancedSettings}
              onChange={rules.onAdvancedSettingsChange}
              disabled={!gameRulesEditable}
              collapsible={false}
            />
            {gameRulesEditable && rules.onSaveGameRules ? (
              <button
                type="button"
                onClick={() => void rules.onSaveGameRules?.()}
                className="btn-primary min-h-11 w-full"
              >
                {gameRulesSaveLabel}
              </button>
            ) : null}
          </div>
        ) : null}

        {segment === "session" ? (
          <MapSettingsSessionTab
            sessionCode={session.sessionCode}
            remoteSession={session.remoteSession}
            onClearMap={session.onClearMap}
            onExport={session.onExport}
            isHost={session.isHost ?? false}
            onResetBoard={session.onResetBoard}
            onResetSession={session.onResetSession}
            onEndSession={session.onEndSession}
            onLeaveSession={session.onLeaveSession}
            endGameBlocked={session.endGameBlocked}
            expansionPackEnabled={session.expansionPackEnabled}
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
    </MotionSheet>
  );
}
