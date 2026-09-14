import { MantineProvider } from "@mantine/core";
import type { ReactNode } from "react";
import { jetlagMantineTheme } from "@/theme/mantineTheme";

export function AppMantineProvider({ children }: { children: ReactNode }) {
  return (
    <MantineProvider theme={jetlagMantineTheme} forceColorScheme="dark">
      {children}
    </MantineProvider>
  );
}
