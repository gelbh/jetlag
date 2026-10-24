import type { ReactNode } from "react";
import "@/theme/mantineAdminStyles";
import "./adminShell.css";

export function AdminWorld({ children }: { children: ReactNode }) {
  return <div data-admin-world>{children}</div>;
}
