import { mapChromeSurfaceStyles } from "@/components/ui/entry/entryChrome";
import { useGlobalLoadTasks } from "@/hooks/progress/useLoadTask";
import { LoadProgress } from "./LoadProgress";

export function GlobalLoadProgressList() {
  const tasks = useGlobalLoadTasks();

  if (tasks.length === 0) {
    return null;
  }

  return (
    <div
      data-testid="global-load-progress-list"
      className="pointer-events-none flex w-full max-w-xs flex-col gap-2"
    >
      {tasks.map((task) => (
        <div
          key={task.id}
          className="pointer-events-auto w-full rounded-md px-2 py-1.5"
          style={{
            ...mapChromeSurfaceStyles,
            color: "var(--color-field-ink)",
          }}
        >
          <LoadProgress task={task} variant="compact" />
        </div>
      ))}
    </div>
  );
}
