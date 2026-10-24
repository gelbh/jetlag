import { createContext, useContext } from "react";

export const PlayerPhoneShellPortalContext = createContext<HTMLElement | null>(null);

export function usePlayerPhoneShellPortalTarget(): HTMLElement | null {
  return useContext(PlayerPhoneShellPortalContext);
}
