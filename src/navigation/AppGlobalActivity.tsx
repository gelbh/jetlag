import { GlobalActivity } from "../components/ui/GlobalActivity";
import { useSessionStore } from "../state/sessionStore";

/** App-level non-blocking activity from the sync write queue. */
export function AppGlobalActivity() {
  const pendingWrites = useSessionStore((state) => state.pendingWrites);

  return (
    <div className="pointer-events-none fixed inset-x-0 bottom-0 z-[var(--z-banner)] flex justify-center px-3 pb-[max(0.75rem,env(safe-area-inset-bottom))]">
      <GlobalActivity
        pendingWrites={pendingWrites}
        className="pointer-events-auto"
      />
    </div>
  );
}
