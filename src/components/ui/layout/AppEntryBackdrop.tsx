import { useLocation } from "react-router-dom";
import { usePlayerUxWorld } from "@/hooks/feature/usePlayerUxWorld";

export function AppEntryBackdrop() {
  const location = useLocation();
  const survey = usePlayerUxWorld();

  if (location.pathname === "/map") {
    return null;
  }

  return (
    <div
      aria-hidden
      className="app-entry-backdrop"
      data-player-ux-world={survey ? "survey" : undefined}
    />
  );
}
