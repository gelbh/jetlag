import { ActionIcon, Box, Divider, Group, ScrollArea, Stack, Tabs, Text } from "@mantine/core";
import { ChatPanelBody } from "../../components/chat/ChatPanelBody";
import type { MapViewportState } from "../../components/map/chrome/MapViewportTracker";
import { SessionLogBody } from "../../components/session/log/SessionLogBody";
import { HudChevronLeftIcon, HudChevronRightIcon } from "../../components/ui/brand/HudIcons";
import type { SessionRecord } from "../../domain/map/annotations";
import type { PlayerRole } from "../../domain/session/players/playerRole";
import type { SessionRulesInput } from "../../domain/session/rules";
import { useSessionActivityLog } from "../../hooks/session/useSessionActivityLog";
import { useAnnotationStore } from "../../state/annotationStore";
import type { LayerVisibility } from "../../state/sessionStore";
import type { ObserverMapScreenController } from "../observer-map-screen/useObserverMapScreen";
import { MapPanel } from "./panels/MapPanel";
import { ModPanel } from "./panels/ModPanel";
import { OverviewPanel } from "./panels/OverviewPanel";
import { SyncPanel } from "./panels/SyncPanel";

export type AdminMonitorRailTab = "overview" | "log" | "chat" | "sync" | "map" | "mod";

const TABS: Array<{ id: AdminMonitorRailTab; label: string; short: string }> = [
  { id: "overview", label: "Overview", short: "Ov" },
  { id: "log", label: "Log", short: "Log" },
  { id: "chat", label: "Chat", short: "Chat" },
  { id: "sync", label: "Sync", short: "Sync" },
  { id: "map", label: "Map", short: "Map" },
  { id: "mod", label: "Mod", short: "Mod" },
];

// The rail is a fixed-height column: the list stays put and the active panel scrolls.
const TAB_LAYOUT = {
  root: { display: "flex", flexDirection: "column", flex: 1, minHeight: 0 },
  panel: { flex: 1, minHeight: 0 },
} as const;

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
  onLayerVisibilityChange: (layer: keyof LayerVisibility, visible: boolean) => void;
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
  const events = useSessionActivityLog(session.id);
  const setSelectedAnnotationId = useAnnotationStore((state) => state.setSelectedAnnotationId);
  const markAnnotationPulse = useAnnotationStore((state) => state.markAnnotationPulse);
  const activeLabel = TABS.find((tab) => tab.id === activeTab)?.label ?? "Overview";

  return (
    <Group
      component="aside"
      className="admin-map-shell__rail"
      aria-label="Admin monitor rail"
      h="100%"
      gap={0}
      wrap="nowrap"
      align="stretch"
      bg="var(--mantine-color-body)"
    >
      <Divider orientation="vertical" />
      <Stack gap={0} flex={1} miw={0} mih={0}>
        <Group h={44} px={6} gap="xs" wrap="nowrap" flex="none">
          <ActionIcon
            variant="subtle"
            aria-label={collapsed ? "Expand monitor rail" : "Collapse monitor rail"}
            aria-expanded={!collapsed}
            onClick={() => onCollapsedChange(!collapsed)}
          >
            {collapsed ? (
              <HudChevronLeftIcon width={16} height={16} aria-hidden="true" />
            ) : (
              <HudChevronRightIcon width={16} height={16} aria-hidden="true" />
            )}
          </ActionIcon>
          {collapsed ? null : (
            <Text fw={700} truncate>
              {activeLabel}
            </Text>
          )}
        </Group>
        <Divider />

        {collapsed ? (
          <Stack component="nav" aria-label="Monitor tabs" gap={4} p={4}>
            {TABS.map((tab) => (
              <ActionIcon
                key={tab.id}
                variant={activeTab === tab.id ? "filled" : "subtle"}
                w="100%"
                size="lg"
                aria-label={tab.label}
                aria-current={activeTab === tab.id ? "page" : undefined}
                onClick={() => {
                  onActiveTabChange(tab.id);
                  onCollapsedChange(false);
                }}
              >
                <Text fz={11} fw={700} inherit>
                  {tab.short}
                </Text>
              </ActionIcon>
            ))}
          </Stack>
        ) : (
          <Tabs
            value={activeTab}
            onChange={(value) => value && onActiveTabChange(value as AdminMonitorRailTab)}
            keepMounted={false}
            styles={TAB_LAYOUT}
          >
            <Tabs.List aria-label="Monitor sections">
              {TABS.map((tab) => (
                <Tabs.Tab key={tab.id} value={tab.id}>
                  {tab.label}
                </Tabs.Tab>
              ))}
            </Tabs.List>

            <Tabs.Panel value="overview">
              <ScrollArea h="100%">
                <Box p="sm">
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
                </Box>
              </ScrollArea>
            </Tabs.Panel>

            <Tabs.Panel value="log">
              <ScrollArea h="100%">
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
              </ScrollArea>
            </Tabs.Panel>

            <Tabs.Panel value="chat">
              {controller.sessionId && controller.uid ? (
                <Box p="sm" h="100%">
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
                </Box>
              ) : null}
            </Tabs.Panel>

            <Tabs.Panel value="sync">
              <ScrollArea h="100%">
                <Box p="sm">
                  <SyncPanel
                    status={controller.syncStatus.status}
                    queuedWrites={controller.syncStatus.queuedWrites}
                    lastSyncError={controller.syncStatus.lastSyncError}
                    remoteUpdateNotice={controller.syncStatus.remoteUpdateNotice}
                  />
                </Box>
              </ScrollArea>
            </Tabs.Panel>

            <Tabs.Panel value="map">
              <ScrollArea h="100%">
                <Box p="sm">
                  <MapPanel
                    mapViewport={mapViewport}
                    layerVisibility={controller.layerVisibility}
                    effectiveBasemapStyle={controller.effectiveBasemapStyle}
                    lowPowerMode={controller.lowPowerMode}
                    onLayerVisibilityChange={onLayerVisibilityChange}
                    onMapStyleChange={controller.handleMapStyleChange}
                    onLowPowerModeChange={onLowPowerModeChange}
                  />
                </Box>
              </ScrollArea>
            </Tabs.Panel>

            <Tabs.Panel value="mod">
              <Box p="sm">
                <ModPanel
                  moderationBusy={moderationBusy}
                  moderationError={moderationError}
                  onModerationAction={onModerationAction}
                />
              </Box>
            </Tabs.Panel>
          </Tabs>
        )}
      </Stack>
    </Group>
  );
}
