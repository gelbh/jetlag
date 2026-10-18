import { useLocation } from "react-router-dom";
import { entryBackdropStyle } from "@/components/ui/entry/entryStyles";
import { isAdminPath } from "./PlayerRouteOnly";

export function AppEntryBackdrop() {
  const location = useLocation();

  if (location.pathname === "/map" || isAdminPath(location.pathname)) {
    return null;
  }

  return <div aria-hidden className="app-entry-backdrop" style={entryBackdropStyle} />;
}
