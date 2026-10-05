import type { RefObject } from "react";
import { ChatPanel } from "../../components/chat/ChatPanel";
import { CurseReferenceSheet } from "../../components/expansion/CurseReferenceSheet";
import { ExpansionHiderMenu } from "../../components/hider/ExpansionHiderMenu";
import { HiderZoneWizardShell } from "../../components/hider/HiderZoneWizardShell";
import type { HidingZoneStepId } from "../../components/hider/hidingZoneSteps";
import { TimeTrapPanel } from "../../components/hider/TimeTrapPanel";
import { HotfixGraceChip } from "../../components/incident/HotfixGraceChip";
import { ReportProblemSheet } from "../../components/incident/ReportProblemSheet";
import { FirestorePersistenceBanner } from "../../components/session/banners/FirestorePersistenceBanner";
import type { HiderTruthRevealState } from "../../components/session/banners/HiderTruthRevealBanner";
import { HiderTruthRevealBanner } from "../../components/session/banners/HiderTruthRevealBanner";
import { QuestionAlertBanner } from "../../components/session/banners/QuestionAlertBanner";
import { GameOverChrome } from "../../components/session/game-over/GameOverChrome";
import { SessionLog } from "../../components/session/log/SessionLog";
import { MapSettingsSheet } from "../../components/session/mapChrome/MapSettingsSheet";
import { MapStatusRail } from "../../components/session/mapChrome/MapStatusRail";
import { RoleCodesSheet } from "../../components/session/settings/RoleCodesSheet";
import { AskHudHost } from "../../components/tools/ask/AskHudHost";
import { HidingZoneHudBody } from "../../components/tools/ask/hiding-zone/HidingZoneHudBody";
import { HidingZoneMapPlacementChrome } from "../../components/tools/ask/hiding-zone/HidingZoneMapPlacementChrome";
import { HiderToolDock } from "../../components/tools/HiderToolDock";
import { PopupCloseButton } from "../../components/ui/brand/PopupCloseButton";
import { activeModeCue } from "../../domain/ask/askHudModes";
import type { TimeTrapRecord } from "../../domain/expansion/timeTraps";
import type { LatLngTuple } from "../../domain/geometry/gameArea/geometry";
import type { AnnotationRecord, SessionRecord } from "../../domain/map/annotations";
import { isEndGameActive, isFoundHiderPending } from "../../domain/map/annotations";
import type { DistanceUnit } from "../../domain/map/distance";
import type { MapStyle, StreetBasemap } from "../../domain/map/mapBasemaps";
import type { HiderTruthReferenceMode } from "../../domain/questions/hiderTruth/resolveHiderTruthReference";
import type { HiderTruthResult } from "../../domain/questions/ui";
import type {
  PendingQuestionRecord,
  SessionMessageRecord,
} from "../../domain/session/activity/sessionChat";
import { visibleRoleCodeRoles } from "../../domain/session/players/roleGates";
import { useDevMockSessionFeed } from "../../hooks/dev/useDevMockSessionFeed";
import type { useMapOverlayState } from "../../hooks/map/useMapOverlayState";
import { useGameOverActions } from "../../hooks/session/useGameOverActions";
import type { useHiderZoneTool } from "../../hooks/session/useHiderZoneTool";
import { useMapTerminalSessionChrome } from "../../hooks/session/useMapTerminalSessionChrome";
import type { useSessionTimer } from "../../hooks/session/useSessionTimer";
import type { useTimeTrapTool } from "../../hooks/session/useTimeTrapTool";
import type { useSyncStatus } from "../../hooks/sync/useSyncStatus";
import { useAnnotationStore } from "../../state/annotationStore";
import type { LayerVisibility } from "../../state/sessionStore";
import { MapScreenChromeSlots } from "../map-screen/shared/MapScreenChromeSlots";
import { getMapScreenRoleConfig } from "../map-screen/shared/mapScreenRoleConfig";
// ponytail yagni waiver: keep named helper + matrix tests (1 call site, readiness-reviewed).
import { isHidingZoneMapFirstEligible } from "./hidingZoneMapFirst";

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

/** Chrome bag for hider map. Full `useHiderMapScreenController` deferred: extract ~800 LOC would blow jumbo soft-gate. */
export type HiderMapScreenController = {
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
  moveInProgress?: boolean;
  isRemote: boolean;
  hasUnreadChat: boolean;
  unreadCount: number;
  hiderOutsideZone: boolean;
  truthReveal: HiderTruthRevealState | null;
  onDismissTruthReveal: () => void;
  onResetEndGame: () => void;
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
  onOpenWizard: () => void;
  onOpenChat: () => void;
  onOpenSettings: () => void;
  onOpenCodes: () => void;
  /** Board economy: Hand control next to Set zone. */
  handLabel?: string;
  onOpenHand?: () => void;
  /** When economy is on, Move only if a Move card is in hand. */
  boardEconomyEnabled?: boolean;
  hasMoveCard?: boolean;
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
    setLayerVisibility: (layer: keyof LayerVisibility, visible: boolean) => void;
    distanceUnit: DistanceUnit;
    mapStyle: MapStyle;
    setMapStyle: (style: MapStyle) => void;
    streetBasemap: StreetBasemap;
    setStreetBasemap: (theme: StreetBasemap) => void;
    locationError?: string | null;
  };
  chat: {
    sessionId: string;
    questionTruths: ReadonlyMap<string, HiderTruthResult>;
    truthsLoading: boolean;
    truthReferenceModes?: ReadonlyMap<string, HiderTruthReferenceMode>;
    answerError: string | null;
    answerSubmitting?: boolean;
    answeredPendingIds?: ReadonlySet<string>;
    onAnswerQuestion: (
      pendingQuestionId: string,
      messageId: string,
      answer: unknown,
      selectedReply: string,
      deadlineExpired?: boolean,
    ) => Promise<void>;
  };
  /** HUD root for pan-hide (`data-map-interacting`): same as seeker. */
  chromeHudRef?: RefObject<HTMLDivElement | null>;
};

export type HiderMapScreenChromeProps = {
  controller: HiderMapScreenController;
};

export function HiderMapScreenChrome({ controller }: HiderMapScreenChromeProps) {
  const {
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
    moveInProgress = false,
    isRemote,
    hasUnreadChat,
    unreadCount,
    hiderOutsideZone,
    truthReveal,
    onDismissTruthReveal,
    onResetEndGame,
    onAcceptFoundHider,
    onDeclineFoundHider,
    onOpenLog,
    zoneTool,
    hidingZonePanelTool,
    hidingZoneRadiusLabel,
    onHidingZoneStepChange,
    onSearchThisArea,
    sheetBlocksWizard,
    onOpenWizard,
    onOpenChat,
    onOpenSettings,
    onOpenCodes,
    handLabel,
    onOpenHand,
    boardEconomyEnabled = false,
    hasMoveCard = false,
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
    chromeHudRef,
  } = controller;
  const { messages: displayMessages, pendingQuestions: displayPendingQuestions } =
    useDevMockSessionFeed(session.id, messages, pendingQuestions);
  const syncMessage = syncStatus.remoteUpdateNotice ?? syncStatus.lastSyncError;
  const { inactiveChrome, terminalSessionError, onReturnToJoin, onSyncRetry } =
    useMapTerminalSessionChrome({
      syncMessage,
      sessionId: session.id,
      closeOverlays: overlay.closeSheet,
    });
  const onSyncErrorAction = onSyncRetry;
  const gameOverActions = useGameOverActions(session, {
    closeSheet: overlay.closeAllSheets,
  });
  const roleConfig = getMapScreenRoleConfig("hider");
  const setSelectedAnnotationId = useAnnotationStore((state) => state.setSelectedAnnotationId);
  const markAnnotationPulse = useAnnotationStore((state) => state.markAnnotationPulse);

  const statusRail = (
    <>
      <HiderTruthRevealBanner reveal={truthReveal} onDismiss={onDismissTruthReveal} />
      <MapStatusRail
        model={{
          sessionCode: session.code,
          sessionId: session.id,
          roleGates: session.roleGates,
          sessionRules: session,
          playerRole: roleConfig.statusPlayerRole,
          expanded: false,
          activeTool: "none",
          syncStatus: syncStatus.status,
          queuedWrites: syncStatus.queuedWrites,
          message: syncMessage,
          timerState: timer.timerState,
          timerRunning: timer.running,
          timerHasStarted: timer.hasStarted,
          timerSyncing,
          canStartGame: canControlTimer,
          onStartGame: timer.start,
          onTimerStart: timer.start,
          onTimerPause: timer.pause,
          onTimerReset: timer.reset,
          timerControlsDisabled: !canControlTimer || inactiveChrome,
          moveInProgress,
          onOpenLog,
          pendingQuestions: displayPendingQuestions,
          closeTimerMenu: overlay.sheet !== "none" || zoneTool.wizardOpen,
          endGameActive: isEndGameActive(session),
          foundHiderPending: isFoundHiderPending(session),
          foundRequestedByUid: session.foundRequestedByUid,
          myUid: uid ?? undefined,
          isHost,
          onResetEndGame: () => void onResetEndGame(),
          onAcceptFoundHider: () => void onAcceptFoundHider(),
          onDeclineFoundHider: () => void onDeclineFoundHider(),
          hiderOutsideZone,
          onSyncErrorAction,
          inactiveChrome,
          terminalSessionError,
          onReturnToJoin,
        }}
      />
      <FirestorePersistenceBanner />
      <HotfixGraceChip />
    </>
  );

  const canOpenCodes =
    Boolean(uid) &&
    visibleRoleCodeRoles({
      roleGates: session.roleGates,
      memberRoles: session.memberRoles,
      myUid: uid ?? undefined,
      isHost,
    }).length > 0;

  const canPlayMove =
    zoneTool.hasZone && !zoneTool.wizardOpen && (!boardEconomyEnabled || hasMoveCard);
  const zoneLabel =
    !zoneTool.hasZone || zoneTool.wizardOpen
      ? hasMyZone
        ? "Change zone"
        : "Set zone"
      : canPlayMove
        ? "Play move"
        : hasMyZone
          ? "Change zone"
          : "Set zone";
  const onZoneAction = canPlayMove
    ? () => {
        void zoneTool.startMove();
      }
    : onOpenWizard;

  const hidingZoneSurface = zoneTool.moveMode
    ? ("hiding-zone-move" as const)
    : ("hiding-zone-create" as const);
  const hidingZoneCue = activeModeCue({
    surface: hidingZoneSurface,
    placementReady: hidingZonePanelTool.hasPlacement,
    configureReady: zoneTool.moveMode || hidingZonePanelTool.methodChosen,
    resolveReady: true,
  });

  const mapFirstEligible = isHidingZoneMapFirstEligible({
    wizardOpen: zoneTool.wizardOpen,
    sheetBlocksWizard,
    moveMode: zoneTool.moveMode,
    methodChosen: hidingZonePanelTool.methodChosen,
  });

  const toolDock = (
    <HiderToolDock
      zoneLabel={zoneLabel}
      onZoneAction={onZoneAction}
      zoneDisabled={!zoneTool.writesEnabled || inactiveChrome}
      handLabel={handLabel}
      onOpenHand={onOpenHand}
      inactive={inactiveChrome}
      showExpansion={expansionPackEnabled}
      onExpansion={() => onExpansionMenuOpenChange(true)}
      onOpenChat={onOpenChat}
      onOpenLog={onOpenLog}
      onOpenSettings={onOpenSettings}
      onOpenCodes={canOpenCodes ? onOpenCodes : undefined}
      onOpenReportProblem={() => {
        overlay.pushSheet("report-problem");
      }}
      hasUnreadChat={hasUnreadChat}
      unreadCount={unreadCount}
    />
  );

  return (
    <MapScreenChromeSlots chromeHudRef={chromeHudRef} header={statusRail} toolbar={toolDock}>
      <GameOverChrome
        sessionId={session.id}
        playerRole={roleConfig.statusPlayerRole}
        myUid={uid ?? undefined}
        actions={gameOverActions}
      />

      <QuestionAlertBanner
        pendingQuestions={displayPendingQuestions}
        messages={displayMessages}
        sessionRules={session}
        sessionId={chat.sessionId || session.id}
        questionTruths={chat.questionTruths}
        truthsLoading={chat.truthsLoading}
        truthReferenceModes={chat.truthReferenceModes}
        answerError={chat.answerError}
        answerSubmitting={chat.answerSubmitting}
        answeredPendingIds={chat.answeredPendingIds}
        onAnswerQuestion={chat.onAnswerQuestion}
      />

      {mapFirstEligible ? (
        <HidingZoneMapPlacementChrome
          moveMode={zoneTool.moveMode}
          radiusLabel={hidingZoneRadiusLabel}
          zoneTool={hidingZonePanelTool}
          onStepChange={onHidingZoneStepChange}
          onSearchThisArea={onSearchThisArea}
          writesEnabled={zoneTool.writesEnabled}
          onDismiss={zoneTool.moveMode ? undefined : zoneTool.closeWizard}
          onBackToMethod={
            zoneTool.moveMode
              ? undefined
              : () => {
                  zoneTool.openWizard();
                }
          }
        />
      ) : zoneTool.wizardOpen && !sheetBlocksWizard ? (
        <AskHudHost
          cue={hidingZoneCue}
          toolLabel={zoneTool.moveMode ? "Move zone" : "Hiding zone"}
          costLabel={null}
          showCostChip={false}
          canCommit={false}
          commitLabel="CONFIRM"
          onCommit={() => undefined}
          isSubmitting={false}
          error={hidingZonePanelTool.error}
          modeBody={
            <HidingZoneHudBody
              moveMode={zoneTool.moveMode}
              zoneTool={hidingZonePanelTool}
              onStepChange={onHidingZoneStepChange}
              onDismiss={zoneTool.moveMode ? undefined : zoneTool.closeWizard}
            />
          }
        />
      ) : null}

      <ChatPanel
        model={{
          open: overlay.isChatOpen,
          onClose: overlay.closeSheet,
          bottomClassName: "jl-panel-hider-wizard",
          messages: displayMessages,
          pendingQuestions: displayPendingQuestions,
          sessionRules: session,
          sessionId: session.id,
          senderUid: uid ?? "",
          senderRole: "hider",
          isHider: true,
          questionTruths: chat.questionTruths,
          truthsLoading: chat.truthsLoading,
          truthReferenceModes: chat.truthReferenceModes,
          answerError: chat.answerError,
          answerSubmitting: chat.answerSubmitting,
          answeredPendingIds: chat.answeredPendingIds,
          onAnswerQuestion: chat.onAnswerQuestion,
        }}
      />

      <MapSettingsSheet
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
          streetBasemap: mapSettings.streetBasemap,
          onStreetBasemapChange: mapSettings.setStreetBasemap,
          locationError: mapSettings.locationError ?? null,
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
        }}
        layers={{
          layerVisibility: mapSettings.layerVisibility,
          onLayerVisibilityChange: mapSettings.setLayerVisibility,
        }}
        session={{
          sessionCode: session.code,
          remoteSession: isRemote,
          session,
          myUid: uid ?? undefined,
          onClearMap,
          endGameBlocked: isEndGameActive(session),
          onExport: () => {
            overlay.closeAllSheets();
          },
          isHost,
          onResetBoard,
          onResetSession: onResetSession ? () => void onResetSession() : undefined,
          onEndSession: onEndSession ? () => void onEndSession() : undefined,
          onLeaveSession: onLeaveSession ? () => void onLeaveSession() : undefined,
          expansionPackEnabled,
          onOpenCurseReference: () => {
            overlay.pushSheet("curse-reference");
          },
        }}
        onReportProblem={() => {
          overlay.pushSheet("report-problem");
        }}
      />

      {uid ? (
        <RoleCodesSheet
          open={overlay.isCodesOpen}
          onClose={overlay.closeSheet}
          session={session}
          myUid={uid}
          isHost={isHost}
        />
      ) : null}

      <ReportProblemSheet open={overlay.isReportProblemOpen} onClose={overlay.closeSheet} />

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
          overlay.pushSheet("curse-reference");
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
            onConfirm={() => {
              if (timeTrapTool.confirmTrap()) {
                onTimeTrapSheetOpenChange(false);
              }
            }}
            error={timeTrapTool.error}
            bonusMinutes={myTrap?.bonusMinutes ?? 5}
          />
        </div>
      </HiderZoneWizardShell>

      <CurseReferenceSheet
        open={overlay.isCurseReferenceOpen || curseSheetOpen}
        onClose={() => {
          if (overlay.isCurseReferenceOpen) {
            overlay.closeSheet();
          }
          onCurseSheetOpenChange(false);
        }}
      />

      <SessionLog
        open={overlay.isLogOpen}
        sessionId={session.id}
        annotations={annotations}
        onClose={overlay.closeSheet}
        onDelete={() => undefined}
        onEdit={() => undefined}
        readOnly
        onSelect={(id) => {
          overlay.closeSheet();
          setSelectedAnnotationId(id);
          markAnnotationPulse(id);
        }}
      />
    </MapScreenChromeSlots>
  );
}
