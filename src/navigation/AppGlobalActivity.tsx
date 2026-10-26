import { useLocation } from "react-router-dom";
import { GlobalActivity } from "../components/ui/feedback/GlobalActivity";
import { GlobalLoadProgressList } from "../components/ui/feedback/GlobalLoadProgressList";
import { useAskMapPlacementActive } from "../hooks/progress/useAskMapPlacementActive";
import { useSessionStore } from "../state/sessionStore";
import { RouteProgressChrome } from "./RouteProgressChrome";

export function AppGlobalActivity() {
  const { pathname } = useLocation();
  const onMap = pathname === "/map";
  const pendingWrites = useSessionStore((state) => state.pendingWrites);
  const askMapPlacementActive = useAskMapPlacementActive();

  return (
    <div
      data-testid="app-global-status-host"
      className={
        onMap
          ? "pointer-events-none fixed inset-x-0 top-[var(--map-banner-top)] z-[var(--z-banner)] flex flex-col items-center gap-2 px-3"
          : "pointer-events-none fixed inset-x-0 top-0 z-[var(--z-banner)] flex flex-col items-center gap-2 px-3 pt-[max(0.5rem,var(--safe-area-top))]"
      }
    >
      <RouteProgressChrome />
      {!askMapPlacementActive ? <GlobalLoadProgressList /> : null}
      <GlobalActivity pendingWrites={pendingWrites} className="pointer-events-auto" />
    </div>
  );
}
