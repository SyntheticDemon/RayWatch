import { useVirtualizer } from "@tanstack/react-virtual";
import { useMemo, useRef, useState, type CSSProperties } from "react";

import { TaskProfileLinks } from "@/features/jobs/task-profile-links";
import { usePinnedTasks } from "@/features/jobs/use-pinned-tasks";
import type { TaskSummary } from "@/shared/api/client";

type TaskTreeProps = {
  jobId: string;
  tasks: TaskSummary[];
  selectedTaskId: string | null;
  onSelect: (taskId: string) => void;
};

export type TreeNode = {
  task: TaskSummary;
  children: TreeNode[];
};

export type HierarchyNode = {
  key: string;
  label: string;
  task: TaskSummary | null;
  children: HierarchyNode[];
  counts: Record<string, number>;
};

const DRIVER_PARENT_PREFIX = "ffffffffffffffffffffffffffffffffffffffff";

function isDriverParent(parentId: string | null): boolean {
  return !parentId || parentId.startsWith(DRIVER_PARENT_PREFIX);
}

function toHierarchy(node: TreeNode): HierarchyNode {
  const label = taskLabel(node.task);
  return {
    key: node.task.task_id,
    label,
    task: node.task,
    children: node.children.map(toHierarchy),
    counts: { [node.task.status]: 1 },
  };
}

function mergeSameNameSiblings(nodes: HierarchyNode[]): HierarchyNode[] {
  const order: string[] = [];
  const groups = new Map<string, HierarchyNode[]>();
  for (const node of nodes) {
    const next = { ...node, children: mergeSameNameSiblings(node.children) };
    const bucket = groups.get(next.label);
    if (!bucket) {
      groups.set(next.label, [next]);
      order.push(next.label);
    } else {
      bucket.push(next);
    }
  }
  return order.map((label) => {
    const kids = groups.get(label) ?? [];
    if (kids.length === 1) return kids[0];
    const counts: Record<string, number> = {};
    for (const kid of kids) {
      for (const [state, count] of Object.entries(kid.counts)) {
        counts[state] = (counts[state] ?? 0) + count;
      }
    }
    return {
      key: `group:${label}`,
      label,
      task: null,
      children: kids,
      counts,
    };
  });
}

/** Ray job progress: parent/actor ownership, then same-name siblings collapse into one row. */
export function buildTaskHierarchy(tasks: TaskSummary[]): HierarchyNode[] {
  const rooted = tasks.map((task) =>
    isDriverParent(task.parent_task_id) ? { ...task, parent_task_id: null } : task,
  );
  return mergeSameNameSiblings(buildForest(rooted).map(toHierarchy));
}

export function buildForest(tasks: TaskSummary[]): TreeNode[] {
  const byId = new Map(tasks.map((t) => [t.task_id, t]));
  const childMap = new Map<string, TaskSummary[]>();
  const roots: TaskSummary[] = [];

  for (const task of tasks) {
    const parent = task.parent_task_id;
    if (!parent || !byId.has(parent)) {
      roots.push(task);
      continue;
    }
    const bucket = childMap.get(parent) ?? [];
    bucket.push(task);
    childMap.set(parent, bucket);
  }

  const toNode = (task: TaskSummary): TreeNode => ({
    task,
    children: (childMap.get(task.task_id) ?? []).map(toNode),
  });

  return roots.map(toNode);
}

function taskLabel(task: TaskSummary): string {
  return task.name || task.func_or_class || "task";
}

function PinButton({
  task,
  pinned,
  onTogglePin,
}: {
  task: TaskSummary;
  pinned: boolean;
  onTogglePin: (taskId: string) => void;
}) {
  const label = taskLabel(task);
  return (
    <button
      type="button"
      className="pin-toggle"
      aria-pressed={pinned}
      aria-label={`${pinned ? "Unpin" : "Pin"} ${label}`}
      onClick={(event) => {
        event.stopPropagation();
        onTogglePin(task.task_id);
      }}
    >
      {pinned ? "Unpin" : "Pin"}
    </button>
  );
}

function statusSummary(counts: Record<string, number>): string {
  return Object.entries(counts)
    .map(([state, count]) => `${count} ${state.toLowerCase()}`)
    .join(" · ");
}

export function flattenVisibleHierarchy(
  nodes: HierarchyNode[],
  expanded: Set<string>,
  depth = 0,
): { node: HierarchyNode; depth: number }[] {
  const rows: { node: HierarchyNode; depth: number }[] = [];
  for (const node of nodes) {
    rows.push({ node, depth });
    if (node.children.length > 0 && expanded.has(node.key)) {
      rows.push(...flattenVisibleHierarchy(node.children, expanded, depth + 1));
    }
  }
  return rows;
}

function findProfileTask(node: HierarchyNode): TaskSummary | null {
  if (node.task?.status === "RUNNING" && node.task.node_id) return node.task;
  for (const child of node.children) {
    const match = findProfileTask(child);
    if (match) return match;
  }
  return null;
}

function TreeRow({
  node,
  depth,
  selectedTaskId,
  onSelect,
  expanded,
  onToggle,
  isPinned,
  onTogglePin,
  virtualStyle,
}: {
  node: HierarchyNode;
  depth: number;
  selectedTaskId: string | null;
  onSelect: (id: string) => void;
  expanded: Set<string>;
  onToggle: (id: string) => void;
  isPinned: (taskId: string) => boolean;
  onTogglePin: (taskId: string) => void;
  virtualStyle?: CSSProperties;
}) {
  const { task } = node;
  const hasChildren = node.children.length > 0;
  const isOpen = expanded.has(node.key);
  const selected = task !== null && task.task_id === selectedTaskId;

  const row = (
      <tr
        className={selected ? "row-selected" : task ? "" : "task-group-row"}
        style={virtualStyle}
        onClick={() => {
          if (task) onSelect(task.task_id);
          else onToggle(node.key);
        }}
      >
        <td>
          {task ? (
            <PinButton task={task} pinned={isPinned(task.task_id)} onTogglePin={onTogglePin} />
          ) : null}
        </td>
        <td style={{ paddingLeft: `${depth * 1.25}rem` }}>
          {hasChildren ? (
            <button
              type="button"
              className="tree-toggle"
              aria-expanded={isOpen}
              aria-label={`${isOpen ? "Collapse" : "Expand"} ${node.label} nested tasks`}
              onClick={(e) => {
                e.stopPropagation();
                onToggle(node.key);
              }}
            >
              {isOpen ? "▾" : "▸"}
            </button>
          ) : (
            <span className="tree-spacer" />
          )}
          {node.label}
          {task ? (
            <TaskProfileLinks task={task} />
          ) : (
            (() => {
              const profileTask = findProfileTask(node);
              return profileTask ? (
                <TaskProfileLinks task={profileTask} />
              ) : (
                <span className="task-profile-links">
                  <span className="task-profile-disabled">CPU profile</span>
                  <span className="task-profile-disabled">Stack trace</span>
                  <span className="task-profile-disabled">Memory profile</span>
                </span>
              );
            })()
          )}
        </td>
        <td>
          {task ? (
            <span className={`badge badge-${task.status.toLowerCase()}`}>{task.status}</span>
          ) : (
            <span className="muted">{statusSummary(node.counts)}</span>
          )}
        </td>
        <td className="mono truncate">{task ? task.task_id : `${node.children.length} tasks`}</td>
      </tr>
  );

  if (virtualStyle) return row;

  return (
    <>
      {row}
      {hasChildren &&
        isOpen &&
        node.children.map((child) => (
          <TreeRow
            key={child.key}
            node={child}
            depth={depth + 1}
            selectedTaskId={selectedTaskId}
            onSelect={onSelect}
            expanded={expanded}
            onToggle={onToggle}
            isPinned={isPinned}
            onTogglePin={onTogglePin}
          />
        ))}
    </>
  );
}

export function TaskTree({ jobId, tasks, selectedTaskId, onSelect }: TaskTreeProps) {
  const [expanded, setExpanded] = useState<Set<string>>(() => new Set());
  const scrollRef = useRef<HTMLDivElement>(null);
  const { pinnedIds, isPinned, togglePin } = usePinnedTasks(jobId);
  const forest = buildTaskHierarchy(tasks);
  const byId = new Map(tasks.map((task) => [task.task_id, task]));
  const flatRows = useMemo(() => flattenVisibleHierarchy(forest, expanded), [forest, expanded]);
  const virtualizer = useVirtualizer({
    count: flatRows.length,
    getScrollElement: () => scrollRef.current,
    estimateSize: () => 44,
    overscan: 8,
  });

  const onToggle = (id: string) => {
    setExpanded((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  };

  if (forest.length === 0) {
    return <p className="muted">No tasks in index yet.</p>;
  }
  return (
    <div className="task-tree">
      {pinnedIds.length > 0 && (
        <section className="pinned-tasks" aria-label="Pinned tasks">
          <h3 className="pinned-tasks-title">Pinned</h3>
          <ul className="pinned-tasks-list">
            {pinnedIds.map((id) => {
              const task = byId.get(id);
              const label = task ? taskLabel(task) : id;
              return (
                <li key={id}>
                  {task ? (
                    <button type="button" className="pinned-task-open" onClick={() => onSelect(id)}>
                      {label}
                      <span className={`badge badge-${task.status.toLowerCase()}`}>{task.status}</span>
                    </button>
                  ) : (
                    <span className="muted">{label} · not in loaded tasks</span>
                  )}
                  <button
                    type="button"
                    className="pin-toggle"
                    aria-label={`Unpin ${label}`}
                    onClick={() => togglePin(id)}
                  >
                    Unpin
                  </button>
                </li>
              );
            })}
          </ul>
        </section>
      )}
      <div ref={scrollRef} className="task-tree-scroll">
        <table className="jobs-table">
          <thead>
            <tr>
              <th className="pin-col">Pin</th>
              <th>Name</th>
              <th>Status</th>
              <th>Task ID</th>
            </tr>
          </thead>
          {flatRows.length > 120 ? (
            <tbody style={{ height: `${virtualizer.getTotalSize()}px`, position: "relative" }}>
              {virtualizer.getVirtualItems().map((virtualRow) => {
                const { node, depth } = flatRows[virtualRow.index];
                return (
                  <TreeRow
                    key={`${node.key}-${virtualRow.index}`}
                    node={node}
                    depth={depth}
                    selectedTaskId={selectedTaskId}
                    onSelect={onSelect}
                    expanded={expanded}
                    onToggle={onToggle}
                    isPinned={isPinned}
                    onTogglePin={togglePin}
                    virtualStyle={{
                      position: "absolute",
                      top: 0,
                      left: 0,
                      width: "100%",
                      transform: `translateY(${virtualRow.start}px)`,
                    }}
                  />
                );
              })}
            </tbody>
          ) : (
            <tbody>
              {forest.map((node) => (
                <TreeRow
                  key={node.key}
                  node={node}
                  depth={0}
                  selectedTaskId={selectedTaskId}
                  onSelect={onSelect}
                  expanded={expanded}
                  onToggle={onToggle}
                  isPinned={isPinned}
                  onTogglePin={togglePin}
                />
              ))}
            </tbody>
          )}
        </table>
      </div>
    </div>
  );
}
