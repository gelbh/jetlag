import { GlobalActivity } from "../components/ui/feedback/GlobalActivity";
import { LoadProgress } from "../components/ui/feedback/LoadProgress";
import { useGlobalLoadTasks } from "../hooks/progress/useLoadTask";
import { useSessionStore } from "../state/sessionStore";

/** App-level non-blocking activity: the sync write queue and global load tasks. */
export function AppGlobalActivity() {
  const pendingWrites = useSessionStore((state) => state.pendingWrites);
  const tasks = useGlobalLoadTasks();

  return (
    <div className="pointer-events-none fixed inset-x-0 bottom-0 z-[var(--z-banner)] flex flex-col items-center gap-2 px-3 pb-[max(0.75rem,var(--safe-area-bottom))]">
      {tasks.map((task) => (
        <div
          key={task.id}
          className="pointer-events-auto w-full max-w-xs rounded-md border border-border bg-surface-panel/95 px-2 py-1.5 shadow-hud-float"
        >
          <LoadProgress task={task} variant="compact" />
        </div>
      ))}
      <GlobalActivity pendingWrites={pendingWrites} className="pointer-events-auto" />
    </div>
  );
}
