import { useRef } from "react";
import type { GameSize } from "../../domain/session/gameSize";
import { useVisualViewportBottomInset } from "../../hooks/useVisualViewportBottomInset";
import type { SessionRulesInput } from "../../domain/session/sessionRules";
import { resolveToolDockEnabled } from "../../domain/session/sessionRules";
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
import {
  useToolDockHighlight,
  useToolDockMenus,
} from "./useToolDockState";

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
  onOpenChat?: () => void;
  hasUnreadChat?: boolean;
  unreadCount?: number;
  dismissOverflowMenus?: boolean;
  canStartEndGame?: boolean;
  onStartEndGame?: () => void;
  canSubmitQuestion?: boolean;
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
  onOpenChat,
  hasUnreadChat = false,
  unreadCount = 0,
  dismissOverflowMenus = false,
  canStartEndGame = false,
  onStartEndGame,
  canSubmitQuestion = true,
}: ToolDockProps) {
  const dockRef = useRef<HTMLDivElement>(null);
  const mainGroupRef = useRef<HTMLDivElement>(null);
  const viewportBottomInset = useVisualViewportBottomInset(true);
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
    onSelect(activeTool === tool ? "none" : tool);
    closeMenus();
  };

  const moreMenuActive = moreMenuVisible || markupActive;

  return (
    <div
      ref={dockRef}
      className="jl-tool-dock pointer-events-auto"
      style={
        viewportBottomInset > 0
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
        onOpenSettings={onOpenSettings}
        onOpenChat={onOpenChat}
        hasUnreadChat={hasUnreadChat}
        unreadCount={unreadCount}
        canStartEndGame={canStartEndGame}
        onStartEndGame={onStartEndGame}
      />

      <div className="jl-tool-dock-bar">
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
          onOpenChat={onOpenChat}
          hasUnreadChat={hasUnreadChat}
          unreadCount={unreadCount}
          onOpenSettings={onOpenSettings}
        />

        <ToolDockCompactMoreButton
          moreMenuActive={moreMenuActive}
          moreMenuOpen={moreMenuOpen}
          hasUnreadChat={hasUnreadChat}
          unreadCount={unreadCount}
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
    </div>
  );
}
