import {
  createContext,
  useContext,
  useLayoutEffect,
  useRef,
  useState,
  type ReactNode,
} from "react";
import { Box } from "@mantine/core";
import { PHONE_SHELL_MAX_WIDTH_PX } from "@/theme/phoneShell";
import { setPlayerPhoneShellPortalHost } from "./playerPhoneShellPortalHost";

const PlayerPhoneShellPortalContext = createContext<HTMLElement | null>(null);

/** Portal host for Mantine Drawers/Modals constrained to the phone column. */
export function usePlayerPhoneShellPortalTarget(): HTMLElement | null {
  return useContext(PlayerPhoneShellPortalContext);
}

export function PlayerPhoneShell({ children }: { children: ReactNode }) {
  const shellRef = useRef<HTMLDivElement>(null);
  const [portalTarget, setPortalTarget] = useState<HTMLElement | null>(null);

  useLayoutEffect(() => {
    const el = shellRef.current;
    setPortalTarget(el);
    setPlayerPhoneShellPortalHost(el);
    return () => {
      setPlayerPhoneShellPortalHost(null);
    };
  }, []);

  return (
    <PlayerPhoneShellPortalContext.Provider value={portalTarget}>
      <Box
        ref={shellRef}
        data-testid="player-phone-shell"
        data-player-phone-shell
        mx="auto"
        w="100%"
        maw={PHONE_SHELL_MAX_WIDTH_PX}
        h="100%"
        mih="100%"
        pos="relative"
        style={{
          display: "flex",
          flexDirection: "column",
          /* Containing block for position:fixed Mantine Drawer/Notifications. */
          transform: "translateZ(0)",
        }}
      >
        {children}
      </Box>
    </PlayerPhoneShellPortalContext.Provider>
  );
}
