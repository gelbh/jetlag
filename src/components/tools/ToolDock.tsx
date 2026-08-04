import { useRef } from "react";
import type { GameSize } from "../../domain/session/size/gameSize";
import { useVisualViewportBottomInset } from "../../hooks/layout/useVisualViewportBottomInset";
import type { SessionRulesInput } from "../../domain/session/rules";
import { resolveToolDockEnabled } from "../../domain/session/rules";
import {
  MARKUP_DOCK_TOOL_IDS,
  QUESTION_DOCK_TOOL_IDS,
} from "../../domain/map/mapTools";
import type { MapTool } from "../../state/sessionStore";
import { MapBottomChrome } from "../map/chrome/MapBottomChrome";
import { SessionIslandSlots } from "../map/chrome/SessionIslandSlots";
import {
  ToolDockHistoryBookend,
  ToolDockQuestionSlot,
  ToolDockWideActions,
} from "./ToolDockSlot";
import { ToolDockDrawMenu } from "./ToolDockOverflowMenu";
import {
  useToolDockHighlight,
  useToolDockMenus,
} from "./useToolDockState";

export type ToolDockLayout = "dock" | "rail";

interface ToolDockProps {
  activeTool: MapTool;
  sessionRules?: SessionRulesInput;
  gameSize?: GameSize;
  hasHiders?: boolean;
  onSelect: (tool: MapTool) => void;
  canUndo: boolean;
  canRedo: boolean;
  onUndo: () => void;
  onRedo: () => void;
  onOpenSettings: () => void;
  onOpenCodes?: () => void;
  onOpenReportProblem: () => void;
  onOpenChat?: () => void;
  onOpenLog?: () => void;
  hasUnreadChat?: boolean;
  unreadCount?: number;
  dismissOverflowMenus?: boolean;
  canStartEndGame?: boolean;
  onStartEndGame?: () => void;
  canRequestFoundHider?: boolean;
  onRequestFoundHider?: () => void;
  canSubmitQuestion?: boolean;
  /** Bottom dock (default) or vertical left rail inside DesktopOpsShell. */
  layout?: ToolDockLayout;
  /** Block tool activation when the session is gone. */
  inactive?: boolean;
}

export function ToolDock({
  activeTool,
  sessionRules,
  gameSize = "medium",
  hasHiders = false,
  onSelect,
  canUndo,
  canRedo,
  onUndo,
  onRedo,
  onOpenSettings,
  onOpenCodes,
  onOpenReportProblem,
  onOpenChat,
  onOpenLog,
  hasUnreadChat = false,
  unreadCount = 0,
  dismissOverflowMenus = false,
  canStartEndGame = false,
  onStartEndGame,
  canRequestFoundHider = false,
  onRequestFoundHider,
  canSubmitQuestion = true,
  layout = "dock",
  inactive = false,
}: ToolDockProps) {
  const dockRef = useRef<HTMLDivElement>(null);
  const mainGroupRef = useRef<HTMLDivElement>(null);
  const isRail = layout === "rail";
  const viewportBottomInset = useVisualViewportBottomInset(!isRail);
  const { drawMenuOpen, setDrawMenuOpen, closeMenus } =
    useToolDockMenus(dockRef);

  const drawMenuVisible = drawMenuOpen && !dismissOverflowMenus;
  const markupActive = MARKUP_DOCK_TOOL_IDS.some((toolId) => activeTool === toolId);
  const rulesInput = sessionRules ?? { gameSize };
  const visibleQuestionTools = QUESTION_DOCK_TOOL_IDS.filter((toolId) =>
    resolveToolDockEnabled(rulesInput, toolId, { hasHiders }),
  );
  const dockHighlight = useToolDockHighlight(
    mainGroupRef,
    activeTool,
    viewportBottomInset,
    visibleQuestionTools.length,
  );

  const selectTool = (tool: MapTool) => {
    if (inactive) {
      return;
    }
    onSelect(activeTool === tool ? "none" : tool);
    closeMenus();
  };

  return (
    <MapBottomChrome
      ref={dockRef}
      layout={isRail ? "rail" : "phone"}
      inactive={inactive}
      style={
        !isRail && viewportBottomInset > 0
          ? { bottom: `${viewportBottomInset}px` }
          : undefined
      }
      historyStart={
        <ToolDockHistoryBookend
          kind="undo"
          canAct={canUndo}
          onAct={onUndo}
          inactive={inactive}
        />
      }
      historyEnd={
        <ToolDockHistoryBookend
          kind="redo"
          canAct={canRedo}
          onAct={onRedo}
          inactive={inactive}
        />
      }
      hunt={
        <div className="jl-map-island-hunt-inner">
          {dockHighlight ? (
            <div
              aria-hidden={true}
              className="jl-tool-dock-highlight"
              style={{
                transform: `translate(${dockHighlight.x}px, ${dockHighlight.y}px)`,
                width: dockHighlight.width,
                height: dockHighlight.height,
              }}
            />
          ) : null}
          <div
            ref={mainGroupRef}
            className="jl-tool-dock-group jl-tool-dock-group-main"
            aria-label="Question tools"
          >
            {visibleQuestionTools.map((toolId) => (
              <ToolDockQuestionSlot
                key={toolId}
                toolId={toolId}
                activeTool={activeTool}
                canSubmitQuestion={canSubmitQuestion}
                onSelect={selectTool}
              />
            ))}
            <ToolDockWideActions
              drawMenuOpen={drawMenuOpen}
              markupActive={markupActive}
              inactive={inactive}
              onToggleDrawMenu={() => {
                if (inactive) {
                  return;
                }
                setDrawMenuOpen((open) => !open);
              }}
            />
          </div>
        </div>
      }
      session={
        <SessionIslandSlots
          onOpenChat={onOpenChat}
          onOpenLog={onOpenLog}
          onOpenReportProblem={onOpenReportProblem}
          onOpenSettings={onOpenSettings}
          onOpenCodes={onOpenCodes}
          hasUnreadChat={hasUnreadChat}
          unreadCount={unreadCount}
          inactive={inactive}
          canStartEndGame={canStartEndGame}
          onStartEndGame={onStartEndGame}
          canRequestFoundHider={canRequestFoundHider}
          onRequestFoundHider={onRequestFoundHider}
        />
      }
      overlay={
        <ToolDockDrawMenu
          open={drawMenuVisible}
          activeTool={activeTool}
          onSelect={selectTool}
        />
      }
    />
  );
}
