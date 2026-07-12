import type { MapTool } from "../../state/sessionStore";
import {
  MAP_TOOL_DOCK_ENTRIES,
  isMarkupDockTool,
} from "../../domain/map/mapTools";
import { ToolOverflowSheet } from "./ToolOverflowSheet";
import { ToolDockMarkupMenuItem } from "./ToolDockSlot";

const markupTools = MAP_TOOL_DOCK_ENTRIES.filter((tool) =>
  isMarkupDockTool(tool.id),
);

interface ToolDockDrawMenuProps {
  open: boolean;
  activeTool: MapTool;
  onSelect: (tool: MapTool) => void;
}

export function ToolDockDrawMenu({
  open,
  activeTool,
  onSelect,
}: ToolDockDrawMenuProps) {
  if (!open) {
    return null;
  }

  return (
    <div
      className="jl-tool-menu jl-tool-menu-dock jl-tool-dock-wide-only hud-panel"
      role="menu"
      aria-label="Draw on map"
    >
      {markupTools.map((tool) => (
        <ToolDockMarkupMenuItem
          key={tool.id}
          tool={tool}
          activeTool={activeTool}
          onSelect={onSelect}
        />
      ))}
    </div>
  );
}

interface ToolDockOverflowMenuProps {
  moreMenuOpen: boolean;
  dismissOverflowMenus: boolean;
  activeTool: MapTool;
  onSelect: (tool: MapTool) => void;
  onCloseMoreMenu: () => void;
  canUndo: boolean;
  canRedo: boolean;
  onUndo: () => void;
  onRedo: () => void;
  onOpenSettings: () => void;
  onOpenChat?: () => void;
  hasUnreadChat: boolean;
  unreadCount: number;
  canStartEndGame: boolean;
  onStartEndGame?: () => void;
}

export function ToolDockOverflowMenu({
  moreMenuOpen,
  dismissOverflowMenus,
  activeTool,
  onSelect,
  onCloseMoreMenu,
  canUndo,
  canRedo,
  onUndo,
  onRedo,
  onOpenSettings,
  onOpenChat,
  hasUnreadChat,
  unreadCount,
  canStartEndGame,
  onStartEndGame,
}: ToolDockOverflowMenuProps) {
  const moreMenuVisible = moreMenuOpen && !dismissOverflowMenus;

  return (
    <ToolOverflowSheet
      open={moreMenuVisible}
      onClose={onCloseMoreMenu}
      activeTool={activeTool}
      onSelect={onSelect}
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
  );
}
