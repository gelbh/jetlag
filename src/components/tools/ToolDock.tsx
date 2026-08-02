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
import {
  ToolDockCompactMoreButton,
  ToolDockHistorySlots,
  ToolDockQuestionSlot,
  ToolDockWideActions,
} from "./ToolDockSlot";
import {
  ToolDockDrawMenu,
  ToolDockOverflowMenu,
} from "./ToolDockOverflowMenu";
import { ToolDockSecondaryBar } from "./ToolDockSecondaryBar";
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
  const {
    drawMenuOpen,
    setDrawMenuOpen,
    moreMenuOpen,
    setMoreMenuOpen,
    closeMenus,
  } = useToolDockMenus(dockRef);

  const drawMenuVisible = drawMenuOpen && !dismissOverflowMenus;
  const moreMenuVisible = moreMenuOpen && !dismissOverflowMenus;
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

  const moreMenuActive = moreMenuVisible || markupActive;

  return (
    <div
      ref={dockRef}
      className={`jl-tool-dock pointer-events-auto${isRail ? " jl-tool-dock--rail" : ""}${inactive ? " pointer-events-none opacity-55 saturate-50" : ""}`}
      style={
        !isRail && viewportBottomInset > 0
          ? { bottom: `${viewportBottomInset}px` }
          : undefined
      }
    >
      <ToolDockDrawMenu
        open={drawMenuVisible}
        activeTool={activeTool}
        onSelect={selectTool}
      />

      <ToolDockOverflowMenu
        moreMenuOpen={moreMenuOpen}
        dismissOverflowMenus={dismissOverflowMenus}
        activeTool={activeTool}
        onSelect={onSelect}
        onCloseMoreMenu={() => setMoreMenuOpen(false)}
        canUndo={canUndo}
        canRedo={canRedo}
        onUndo={onUndo}
        onRedo={onRedo}
        canStartEndGame={canStartEndGame}
        onStartEndGame={onStartEndGame}
        canRequestFoundHider={canRequestFoundHider}
        onRequestFoundHider={onRequestFoundHider}
      />

      <div className={`jl-tool-dock-bar${isRail ? " jl-scroll" : ""}`}>
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

        <ToolDockHistorySlots
          canUndo={canUndo}
          canRedo={canRedo}
          onUndo={onUndo}
          onRedo={onRedo}
        />

        <div
          className="jl-tool-dock-divider jl-tool-dock-divider-history"
          aria-hidden="true"
        />

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

        <div className="jl-tool-dock-divider" aria-hidden="true" />

        <ToolDockWideActions
          drawMenuOpen={drawMenuOpen}
          markupActive={markupActive}
          onToggleDrawMenu={() => {
            setMoreMenuOpen(false);
            setDrawMenuOpen((open) => !open);
          }}
        />

        <ToolDockCompactMoreButton
          moreMenuActive={moreMenuActive}
          moreMenuOpen={moreMenuOpen}
          onToggleMoreMenu={() => {
            setDrawMenuOpen(false);
            const opening = !moreMenuOpen;
            setMoreMenuOpen(opening);
            if (opening && activeTool !== "none") {
              onSelect("none");
            }
          }}
        />
      </div>

      <ToolDockSecondaryBar
        onOpenChat={onOpenChat}
        onOpenReportProblem={onOpenReportProblem}
        onOpenSettings={onOpenSettings}
        hasUnreadChat={hasUnreadChat}
        unreadCount={unreadCount}
        inactive={inactive}
      />
    </div>
  );
}
