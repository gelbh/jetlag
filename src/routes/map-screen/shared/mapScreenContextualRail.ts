import type { ReactNode } from "react";
import { createElement } from "react";
import { ContextualRail } from "../../../components/map/chrome/ContextualRail";
import type { ContextualRailTab } from "../../../components/map/chrome/ContextualRailContext";

export type MapScreenRailTabActions = {
  onOpenSettings?: () => void;
  onOpenChat: () => void;
  onOpenLog: () => void;
  onOpenCodes: () => void;
};

/** Exhaustive rail-tab → open-action dispatcher shared by role chromes. */
export function createMapScreenRailTabHandler(
  actions: MapScreenRailTabActions,
): (tab: ContextualRailTab) => void {
  return (tab) => {
    switch (tab) {
      case "settings":
        actions.onOpenSettings?.();
        return;
      case "chat":
        actions.onOpenChat();
        return;
      case "log":
        actions.onOpenLog();
        return;
      case "codes":
        actions.onOpenCodes();
        return;
      default: {
        const _exhaustive: never = tab;
        return _exhaustive;
      }
    }
  };
}

export type MapScreenContextualRailProps = {
  enabled: boolean;
  sheet: string;
  /** When provided, rail stays open under nested sheets and keeps primary tab active. */
  sheetStack?: readonly string[];
  onClose: () => void;
  actions: MapScreenRailTabActions;
  /** Limit visible tabs (observer desktop omits settings). */
  tabs?: readonly ContextualRailTab[];
  /** Override open detection (observer only opens for log/chat/codes). */
  open?: boolean;
  /** Override active tab (observer maps non-rail sheets to null). */
  activeTab?: ContextualRailTab | null;
};

const RAIL_TABS = new Set<string>(["chat", "settings", "log", "codes"]);

/**
 * Desktop contextual rail for map role shells.
 * Returns null when disabled (phone) so callers can assign into chrome slots.
 */
export function renderMapScreenContextualRail({
  enabled,
  sheet,
  sheetStack,
  onClose,
  actions,
  tabs,
  open,
  activeTab,
}: MapScreenContextualRailProps): ReactNode {
  if (!enabled) {
    return null;
  }

  const stack = sheetStack ?? (sheet === "none" ? [] : [sheet]);
  const primaryInStack = stack.find((entry) => RAIL_TABS.has(entry));
  const railOpen = open ?? stack.length > 0;
  const railActiveTab: ContextualRailTab | null =
    activeTab !== undefined
      ? activeTab
      : primaryInStack
        ? (primaryInStack as ContextualRailTab)
        : sheet !== "none" && RAIL_TABS.has(sheet)
          ? (sheet as ContextualRailTab)
          : null;

  return createElement(ContextualRail, {
    open: railOpen,
    activeTab: railActiveTab,
    onClose,
    onSelectTab: createMapScreenRailTabHandler(actions),
    ...(tabs ? { tabs } : {}),
  });
}
