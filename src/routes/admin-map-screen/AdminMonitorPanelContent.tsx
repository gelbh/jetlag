import type { SessionRecord } from "../../domain/map/annotations";
import type { SessionRulesInput } from "../../domain/session/rules";
import type { PlayerRole } from "../../domain/session/players/playerRole";
import type { LayerVisibility } from "../../state/sessionStore";
import type { MapViewportState } from "../../components/map/chrome/MapViewportTracker";
import type { ObserverMapScreenController } from "../observer-map-screen/useObserverMapScreen";
import type { MonitorPanelId } from "../../domain/admin/opsDeskLayout";
import { SessionLogBody } from "../../components/session/log/SessionLogBody";
import { ChatPanelBody } from "../../components/chat/ChatPanelBody";
import { useSessionActivityLog } from "../../hooks/session/useSessionActivityLog";
import { useAnnotationStore } from "../../state/annotationStore";
import { OverviewPanel } from "./panels/OverviewPanel";
import { SyncPanel } from "./panels/SyncPanel";
import { MapPanel } from "./panels/MapPanel";
import { ModPanel } from "./panels/ModPanel";
import { AdminMonitorMapLayers } from "./AdminMonitorMapLayers";

interface AdminMonitorPanelContentProps {
  panelId: MonitorPanelId;
  session: SessionRecord;
  sessionRules: SessionRulesInput;
  syncStatusLabel: string;
  controller: ObserverMapScreenController;
  chatDisplayRole: PlayerRole;
  moderationBusy: boolean;
  moderationError: string | null;
  onModerationAction: (action: "end" | "resetBoard" | "cleanupCode") => void;
  mapViewport: MapViewportState | null;
  onLayerVisibilityChange: (
    layer: keyof LayerVisibility,
    visible: boolean,
  ) => void;
  onLowPowerModeChange: (enabled: boolean) => void;
}

export function AdminMonitorPanelContent({
  panelId,
  session,
  sessionRules,
  syncStatusLabel,
  controller,
  chatDisplayRole,
  moderationBusy,
  moderationError,
  onModerationAction,
  mapViewport,
  onLayerVisibilityChange,
  onLowPowerModeChange,
}: AdminMonitorPanelContentProps) {
  const events = useSessionActivityLog(session.id);
  const setSelectedAnnotationId = useAnnotationStore(
    (state) => state.setSelectedAnnotationId,
  );
  const markAnnotationPulse = useAnnotationStore(
    (state) => state.markAnnotationPulse,
  );

  switch (panelId) {
    case "map":
      return (
        <div className="relative h-full min-h-0 overflow-hidden">
          <AdminMonitorMapLayers controller={controller} />
        </div>
      );
    case "overview":
      return (
        <OverviewPanel
          session={session}
          syncStatusLabel={syncStatusLabel}
          annotationCount={controller.annotations.length}
          seekerCount={controller.seekerLocations.length}
          hiderCount={controller.hiderLocations.length}
          questionCount={controller.pendingQuestions.length}
          messageCount={controller.chatMessages.length}
          timerState={controller.timer.timerState}
        />
      );
    case "log":
      return (
        <SessionLogBody
          events={events}
          annotations={controller.annotations}
          onDelete={() => undefined}
          onEdit={() => undefined}
          readOnly
          compact
          onSelect={(id) => {
            setSelectedAnnotationId(id);
            markAnnotationPulse(id);
          }}
        />
      );
    case "chat":
      return controller.sessionId && controller.uid ? (
        <ChatPanelBody
          messages={controller.chatMessages}
          pendingQuestions={controller.pendingQuestions}
          sessionRules={sessionRules}
          sessionId={controller.sessionId}
          senderUid={controller.uid}
          senderRole={chatDisplayRole}
          isHider={chatDisplayRole === "hider"}
          onAnswerQuestion={async () => undefined}
          readOnly
        />
      ) : null;
    case "sync":
      return (
        <SyncPanel
          status={controller.syncStatus.status}
          queuedWrites={controller.syncStatus.queuedWrites}
          lastSyncError={controller.syncStatus.lastSyncError}
          remoteUpdateNotice={controller.syncStatus.remoteUpdateNotice}
        />
      );
    case "mapTools":
      return (
        <MapPanel
          mapViewport={mapViewport}
          layerVisibility={controller.layerVisibility}
          effectiveBasemapStyle={controller.effectiveBasemapStyle}
          lowPowerMode={controller.lowPowerMode}
          onLayerVisibilityChange={onLayerVisibilityChange}
          onMapStyleChange={controller.handleMapStyleChange}
          onLowPowerModeChange={onLowPowerModeChange}
        />
      );
    case "mod":
      return (
        <ModPanel
          moderationBusy={moderationBusy}
          moderationError={moderationError}
          onModerationAction={onModerationAction}
        />
      );
    case "roster":
      return null;
    default: {
      const _exhaustive: never = panelId;
      return _exhaustive;
    }
  }
}
