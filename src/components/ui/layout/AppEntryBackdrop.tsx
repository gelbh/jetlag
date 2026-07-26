import { useLocation } from "react-router-dom";

export function AppEntryBackdrop() {
  const location = useLocation();

  if (location.pathname === "/map") {
    return null;
  }

  return <div aria-hidden className="app-entry-backdrop" />;
}
