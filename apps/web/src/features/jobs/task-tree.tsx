import type { TaskSummary } from "@/shared/api/client";

type TaskTreeProps = {
  tasks: TaskSummary[];
  selectedTaskId: string | null;
  onSelect: (taskId: string) => void;
};

type TreeNode = {
  task: TaskSummary;
  children: TreeNode[];
};

function buildForest(tasks: TaskSummary[]): TreeNode[] {
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
}: {
  node: TreeNode;
  depth: number;
  selectedTaskId: string | null;
  onSelect: (id: string) => void;
}) {
  const { task } = node;
  return (
    <>
      <tr
        className={task.task_id === selectedTaskId ? "row-selected" : ""}
        onClick={() => onSelect(task.task_id)}
      >
        <td style={{ paddingLeft: `${depth * 1.25}rem` }}>
          {node.children.length > 0 ? "▸ " : ""}
          {task.name || task.func_or_class || "task"}
        </td>
        <td>
          <span className={`badge badge-${task.status.toLowerCase()}`}>{task.status}</span>
        </td>
        <td className="mono truncate">{task.task_id}</td>
      </tr>
      {node.children.map((child) => (
        <TreeRow
          key={child.task.task_id}
          node={child}
          depth={depth + 1}
          selectedTaskId={selectedTaskId}
          onSelect={onSelect}
        />
      ))}
    </>
  );
}

export function TaskTree({ tasks, selectedTaskId, onSelect }: TaskTreeProps) {
  const forest = buildForest(tasks);
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
          />
        ))}
      </tbody>
    </table>
  );
}
