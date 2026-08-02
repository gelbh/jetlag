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
  ToolDockHistorySlots,
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
    <div
      ref={dockRef}
      className={`jl-map-bottom-chrome-host${isRail ? " jl-map-bottom-chrome-host--rail" : ""}`}
      style={
        !isRail && viewportBottomInset > 0
          ? { bottom: `${viewportBottomInset}px` }
          : undefined
      }
    >
      <MapBottomChrome
        layout={isRail ? "rail" : "phone"}
        inactive={inactive}
        history={
          <ToolDockHistorySlots
            canUndo={canUndo}
            canRedo={canRedo}
            onUndo={onUndo}
            onRedo={onRedo}
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
            </div>
            <ToolDockWideActions
              drawMenuOpen={drawMenuOpen}
              markupActive={markupActive}
              onToggleDrawMenu={() => {
                setDrawMenuOpen((open) => !open);
              }}
            />
          </div>
        }
        session={
          <SessionIslandSlots
            onOpenChat={onOpenChat}
            onOpenLog={onOpenLog}
            onOpenReportProblem={onOpenReportProblem}
            onOpenSettings={onOpenSettings}
            hasUnreadChat={hasUnreadChat}
            unreadCount={unreadCount}
            inactive={inactive}
            canStartEndGame={canStartEndGame}
            onStartEndGame={onStartEndGame}
            canRequestFoundHider={canRequestFoundHider}
            onRequestFoundHider={onRequestFoundHider}
          />
        }
      />

      <ToolDockDrawMenu
        open={drawMenuVisible}
        activeTool={activeTool}
        onSelect={selectTool}
      />
    </div>
  );
}
