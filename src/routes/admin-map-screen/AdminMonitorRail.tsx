import { useMemo } from "react";
import type { SessionRecord } from "../../domain/map/annotations";
import type { SessionRulesInput } from "../../domain/session/sessionRules";
import type { PlayerRole } from "../../domain/session/playerRole";
import type { LayerVisibility } from "../../state/sessionStore";
import type { MapViewportState } from "../../components/map/MapViewportTracker";
import type { ObserverMapScreenController } from "../observer-map-screen/useObserverMapScreen";
import { SessionLogBody } from "../../components/session/SessionLogBody";
import { ChatPanelBody } from "../../components/chat/ChatPanelBody";
import { HudChevronLeftIcon, HudChevronRightIcon } from "../../components/ui/HudIcons";
import { OverviewPanel } from "./panels/OverviewPanel";
import { SyncPanel } from "./panels/SyncPanel";
import { MapPanel } from "./panels/MapPanel";
import { ModPanel } from "./panels/ModPanel";

export type AdminMonitorRailTab =
  | "overview"
  | "log"
  | "chat"
  | "sync"
  | "map"
  | "mod";

const TABS: Array<{ id: AdminMonitorRailTab; label: string; short: string }> = [
  { id: "overview", label: "Overview", short: "Ov" },
  { id: "log", label: "Log", short: "Log" },
  { id: "chat", label: "Chat", short: "Chat" },
  { id: "sync", label: "Sync", short: "Sync" },
  { id: "map", label: "Map", short: "Map" },
  { id: "mod", label: "Mod", short: "Mod" },
];

interface AdminMonitorRailProps {
  collapsed: boolean;
  onCollapsedChange: (collapsed: boolean) => void;
  activeTab: AdminMonitorRailTab;
  onActiveTabChange: (tab: AdminMonitorRailTab) => void;
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

export function AdminMonitorRail({
  collapsed,
  onCollapsedChange,
  activeTab,
  onActiveTabChange,
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
}: AdminMonitorRailProps) {
  const activeLabel = useMemo(
    () => TABS.find((tab) => tab.id === activeTab)?.label ?? "Overview",
    [activeTab],
  );

  return (
    <aside
      className={`admin-monitor-rail admin-map-shell__rail ${
        collapsed ? "admin-monitor-rail--collapsed" : ""
      }`}
      aria-label="Admin monitor rail"
    >
      <div className="admin-monitor-rail__header">
        <button
          type="button"
          className="hud-chrome inline-flex min-h-9 min-w-9 items-center justify-center"
          aria-label={collapsed ? "Expand monitor rail" : "Collapse monitor rail"}
          aria-expanded={!collapsed}
          onClick={() => onCollapsedChange(!collapsed)}
        >
          {collapsed ? (
            <HudChevronLeftIcon className="size-4" />
          ) : (
            <HudChevronRightIcon className="size-4" />
          )}
        </button>
        {!collapsed ? (
          <span className="min-w-0 truncate font-display text-xs font-semibold uppercase tracking-wide text-ink">
            {activeLabel}
          </span>
        ) : null}
      </div>

      {collapsed ? (
        <nav className="flex flex-1 flex-col gap-1 p-1" aria-label="Monitor tabs">
          {TABS.map((tab) => (
            <button
              key={tab.id}
              type="button"
              className={`admin-monitor-rail__icon-tab ${
                activeTab === tab.id ? "admin-monitor-rail__icon-tab--active" : ""
              }`}
              aria-label={tab.label}
              aria-current={activeTab === tab.id ? "page" : undefined}
              onClick={() => {
                onActiveTabChange(tab.id);
                onCollapsedChange(false);
              }}
            >
              {tab.short}
            </button>
          ))}
        </nav>
      ) : (
        <>
          <div
            className="admin-monitor-rail__tabs"
            role="tablist"
            aria-label="Monitor sections"
          >
            {TABS.map((tab) => (
              <button
                key={tab.id}
                type="button"
                role="tab"
                aria-selected={activeTab === tab.id}
                className={`admin-monitor-rail__tab ${
                  activeTab === tab.id ? "admin-monitor-rail__tab--active" : ""
                }`}
                onClick={() => onActiveTabChange(tab.id)}
              >
                {tab.label}
              </button>
            ))}
          </div>

          <div
            className="admin-monitor-rail__panel"
            role="tabpanel"
            aria-label={activeLabel}
          >
            {activeTab === "overview" ? (
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
            ) : null}

            {activeTab === "log" ? (
              <SessionLogBody
                annotations={controller.annotations}
                onDelete={() => undefined}
                onEdit={() => undefined}
                readOnly
                compact
              />
            ) : null}

            {activeTab === "chat" && controller.sessionId && controller.uid ? (
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
            ) : null}

            {activeTab === "sync" ? (
              <SyncPanel
                status={controller.syncStatus.status}
                queuedWrites={controller.syncStatus.queuedWrites}
                lastSyncError={controller.syncStatus.lastSyncError}
                remoteUpdateNotice={controller.syncStatus.remoteUpdateNotice}
              />
            ) : null}

            {activeTab === "map" ? (
              <MapPanel
                mapViewport={mapViewport}
                layerVisibility={controller.layerVisibility}
                effectiveBasemapStyle={controller.effectiveBasemapStyle}
                lowPowerMode={controller.lowPowerMode}
                onLayerVisibilityChange={onLayerVisibilityChange}
                onMapStyleChange={controller.handleMapStyleChange}
                onLowPowerModeChange={onLowPowerModeChange}
              />
            ) : null}

            {activeTab === "mod" ? (
              <ModPanel
                moderationBusy={moderationBusy}
                moderationError={moderationError}
                onModerationAction={onModerationAction}
              />
            ) : null}
          </div>
        </>
      )}
    </aside>
  );
}
