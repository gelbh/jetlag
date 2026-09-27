import { useEffect, useRef } from "react";
import type { GameSize } from "../../domain/session/size/gameSize";
import { useVisualViewportBottomInset } from "../../hooks/layout/useVisualViewportBottomInset";
import type { SessionRulesInput } from "../../domain/session/rules";
import { resolveToolDockEnabled } from "../../domain/session/rules";
import {
  MARKUP_DOCK_TOOL_IDS,
  QUESTION_DOCK_TOOL_IDS,
} from "../../domain/map/mapTools";
import { isAskHudOwnedTool } from "../../domain/ask/askHudModes";
import { cn } from "../../lib/cn";
import type { MapTool } from "../../state/sessionStore";
import { MapBottomChrome } from "../map/chrome/MapBottomChrome";
import { SessionIslandSlots } from "../map/chrome/SessionIslandSlots";
import { ToolDeckGroup, ToolDeckInner, ToolDeckQuestionStrip } from "./ToolDeck";
import {
  ToolDockDrawControl,
  ToolDockHistorySlot,
  ToolDockQuestionSlot,
} from "./ToolDockSlot";
import { ToolDockDrawMenu } from "./ToolDockOverflowMenu";
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
  showHistory?: boolean;
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
  showHistory = true,
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
  inactive = false,
}: ToolDockProps) {
  const dockRef = useRef<HTMLDivElement>(null);
  const mainGroupRef = useRef<HTMLDivElement>(null);
  const viewportBottomInset = useVisualViewportBottomInset(true);
  const { drawMenuOpen, setDrawMenuOpen, closeMenus } =
    useToolDockMenus(dockRef);

  const drawMenuVisible =
    drawMenuOpen && !dismissOverflowMenus && !inactive;

  useEffect(() => {
    if (inactive) {
      closeMenus();
    }
  }, [inactive, closeMenus]);
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

  const askFirst =
    activeTool !== "none" && isAskHudOwnedTool(activeTool);

  return (
    <MapBottomChrome
      ref={dockRef}
      inactive={inactive}
      askFirst={askFirst}
      style={
        viewportBottomInset > 0
          ? { bottom: `${viewportBottomInset}px` }
          : undefined
      }
      hunt={
        <ToolDeckInner>
          {dockHighlight ? (
            <div
              aria-hidden={true}
              data-tool-highlight=""
              className={cn(
                "jl-tool-dock-highlight pointer-events-none absolute z-0 will-change-[transform,width,height] motion-safe:transition-[transform,width,height,opacity] motion-safe:duration-[var(--motion-base)] motion-safe:ease-[var(--ease-spring-subtle)]",
                "rounded-[10px] border-[0.33px] border-highlight/70 bg-highlight/18",
              )}
              style={{
                transform: `translate(${dockHighlight.x}px, ${dockHighlight.y}px)`,
                width: dockHighlight.width,
                height: dockHighlight.height,
              }}
            />
          ) : null}
          <ToolDeckGroup
            ref={mainGroupRef}
            className="justify-start gap-1 [&_.jl-tool-slot]:flex-none [&_.jl-tool-slot]:basis-auto [&_[data-hunt-question-strip]_.jl-tool-slot]:min-h-11 [&_[data-hunt-question-strip]_.jl-tool-slot]:min-w-0 [&_[data-hunt-question-strip]_.jl-tool-slot]:flex-1 [&_[data-hunt-question-strip]_.jl-tool-slot]:basis-0"
          >
            {showHistory ? (
              <>
                <ToolDockHistorySlot
                  kind="undo"
                  canAct={canUndo}
                  onAct={onUndo}
                  inactive={inactive}
                />
                <ToolDockHistorySlot
                  kind="redo"
                  canAct={canRedo}
                  onAct={onRedo}
                  inactive={inactive}
                />
              </>
            ) : null}
            <ToolDeckQuestionStrip askFirst={askFirst}>
              {visibleQuestionTools.map((toolId) => (
                <ToolDockQuestionSlot
                  key={toolId}
                  toolId={toolId}
                  activeTool={activeTool}
                  canSubmitQuestion={canSubmitQuestion}
                  onSelect={selectTool}
                />
              ))}
            </ToolDeckQuestionStrip>
          </ToolDeckGroup>
        </ToolDeckInner>
      }
      session={
        <SessionIslandSlots
          drawSlot={
            <ToolDockDrawControl
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
          }
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
          onClose={closeMenus}
        />
      }
    />
  );
}
