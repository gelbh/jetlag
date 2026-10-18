import { useSyncExternalStore } from "react";
import {
  getGlobalLoadTasks,
  type LoadTask,
  type LoadTaskSnapshot,
  subscribeGlobalLoadTasks,
} from "@/services/core/progress/loadTask";

const noopSubscribe = () => () => {};
const nullSnapshot = () => null;

/** Live snapshot of a load task; null when no task is given. */
export function useLoadTask(task: LoadTask | null | undefined): LoadTaskSnapshot | null {
  return useSyncExternalStore(
    task ? task.subscribe : noopSubscribe,
    task ? task.getSnapshot : nullSnapshot,
    task ? task.getSnapshot : nullSnapshot,
  );
}

/** Tasks currently shown in the global activity chip. */
export function useGlobalLoadTasks(): readonly LoadTask[] {
  return useSyncExternalStore(subscribeGlobalLoadTasks, getGlobalLoadTasks, getGlobalLoadTasks);
}
