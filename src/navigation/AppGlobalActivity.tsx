import { GlobalActivity } from "../components/ui/feedback/GlobalActivity";
import { GlobalLoadProgressList } from "../components/ui/feedback/GlobalLoadProgressList";
import { useAskMapPlacementActive } from "../hooks/progress/useAskMapPlacementActive";
import { useSessionStore } from "../state/sessionStore";

export function AppGlobalActivity() {
  const pendingWrites = useSessionStore((state) => state.pendingWrites);
  const askMapPlacementActive = useAskMapPlacementActive();

  return (
    <div className="pointer-events-none fixed inset-x-0 bottom-0 z-[var(--z-banner)] flex flex-col items-center gap-2 px-3 pb-[max(0.75rem,var(--safe-area-bottom))]">
      {!askMapPlacementActive ? <GlobalLoadProgressList /> : null}
      <GlobalActivity pendingWrites={pendingWrites} className="pointer-events-auto" />
    </div>
  );
}
