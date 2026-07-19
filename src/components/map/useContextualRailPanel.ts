import { useContext } from "react";
import {
  ContextualRailPanelContext,
  type ContextualRailPanelContextValue,
} from "./contextualRailPanelContext";

export function useContextualRailPanel(): ContextualRailPanelContextValue | null {
  return useContext(ContextualRailPanelContext);
}
