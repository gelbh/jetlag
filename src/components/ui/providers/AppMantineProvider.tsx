import { MantineProvider } from "@mantine/core";
import { Notifications } from "@mantine/notifications";
import type { ReactNode } from "react";
import {
  JETLAG_TOAST_Z_INDEX,
  jetlagMantineTheme,
} from "@/theme/mantineTheme";

export function AppMantineProvider({ children }: { children: ReactNode }) {
  return (
    <MantineProvider theme={jetlagMantineTheme} forceColorScheme="dark">
      <Notifications zIndex={JETLAG_TOAST_Z_INDEX} />
      {children}
    </MantineProvider>
  );
}
