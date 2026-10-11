import { MantineProvider } from "@mantine/core";
import { Notifications } from "@mantine/notifications";
import { type ReactNode, useEffect, useState } from "react";
import {
  getPlayerPhoneShellPortalHost,
  subscribePlayerPhoneShellPortalHost,
} from "@/components/ui/layout/playerPhoneShellPortalHost";
import { PHONE_SHELL_MAX_WIDTH_PX } from "@/theme/phoneShell";
import { JETLAG_TOAST_Z_INDEX, jetlagCssVariablesResolver, jetlagTheme } from "@/theme/theme";
import { useColorSchemeScope } from "./colorSchemeScope";

function ShellAwareNotifications() {
  const [portalTarget, setPortalTarget] = useState<HTMLElement | null>(
    getPlayerPhoneShellPortalHost,
  );

  useEffect(() => subscribePlayerPhoneShellPortalHost(setPortalTarget), []);

  return (
    <Notifications
      zIndex={JETLAG_TOAST_Z_INDEX}
      position="top-center"
      autoClose={4200}
      limit={3}
      containerWidth={PHONE_SHELL_MAX_WIDTH_PX}
      withinPortal
      portalProps={portalTarget ? { target: portalTarget } : undefined}
    />
  );
}

export function AppUiProvider({ children }: { children: ReactNode }) {
  const scope = useColorSchemeScope();

  return (
    <MantineProvider
      theme={jetlagTheme}
      defaultColorScheme="auto"
      forceColorScheme={scope === "admin" ? undefined : "dark"}
      cssVariablesResolver={jetlagCssVariablesResolver}
    >
      <ShellAwareNotifications />
      {children}
    </MantineProvider>
  );
}
