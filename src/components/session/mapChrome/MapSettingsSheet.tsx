import { useState } from "react";
import { Box, Text } from "@mantine/core";
import { SheetHost } from "../../ui/sheets/SheetHost";
import {
  SettingsSegmentControl,
  type SettingsSegment,
} from "../settings/SettingsSegmentControl";
import type { DistanceUnit } from "@/domain/map/distance";
import type { GameSize } from "@/domain/session/size/gameSize";
import {
  defaultAdvancedSessionSettings,
  type AdvancedSessionSettingsValue,
} from "@/domain/session/tools/advancedSessionSettings";
import type { MapStyle, StreetBasemap } from "@/domain/map/mapBasemaps";
import { getBasemapAttributionText } from "@/domain/map/mapBasemaps";
import type { SessionRecord } from "@/domain/map/annotations";
import type { LayerVisibility } from "@/state/sessionStore";
import type { NotificationPreferences } from "@/domain/device/chrome/notifications";
import { isNativeNotificationsSupported } from "@/services/core/native/notifications";
import type { TransitRouteFilter } from "@/domain/map/transit";
import { MapSettingsGeneralTab } from "../settings/GeneralTab";
import { MapSettingsGameTab } from "../settings/GameTab";
import { MapSettingsSessionTab } from "../settings/SessionTab";

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
  onReviewMapTools?: () => void;
  onOpenCurseReference?: () => void;
  session?: SessionRecord | null;
  myUid?: string;
}

interface MapSettingsSheetProps {
  open: boolean;
  onClose: () => void;
  pendingWrites: number;
  general: MapSettingsGeneralProps;
  layers: MapSettingsLayersProps;
  rules?: MapSettingsRulesProps;
  session: MapSettingsSessionProps;
  /** Chrome-owned Report sheet opener (session island / map chrome). */
  onReportProblem?: () => void;
}

export function MapSettingsSheet({
  open,
  onClose,
  pendingWrites,
  general,
  layers,
  rules,
  session,
  onReportProblem,
}: MapSettingsSheetProps) {
  const [segment, setSegment] = useState<SettingsSegment>("map");

  const nativeNotificationsSupported =
    general.nativeNotificationsSupported ?? isNativeNotificationsSupported();
  const gameRulesEditable = rules?.gameRulesEditable ?? false;
  const gameSize = rules?.gameSize ?? "medium";
  const gameRulesSaveLabel = rules?.gameRulesSaveLabel ?? "Save game rules";

  return (
    <SheetHost
      open={open}
      onClose={onClose}
      ariaLabel="Settings"
      railTab="settings"
      maxHeightClassName="max-h-[min(85dvh,40rem)]"
      pinned={
        <div className="space-y-3 pb-1">
          <h2 className="text-[1.375rem] font-bold tracking-tight text-[var(--color-field-ink)]">
            Settings
          </h2>

          {pendingWrites > 0 ? (
            <Box
              px="0.85rem"
              py="0.55rem"
              style={{
                borderRadius: 12,
                border: "0.33px solid oklch(from var(--color-signal) l c h / 0.55)",
                backgroundColor: "oklch(from var(--color-signal) l c h / 0.14)",
              }}
            >
              <Text
                size="sm"
                fw={600}
                style={{ color: "var(--color-field-ink)" }}
              >
                {pendingWrites} pending sync
              </Text>
            </Box>
          ) : null}

          <SettingsSegmentControl value={segment} onChange={setSegment} />
        </div>
      }
    >
      <div
        key={segment}
        id={`settings-panel-${segment}`}
        role="tabpanel"
        aria-labelledby={`settings-tab-${segment}`}
        className="jl-step-enter motion-reduce:animate-none"
      >
        {segment === "map" ? (
          <MapSettingsGeneralTab
            model={{
              ...general,
              layerVisibility: layers.layerVisibility,
              onLayerVisibilityChange: layers.onLayerVisibilityChange,
            }}
          />
        ) : null}

        {segment === "game" ? (
          <MapSettingsGameTab
            sessionCode={session.sessionCode}
            remoteSession={session.remoteSession}
            isHost={session.isHost ?? false}
            session={session.session}
            myUid={session.myUid}
            distanceUnit={general.distanceUnit}
            gameRulesEditable={gameRulesEditable}
            gameSize={gameSize}
            advancedSettings={
              rules?.advancedSettings ??
              defaultAdvancedSessionSettings(gameSize, general.distanceUnit)
            }
            onAdvancedSettingsChange={
              rules?.onAdvancedSettingsChange ?? (() => {})
            }
            onSaveGameRules={rules?.onSaveGameRules}
            gameRulesSaveLabel={gameRulesSaveLabel}
          />
        ) : null}

        {segment === "session" ? (
          <MapSettingsSessionTab
            remoteSession={session.remoteSession}
            keepScreenAwake={general.keepScreenAwake}
            onKeepScreenAwakeChange={general.onKeepScreenAwakeChange}
            lowPowerMode={general.lowPowerMode}
            onLowPowerModeChange={general.onLowPowerModeChange}
            notificationPreferences={general.notificationPreferences}
            nativeNotificationsSupported={nativeNotificationsSupported}
            onNotificationPreferencesChange={
              general.onNotificationPreferencesChange
            }
            onEnableNotifications={general.onEnableNotifications}
            onClearMap={session.onClearMap}
            onExport={session.onExport}
            isHost={session.isHost ?? false}
            onResetBoard={session.onResetBoard}
            onResetSession={session.onResetSession}
            onEndSession={session.onEndSession}
            onLeaveSession={session.onLeaveSession}
            endGameBlocked={session.endGameBlocked}
            expansionPackEnabled={session.expansionPackEnabled}
            onOpenCurseReference={session.onOpenCurseReference}
            onReportProblem={onReportProblem}
            onReviewMapTools={session.onReviewMapTools}
          />
        ) : null}
      </div>

      {segment === "map" ? (
        <p className="mt-6 text-xs leading-relaxed text-[var(--color-field-ink-muted)]">
          {getBasemapAttributionText(general.mapStyle)}
        </p>
      ) : null}
    </SheetHost>
  );
}
