import { MantineProvider } from "@mantine/core";
import { Notifications } from "@mantine/notifications";
import type { ReactNode } from "react";
import {
  JETLAG_TOAST_Z_INDEX,
  jetlagCssVariablesResolver,
  jetlagTheme,
} from "@/theme/theme";

export function AppUiProvider({ children }: { children: ReactNode }) {
  return (
    <MantineProvider
      theme={jetlagTheme}
      forceColorScheme="dark"
      cssVariablesResolver={jetlagCssVariablesResolver}
    >
      <Notifications
        zIndex={JETLAG_TOAST_Z_INDEX}
        position="top-center"
        autoClose={4200}
        limit={3}
        containerWidth={420}
      />
      {children}
    </MantineProvider>
  );
}
