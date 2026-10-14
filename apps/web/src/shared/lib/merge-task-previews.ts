import type { InfiniteData } from "@tanstack/react-query";

import type { SyncMeta, TaskSummary, TasksPage } from "@/shared/api/client";

export function mergeTaskItems(existing: TaskSummary[], preview: TaskSummary[]): TaskSummary[] {
  const byId = new Map(preview.map((task) => [task.task_id, task]));
  const merged = existing.map((task) => byId.get(task.task_id) ?? task);
  for (const task of preview) {
    if (!merged.some((row) => row.task_id === task.task_id)) {
      merged.push(task);
    }
  }
  return merged;
}

export function patchJobTasksQueryData(
  old: TasksPage | InfiniteData<TasksPage> | undefined,
  preview: TaskSummary[],
  sync: SyncMeta,
): TasksPage | InfiniteData<TasksPage> | undefined {
  if (!old) return old;
  if ("pages" in old) {
    return {
      ...old,
      pages: old.pages.map((page, index) => {
        const items =
          index === 0
            ? mergeTaskItems(page.items, preview)
            : page.items.map((task) => {
                const hit = preview.find((p) => p.task_id === task.task_id);
                return hit ?? task;
              });
        return { ...page, items, sync };
      }),
    };
  }
  return {
    ...old,
    items: mergeTaskItems(old.items, preview),
    sync,
  };
}
