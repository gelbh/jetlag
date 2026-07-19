import type { ReactNode } from "react";
import type { AnnotationRecord, SessionRecord } from "../../domain/map/annotations";
import type {
  PendingQuestionRecord,
  SessionMessageRecord,
} from "../../domain/session/sessionChat";
import type { LayerVisibility } from "../../state/sessionStore";
import type { DistanceUnit } from "../../domain/map/distance";
import type { MapStyle } from "../../domain/map/mapBasemaps";
import type { NotificationPreferences } from "../../domain/device/notifications";
import type { HidingZoneStepId } from "../../components/hider/hidingZoneSteps";
import type { HiderTruthRevealState } from "../../components/session/HiderTruthRevealBanner";
import type { useMapOverlayState } from "../../hooks/map/useMapOverlayState";
import type { useSyncStatus } from "../../hooks/sync/useSyncStatus";
import type { useSessionTimer } from "../../hooks/session/useSessionTimer";
import type { useHiderZoneTool } from "../../hooks/session/useHiderZoneTool";
import type { useTimeTrapTool } from "../../hooks/session/useTimeTrapTool";
import { ChatPanel } from "../../components/chat/ChatPanel";
import { ContextualRail } from "../../components/map/ContextualRail";
import {
  ContextualRailPanelProvider,
  type ContextualRailTab,
} from "../../components/map/ContextualRailContext";
import { DesktopOpsShell } from "../../components/map/DesktopOpsShell";
import { HidingZonePanel } from "../../components/hider/HidingZonePanel";
import { TimeTrapPanel } from "../../components/hider/TimeTrapPanel";
import { ExpansionHiderMenu } from "../../components/hider/ExpansionHiderMenu";
import { CurseReferenceSheet } from "../../components/expansion/CurseReferenceSheet";
import { HiderZoneWizardShell } from "../../components/hider/HiderZoneWizardShell";
import { PopupCloseButton } from "../../components/ui/PopupCloseButton";
import { AppUpdateMapChip } from "../../components/ui/AppUpdateMapChip";
import { FirestorePersistenceBanner } from "../../components/session/FirestorePersistenceBanner";
import { MapStatusRail } from "../../components/session/MapStatusRail";
import { MapSettingsSheet } from "../../components/session/MapSettingsSheet";
import {
  HiderTruthRevealBanner,
} from "../../components/session/HiderTruthRevealBanner";
import { useDesktopLayout } from "../../hooks/useDesktopLayout";
import { useSyncRetryAction } from "../../hooks/session/useSyncRetryAction";
import { HiderToolDock } from "../../components/tools/HiderToolDock";
import { SessionLog } from "../../components/session/SessionLog";
import { isEndGameActive, isEndGamePending, isFoundHiderPending } from "../../domain/map/annotations";
import { GameOverChrome } from "../../components/session/game-over/GameOverChrome";
import { useGameOverActions } from "../../hooks/session/useGameOverActions";
import type { LatLngTuple } from "../../domain/geometry/geometry";
import type { TimeTrapRecord } from "../../domain/expansion/timeTraps";
import type { HiderTruthResult } from "../../domain/questions/ui";

type MapOverlayState = ReturnType<typeof useMapOverlayState>;
type SyncStatusState = ReturnType<typeof useSyncStatus>;
type SessionTimerState = ReturnType<typeof useSessionTimer>;
type HiderZoneToolState = ReturnType<typeof useHiderZoneTool>;
type TimeTrapToolState = ReturnType<typeof useTimeTrapTool>;

type HidingZonePanelTool = {
  query: string;
  setQuery: (value: string) => void;
  stations: HiderZoneToolState["stations"];
  stationsLoading: boolean;
  stationsError: string | null;
  selectedStation: HiderZoneToolState["selectedStation"];
  setSelectedStation: HiderZoneToolState["setSelectedStation"];
  clearStationSelection: () => void;
  manualMode: boolean;
  methodChosen: boolean;
  choosePlacementMethod: HiderZoneToolState["choosePlacementMethod"];
  manualCenter: LatLngTuple | null;
  hasPlacement: boolean;
  confirmZone: () => Promise<void>;
  saving: boolean;
  error: string | null;
};

export type HiderMapScreenChromeProps = {
  session: SessionRecord;
  hasMyZone: boolean;
  uid: string | null;
  isHost: boolean;
  annotations: AnnotationRecord[];
  pendingQuestions: PendingQuestionRecord[];
  messages: SessionMessageRecord[];
  overlay: MapOverlayState;
  syncStatus: SyncStatusState;
  timer: SessionTimerState;
  timerSyncing: boolean;
  canControlTimer: boolean;
  isRemote: boolean;
  hasUnreadChat: boolean;
  unreadCount: number;
  hiderOutsideZone: boolean;
  truthReveal: HiderTruthRevealState | null;
  onDismissTruthReveal: () => void;
  onResetEndGame: () => void;
  onAcceptEndGame: () => void;
  onAcceptFoundHider: () => void;
  onDeclineFoundHider: () => void;
  onOpenLog: () => void;
  zoneTool: Pick<
    HiderZoneToolState,
    | "wizardOpen"
    | "hasZone"
    | "moveMode"
    | "writesEnabled"
    | "openWizard"
    | "closeWizard"
    | "startMove"
  >;
  hidingZonePanelTool: HidingZonePanelTool;
  hidingZoneRadiusLabel: string;
  onHidingZoneStepChange: (stepId: HidingZoneStepId) => void;
  onSearchThisArea: () => void;
  sheetBlocksWizard: boolean;
  wizardPeeked: boolean;
  onWizardPeekedChange: (peeked: boolean) => void;
  onOpenWizard: () => void;
  onOpenChat: () => void;
  onOpenSettings: () => void;
  onRecenter: () => void;
  expansionPackEnabled: boolean;
  expansionMenuOpen: boolean;
  onExpansionMenuOpenChange: (open: boolean) => void;
  timeTrapSheetOpen: boolean;
  onTimeTrapSheetOpenChange: (open: boolean) => void;
  timeTrapPeeked: boolean;
  onTimeTrapPeekedChange: (peeked: boolean) => void;
  timeTrapTool: Pick<
    TimeTrapToolState,
    | "query"
    | "setQuery"
    | "stations"
    | "stationsLoading"
    | "stationsError"
    | "selectedStation"
    | "setSelectedStation"
    | "confirmTrap"
    | "saving"
    | "error"
  >;
  myTrap: TimeTrapRecord | null;
  onTimeTrapSearchThisArea: () => void;
  curseSheetOpen: boolean;
  onCurseSheetOpenChange: (open: boolean) => void;
  onClearMap?: () => void;
  onResetBoard?: () => void;
  onResetSession?: () => void;
  onEndSession?: () => void;
  onLeaveSession?: () => void;
  mapSettings: {
    showCurrentLocation: boolean;
    setShowCurrentLocation: (enabled: boolean) => void;
    showAdminBoundaries: boolean;
    setShowAdminBoundaries: (enabled: boolean) => void;
    keepScreenAwake: boolean;
    setKeepScreenAwake: (enabled: boolean) => void;
    lowPowerMode: boolean;
    setLowPowerMode: (enabled: boolean) => void;
    layerVisibility: LayerVisibility;
    setLayerVisibility: (
      layer: keyof LayerVisibility,
      visible: boolean,
    ) => void;
    distanceUnit: DistanceUnit;
    mapStyle: MapStyle;
    setMapStyle: (style: MapStyle) => void;
    notificationPreferences: NotificationPreferences;
    updateNotificationPreferences: (
      patch: Partial<NotificationPreferences>,
    ) => void;
    enableNotifications: () => Promise<boolean>;
  };
  chat: {
    sessionId: string;
    questionTruths: ReadonlyMap<string, HiderTruthResult>;
    truthsLoading: boolean;
    answerError: string | null;
    onAnswerQuestion: (
      pendingQuestionId: string,
      messageId: string,
      answer: unknown,
      selectedReply: string,
      deadlineExpired?: boolean,
    ) => Promise<void>;
  };
  /** When set with desktop layout, map fills the ops shell center slot. */
  mapSlot?: ReactNode;
};

export function HiderMapScreenChrome({
  session,
  hasMyZone,
  uid,
  isHost,
  annotations,
  pendingQuestions,
  messages,
  overlay,
  syncStatus,
  timer,
  timerSyncing,
  canControlTimer,
  isRemote,
  hasUnreadChat,
  unreadCount,
  hiderOutsideZone,
  truthReveal,
  onDismissTruthReveal,
  onResetEndGame,
  onAcceptEndGame,
  onAcceptFoundHider,
  onDeclineFoundHider,
  onOpenLog,
  zoneTool,
  hidingZonePanelTool,
  hidingZoneRadiusLabel,
  onHidingZoneStepChange,
  onSearchThisArea,
  sheetBlocksWizard,
  wizardPeeked,
  onWizardPeekedChange,
  onOpenWizard,
  onOpenChat,
  onOpenSettings,
  onRecenter,
  expansionPackEnabled,
  expansionMenuOpen,
  onExpansionMenuOpenChange,
  timeTrapSheetOpen,
  onTimeTrapSheetOpenChange,
  timeTrapPeeked,
  onTimeTrapPeekedChange,
  timeTrapTool,
  myTrap,
  onTimeTrapSearchThisArea,
  curseSheetOpen,
  onCurseSheetOpenChange,
  onClearMap,
  onResetBoard,
  onResetSession,
  onEndSession,
  onLeaveSession,
  mapSettings,
  chat,
  mapSlot,
}: HiderMapScreenChromeProps) {
  const onSyncErrorAction = useSyncRetryAction();
  const gameOverActions = useGameOverActions(session, overlay);
  const isDesktop = useDesktopLayout();
  const toolLayout = isDesktop ? "rail" : "dock";

  const railActiveTab: ContextualRailTab | null =
    overlay.sheet === "none" ? null : overlay.sheet;

  const handleSelectRailTab = (tab: ContextualRailTab) => {
    switch (tab) {
      case "settings":
        onOpenSettings();
        return;
      case "chat":
        onOpenChat();
        return;
      case "log":
        onOpenLog();
        return;
      default: {
        const _exhaustive: never = tab;
        return _exhaustive;
      }
    }
  };

  const contextualRail = isDesktop ? (
    <ContextualRail
      open={overlay.sheet !== "none"}
      activeTab={railActiveTab}
      onClose={overlay.closeSheet}
      onSelectTab={handleSelectRailTab}
    />
  ) : null;

  const statusRail = (
    <>
      <HiderTruthRevealBanner
        reveal={truthReveal}
        onDismiss={onDismissTruthReveal}
      />
      <MapStatusRail
        sessionCode={session.code}
        sessionRules={session}
        playerRole="hider"
        expanded={isDesktop}
        activeTool="none"
        syncStatus={syncStatus.status}
        queuedWrites={syncStatus.queuedWrites}
        message={syncStatus.remoteUpdateNotice ?? syncStatus.lastSyncError}
        timerState={timer.timerState}
        timerRunning={timer.running}
        timerHasStarted={timer.hasStarted}
        timerSyncing={timerSyncing}
        canStartGame={canControlTimer}
        onStartGame={timer.start}
        onTimerStart={timer.start}
        onTimerPause={timer.pause}
        onTimerReset={timer.reset}
        timerControlsDisabled={!canControlTimer}
        onOpenLog={onOpenLog}
        pendingQuestions={pendingQuestions}
        closeTimerMenu={overlay.sheet !== "none" || zoneTool.wizardOpen}
        endGameActive={isEndGameActive(session)}
        endGamePending={isEndGamePending(session)}
        endGameRequestedByUid={session.endGameRequestedByUid}
        foundHiderPending={isFoundHiderPending(session)}
        foundRequestedByUid={session.foundRequestedByUid}
        myUid={uid ?? undefined}
        isHost={isHost}
        onResetEndGame={() => void onResetEndGame()}
        onAcceptEndGame={() => void onAcceptEndGame()}
        onAcceptFoundHider={() => void onAcceptFoundHider()}
        onDeclineFoundHider={() => void onDeclineFoundHider()}
        hiderOutsideZone={hiderOutsideZone}
        onSyncErrorAction={onSyncErrorAction}
      />
      <FirestorePersistenceBanner />
      <AppUpdateMapChip />
    </>
  );

  const toolDock = (
    <HiderToolDock
      layout={toolLayout}
      zoneLabel={
        !zoneTool.hasZone || zoneTool.wizardOpen
          ? hasMyZone
            ? "Change zone"
            : "Set zone"
          : "Play move"
      }
      onZoneAction={
        !zoneTool.hasZone || zoneTool.wizardOpen
          ? onOpenWizard
          : () => void zoneTool.startMove()
      }
      zoneDisabled={!zoneTool.writesEnabled}
      showExpansion={expansionPackEnabled}
      onExpansion={() => onExpansionMenuOpenChange(true)}
      onRecenter={onRecenter}
      onOpenChat={onOpenChat}
      onOpenSettings={onOpenSettings}
      hasUnreadChat={hasUnreadChat}
      unreadCount={unreadCount}
    />
  );

  return (
    <ContextualRailPanelProvider>
      {isDesktop && mapSlot ? (
        <DesktopOpsShell
          status={statusRail}
          tools={toolDock}
          map={mapSlot}
          contextual={contextualRail}
        />
      ) : (
        <div className="map-chrome-hud pointer-events-none fixed inset-0 z-[var(--z-dock)] overflow-visible">
          {statusRail}
          {toolDock}
        </div>
      )}

      <GameOverChrome
        sessionId={session.id}
        playerRole="hider"
        myUid={uid ?? undefined}
        actions={gameOverActions}
      />

      <HiderZoneWizardShell
        open={zoneTool.wizardOpen && !sheetBlocksWizard}
        peeked={wizardPeeked}
        onPeekedChange={onWizardPeekedChange}
        peekLabel={
          zoneTool.moveMode
            ? "Move zone"
            : zoneTool.hasZone
              ? "Change zone"
              : "Set zone"
        }
        onClose={zoneTool.moveMode ? undefined : zoneTool.closeWizard}
        closeLabel="Close hiding zone"
        contentKey={zoneTool.moveMode ? "move" : "set"}
      >
        <HidingZonePanel
          wizardOpen={zoneTool.wizardOpen}
          moveMode={zoneTool.moveMode}
          radiusLabel={hidingZoneRadiusLabel}
          confirmDisabled={!zoneTool.writesEnabled}
          zoneTool={hidingZonePanelTool}
          onStepChange={onHidingZoneStepChange}
          onSearchThisArea={onSearchThisArea}
        />
      </HiderZoneWizardShell>

      <ChatPanel
        open={overlay.isChatOpen}
        onClose={overlay.closeSheet}
        bottomClassName="jl-panel-hider-wizard"
        messages={messages}
        pendingQuestions={pendingQuestions}
        sessionRules={session}
        sessionId={session.id}
        senderUid={uid ?? ""}
        senderRole="hider"
        isHider
        questionTruths={chat.questionTruths}
        truthsLoading={chat.truthsLoading}
        answerError={chat.answerError}
        onAnswerQuestion={chat.onAnswerQuestion}
      />

      <MapSettingsSheet
        key={overlay.isSettingsOpen ? "open" : "closed"}
        open={overlay.isSettingsOpen}
        onClose={overlay.closeSheet}
        pendingWrites={0}
        general={{
          showCurrentLocation: mapSettings.showCurrentLocation,
          onShowCurrentLocationChange: mapSettings.setShowCurrentLocation,
          showAdminBoundaries: mapSettings.showAdminBoundaries,
          onShowAdminBoundariesChange: mapSettings.setShowAdminBoundaries,
          keepScreenAwake: mapSettings.keepScreenAwake,
          onKeepScreenAwakeChange: mapSettings.setKeepScreenAwake,
          lowPowerMode: mapSettings.lowPowerMode,
          onLowPowerModeChange: mapSettings.setLowPowerMode,
          distanceUnit: mapSettings.distanceUnit,
          onDistanceUnitChange: () => {},
          distanceUnitEditable: false,
          mapStyle: mapSettings.mapStyle,
          onMapStyleChange: mapSettings.setMapStyle,
          locationError: null,
          transitEnabled: false,
          transitLiveEnabled: false,
          transitLiveSupported: false,
          sessionIsPremium: session.tier === "premium",
          transitRouteFilter: "all",
          metroLabel: null,
          loadingStatic: false,
          loadingLive: false,
          liveDataStale: false,
          stopCount: 0,
          routeCount: 0,
          vehicleCount: 0,
          lastUpdated: undefined,
          transitError: null,
          onToggleTransit: () => undefined,
          onToggleLiveTransit: () => undefined,
          onTransitRouteFilterChange: () => undefined,
          notificationPreferences: mapSettings.notificationPreferences,
          onNotificationPreferencesChange:
            mapSettings.updateNotificationPreferences,
          onEnableNotifications: mapSettings.enableNotifications,
        }}
        layers={{
          layerVisibility: mapSettings.layerVisibility,
          onLayerVisibilityChange: mapSettings.setLayerVisibility,
        }}
        session={{
          sessionCode: session.code,
          remoteSession: isRemote,
          onClearMap,
          endGameBlocked:
            isEndGameActive(session) || isEndGamePending(session),
          onExport: overlay.closeSheet,
          isHost,
          onResetBoard,
          onResetSession: onResetSession
            ? () => void onResetSession()
            : undefined,
          onEndSession: onEndSession ? () => void onEndSession() : undefined,
          onLeaveSession: onLeaveSession
            ? () => void onLeaveSession()
            : undefined,
          expansionPackEnabled,
        }}
      />

      <ExpansionHiderMenu
        open={expansionMenuOpen}
        onClose={() => onExpansionMenuOpenChange(false)}
        canPlaceTimeTrap={Boolean(hasMyZone && !myTrap)}
        trapPlaced={Boolean(myTrap)}
        onPlaceTimeTrap={() => {
          onExpansionMenuOpenChange(false);
          onTimeTrapSheetOpenChange(true);
        }}
        onOpenCurseReference={() => {
          onExpansionMenuOpenChange(false);
          onCurseSheetOpenChange(true);
        }}
      />

      <HiderZoneWizardShell
        open={timeTrapSheetOpen}
        peeked={timeTrapPeeked}
        onPeekedChange={onTimeTrapPeekedChange}
      >
        <div className="relative space-y-2">
          <PopupCloseButton
            label="Close time trap"
            onClick={() => onTimeTrapSheetOpenChange(false)}
          />
          <p className="font-display pr-10 text-xs font-semibold uppercase tracking-[0.12em] text-highlight">
            Time trap
          </p>
          <TimeTrapPanel
            query={timeTrapTool.query}
            onQueryChange={timeTrapTool.setQuery}
            stations={timeTrapTool.stations}
            stationsLoading={timeTrapTool.stationsLoading}
            stationsError={timeTrapTool.stationsError}
            selectedStation={timeTrapTool.selectedStation}
            onSelectStation={timeTrapTool.setSelectedStation}
            onSearchThisArea={onTimeTrapSearchThisArea}
            searchDisabled={timeTrapTool.stationsLoading}
            existingTrapStationName={myTrap?.stationName ?? null}
            onConfirm={() =>
              void timeTrapTool.confirmTrap().then(() => onTimeTrapSheetOpenChange(false))
            }
            saving={timeTrapTool.saving}
            error={timeTrapTool.error}
            bonusMinutes={myTrap?.bonusMinutes ?? 5}
          />
        </div>
      </HiderZoneWizardShell>

      <CurseReferenceSheet
        open={curseSheetOpen}
        onClose={() => onCurseSheetOpenChange(false)}
      />

      <SessionLog
        open={overlay.isLogOpen}
        annotations={annotations}
        onClose={overlay.closeSheet}
        onDelete={() => undefined}
        onEdit={overlay.closeSheet}
      />
    </ContextualRailPanelProvider>
  );
}
