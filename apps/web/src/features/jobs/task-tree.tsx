import { useState } from "react";

import type { TaskSummary } from "@/shared/api/client";

type TaskTreeProps = {
  tasks: TaskSummary[];
  selectedTaskId: string | null;
  onSelect: (taskId: string) => void;
};

export type TreeNode = {
  task: TaskSummary;
  children: TreeNode[];
};

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

function TreeRow({
  node,
  depth,
  selectedTaskId,
  onSelect,
  expanded,
  onToggle,
}: {
  node: TreeNode;
  depth: number;
  selectedTaskId: string | null;
  onSelect: (id: string) => void;
  expanded: Set<string>;
  onToggle: (id: string) => void;
}) {
  const { task } = node;
  const hasChildren = node.children.length > 0;
  const isOpen = expanded.has(task.task_id);

  return (
    <>
      <tr
        className={task.task_id === selectedTaskId ? "row-selected" : ""}
        onClick={() => onSelect(task.task_id)}
      >
        <td style={{ paddingLeft: `${depth * 1.25}rem` }}>
          {hasChildren ? (
            <button
              type="button"
              className="tree-toggle"
              aria-expanded={isOpen}
              aria-label={`${isOpen ? "Collapse" : "Expand"} ${task.name || task.func_or_class || "task"} nested tasks`}
              onClick={(e) => {
                e.stopPropagation();
                onToggle(task.task_id);
              }}
            >
              {isOpen ? "▾" : "▸"}
            </button>
          ) : (
            <span className="tree-spacer" />
          )}
          {task.name || task.func_or_class || "task"}
        </td>
        <td>
          <span className={`badge badge-${task.status.toLowerCase()}`}>{task.status}</span>
        </td>
        <td className="mono truncate">{task.task_id}</td>
      </tr>
      {hasChildren &&
        isOpen &&
        node.children.map((child) => (
          <TreeRow
            key={child.task.task_id}
            node={child}
            depth={depth + 1}
            selectedTaskId={selectedTaskId}
            onSelect={onSelect}
            expanded={expanded}
            onToggle={onToggle}
          />
        ))}
    </>
  );
}

export function TaskTree({ tasks, selectedTaskId, onSelect }: TaskTreeProps) {
  const [expanded, setExpanded] = useState<Set<string>>(() => new Set());
  const forest = buildForest(tasks);

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
    <table className="jobs-table">
      <thead>
        <tr>
          <th>Name</th>
          <th>Status</th>
          <th>Task ID</th>
        </tr>
      </thead>
      <tbody>
        {forest.map((node) => (
          <TreeRow
            key={node.task.task_id}
            node={node}
            depth={0}
            selectedTaskId={selectedTaskId}
            onSelect={onSelect}
            expanded={expanded}
            onToggle={onToggle}
          />
        ))}
      </tbody>
    </table>
  );
}
