import { createContext, useContext } from "react";

export const PlayerPhoneShellPortalContext = createContext<HTMLElement | null>(null);

/** Portal host for Mantine Drawers/Modals constrained to the phone column. */
export function usePlayerPhoneShellPortalTarget(): HTMLElement | null {
  return useContext(PlayerPhoneShellPortalContext);
}
