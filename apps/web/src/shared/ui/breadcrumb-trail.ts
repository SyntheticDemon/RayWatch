import type { BreadcrumbItem } from "@/shared/ui/breadcrumbs";

function shortId(id: string, max = 12): string {
  if (id.length <= max) return id;
  return `${id.slice(0, max)}…`;
}

export function jobDetailBreadcrumbs(args: {
  jobId: string;
  entrypoint?: string | null;
  taskId?: string | null;
  taskLabel?: string | null;
}): BreadcrumbItem[] {
  const jobLabel = args.entrypoint?.trim() || shortId(args.jobId);
  const items: BreadcrumbItem[] = [
    { label: "Jobs", to: "/" },
    { label: jobLabel, to: `/jobs/${args.jobId}` },
  ];
  if (args.taskId) {
    items.push({
      label: args.taskLabel?.trim() || shortId(args.taskId, 16),
      current: true,
    });
  } else {
    items[items.length - 1] = { label: jobLabel, current: true };
  }
  return items;
}

export function taskPageBreadcrumbs(args: {
  jobId: string;
  taskId: string;
  taskLabel?: string | null;
}): BreadcrumbItem[] {
  return [
    { label: "Jobs", to: "/" },
    { label: shortId(args.jobId), to: `/jobs/${args.jobId}` },
    {
      label: args.taskLabel?.trim() || shortId(args.taskId, 16),
      current: true,
    },
  ];
}

export function clusterBreadcrumbs(): BreadcrumbItem[] {
  return [{ label: "Jobs", to: "/" }, { label: "Cluster", current: true }];
}
