import {
  createContext,
  useContext,
  useMemo,
  useState,
  type ReactNode,
} from "react";

export type ContextualRailTab = "settings" | "chat" | "log";

interface ContextualRailPanelContextValue {
  panelEl: HTMLElement | null;
  setPanelEl: (el: HTMLElement | null) => void;
}

const ContextualRailPanelContext =
  createContext<ContextualRailPanelContextValue | null>(null);

export function ContextualRailPanelProvider({
  children,
}: {
  children: ReactNode;
}) {
  const [panelEl, setPanelEl] = useState<HTMLElement | null>(null);
  const value = useMemo(
    () => ({ panelEl, setPanelEl }),
    [panelEl],
  );

  return (
    <ContextualRailPanelContext.Provider value={value}>
      {children}
    </ContextualRailPanelContext.Provider>
  );
}

export function useContextualRailPanel(): ContextualRailPanelContextValue | null {
  return useContext(ContextualRailPanelContext);
}
