import { MantineThemeProvider } from "@mantine/core";
import type { ReactNode } from "react";
import { useAdminColorSchemeScope } from "@/components/ui/providers/colorSchemeScope";
import { adminTheme } from "@/theme/adminTheme";
import "./adminTokens.css";

export function AdminWorld({ children }: { children: ReactNode }) {
  useAdminColorSchemeScope();
  return (
    <div data-admin-world>
      <MantineThemeProvider theme={adminTheme}>{children}</MantineThemeProvider>
    </div>
  );
}
