import type { ReactNode } from "react";
import { useLocation } from "react-router-dom";

export function isAdminPath(pathname: string): boolean {
  return pathname === "/admin" || pathname.startsWith("/admin/");
}

export function PlayerRouteOnly({ children }: { children: ReactNode }) {
  const { pathname } = useLocation();
  return isAdminPath(pathname) ? null : children;
}
