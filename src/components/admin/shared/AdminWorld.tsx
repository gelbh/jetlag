import { MantineThemeProvider } from "@mantine/core";
import type { ReactNode } from "react";
import { adminTheme } from "@/theme/adminTheme";
import "./adminTokens.css";

export function AdminWorld({ children }: { children: ReactNode }) {
  return (
    <div data-admin-world>
      <MantineThemeProvider theme={adminTheme}>{children}</MantineThemeProvider>
      <div data-admin-portal />
    </div>
  );
}
