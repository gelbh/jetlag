import type { ReactNode } from "react";
import "@/theme/mantineAdminStyles";
import "./adminShell.css";

/**
 * Admin desk shell: layout host + lazy Mantine admin CSS. Theme is AppUiProvider
 * (jetlagTheme, dark-only). Desk paper (`surface-deep`) and Mantine CSS vars are
 * set by adminShell.css on this host, not a nested MantineThemeProvider.
 */
export function AdminWorld({ children }: { children: ReactNode }) {
  return <div data-admin-world>{children}</div>;
}
