const STORAGE_PREFIX = "raywatch.pinned-tasks.";

const EMPTY: readonly string[] = [];

type CacheEntry = { raw: string; ids: readonly string[] };

const cache = new Map<string, CacheEntry>();
const listeners = new Set<() => void>();

export function pinnedTasksStorageKey(jobId: string): string {
  return `${STORAGE_PREFIX}${jobId}`;
}

export function nextPinnedIds(current: readonly string[], taskId: string): string[] {
  if (current.includes(taskId)) {
    return current.filter((id) => id !== taskId);
  }
  return [...current, taskId];
}

function parseIds(raw: string): string[] {
  try {
    const parsed = JSON.parse(raw) as unknown;
    if (!Array.isArray(parsed)) return [];
    return parsed.filter((item): item is string => typeof item === "string" && item.length > 0);
  } catch {
    return [];
  }
}

export function readPinnedTaskIds(jobId: string): readonly string[] {
  if (typeof localStorage === "undefined") return EMPTY;
  const raw = localStorage.getItem(pinnedTasksStorageKey(jobId)) ?? "[]";
  const hit = cache.get(jobId);
  if (hit && hit.raw === raw) return hit.ids;
  const ids = parseIds(raw);
  cache.set(jobId, { raw, ids });
  return ids;
}

export function togglePinnedTask(jobId: string, taskId: string): void {
  const next = nextPinnedIds(readPinnedTaskIds(jobId), taskId);
  const raw = JSON.stringify(next);
  localStorage.setItem(pinnedTasksStorageKey(jobId), raw);
  cache.set(jobId, { raw, ids: next });
  listeners.forEach((listener) => listener());
}

export function subscribePinnedTasks(onStoreChange: () => void): () => void {
  listeners.add(onStoreChange);
  return () => listeners.delete(onStoreChange);
}
