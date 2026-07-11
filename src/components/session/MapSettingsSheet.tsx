import { useState } from "react";
import { AnimatedOverlay } from "../ui/AnimatedOverlay";
import { CurseReferenceSheet } from "../expansion/CurseReferenceSheet";
import { ShareCode } from "./ShareCode";
import { TransitControls } from "../map/TransitControls";
import {
  SettingsSegmentControl,
  type SettingsSegment,
} from "./SettingsSegmentControl";
import { SettingsToggleRow } from "./SettingsToggleRow";
import { LayerVisibilityGrid } from "./LayerVisibilityGrid";
import type { TransitRouteFilter } from "../../domain/map/transit";
import type { DistanceUnit } from "../../domain/map/distance";
import type { GameSize } from "../../domain/session/gameSize";
import {
  type AdvancedSessionSettingsValue,
} from "../../domain/session/advancedSessionSettings";
import { AdvancedSessionSettings } from "./AdvancedSessionSettings";
import type { MapStyle } from "../../domain/map/mapBasemaps";
import type { LayerVisibility } from "../../state/sessionStore";
import type { NotificationPreferences } from "../../domain/device/notifications";
import { isNativeNotificationsSupported } from "../../services/core/notifications";

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
    >
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
          className="jl-step-enter motion-reduce:animate-none"
        >
          {segment === "map" ? (
            <MapSegment
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
            <SessionSegment
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

function MapSegment({
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
}: {
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
}) {
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

      <ChoicePair
        left={{ value: "metric", label: "Metric (km)" }}
        right={{ value: "imperial", label: "Imperial (mi)" }}
        selected={distanceUnit}
        onSelect={distanceUnitEditable ? onDistanceUnitChange : () => {}}
      />
      {!distanceUnitEditable ? (
        <p className="text-xs text-ink-dim">
          Distance edition is set for this session by the host.
        </p>
      ) : null}

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
  onLeaveSession,
  endGameBlocked = false,
  expansionPackEnabled = false,
  onOpenCurseReference,
}: {
  sessionCode: string;
  remoteSession: boolean;
  onClearMap: () => void;
  onExport?: () => void;
  isHost: boolean;
  onResetBoard?: () => void;
  onEndSession?: () => void;
  onLeaveSession?: () => void;
  endGameBlocked?: boolean;
  expansionPackEnabled?: boolean;
  onOpenCurseReference?: () => void;
}) {
  return (
    <div className="space-y-4">
      <ShareCode code={sessionCode} remote={remoteSession} />

      {expansionPackEnabled && onOpenCurseReference ? (
        <button
          type="button"
          onClick={onOpenCurseReference}
          className="btn-secondary w-full"
        >
          Expansion curse reference
        </button>
      ) : null}

      {onExport ? (
        <button type="button" onClick={onExport} className="btn-secondary w-full">
          Export map
        </button>
      ) : null}

      <div className="space-y-2 border-t-2 border-border pt-4">
        {endGameBlocked ? (
          <p className="text-sm text-ink-muted">
            Clear map and reset board are unavailable during end game.
          </p>
        ) : null}
        <button
          type="button"
          onClick={onClearMap}
          disabled={endGameBlocked}
          className="btn-secondary w-full border-status-error/50 bg-status-error-surface text-status-error disabled:opacity-50"
        >
          Clear map
        </button>

        {isHost ? (
          <>
            <button
              type="button"
              onClick={onResetBoard}
              disabled={endGameBlocked}
              className="btn-secondary w-full border-status-warning/50 bg-status-warning-surface text-status-warning disabled:opacity-50"
            >
              Reset board for everyone
            </button>
            <button
              type="button"
              onClick={onEndSession}
              className="btn-secondary w-full border-status-error/50 bg-status-error-surface text-status-error"
            >
              End session for everyone
            </button>
          </>
        ) : null}

        {onLeaveSession ? (
          <button
            type="button"
            onClick={onLeaveSession}
            className="btn-secondary w-full"
          >
            Leave session
          </button>
        ) : null}
      </div>
    </div>
  );
}
