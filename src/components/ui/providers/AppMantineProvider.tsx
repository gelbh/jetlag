import { MantineProvider } from "@mantine/core";
import type { ReactNode } from "react";
import { jetlagMantineTheme } from "@/theme/mantineTheme";

export function AppMantineProvider({ children }: { children: ReactNode }) {
  return (
    <MantineProvider
      theme={jetlagMantineTheme}
      defaultColorScheme="dark"
      forceColorScheme="dark"
    >
      {children}
    </MantineProvider>
  );
}
