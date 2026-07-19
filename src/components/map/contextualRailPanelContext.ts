import { createContext } from "react";

export type ContextualRailTab = "settings" | "chat" | "log";

export interface ContextualRailPanelContextValue {
  panelEl: HTMLElement | null;
  setPanelEl: (el: HTMLElement | null) => void;
}

export const ContextualRailPanelContext =
  createContext<ContextualRailPanelContextValue | null>(null);
