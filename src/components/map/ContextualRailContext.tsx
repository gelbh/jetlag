import { useMemo, useState, type ReactNode } from "react";
import { ContextualRailPanelContext } from "./contextualRailPanelContext";

export type { ContextualRailTab } from "./contextualRailPanelContext";

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
