import { useSyncExternalStore } from "react";

import {
  readPinnedTaskIds,
  subscribePinnedTasks,
  togglePinnedTask,
} from "@/features/jobs/pinned-tasks";

const EMPTY: readonly string[] = [];

export function usePinnedTasks(jobId: string) {
  const pinnedIds = useSyncExternalStore(
    subscribePinnedTasks,
    () => readPinnedTaskIds(jobId),
    () => EMPTY,
  );

  return {
    pinnedIds,
    isPinned: (taskId: string) => pinnedIds.includes(taskId),
    togglePin: (taskId: string) => togglePinnedTask(jobId, taskId),
  };
}
