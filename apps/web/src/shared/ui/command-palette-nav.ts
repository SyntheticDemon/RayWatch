import type { SearchHit } from "@/shared/api/client";

export type PaletteNavItem =
  | { type: "hit"; hit: SearchHit }
  | { type: "command"; id: string; label: string; path: string };

export const PALETTE_COMMANDS: Array<{ id: string; label: string; path: string; keywords: string }> = [
  { id: "jobs", label: "Go to Jobs", path: "/", keywords: "jobs home list" },
  { id: "cluster", label: "Go to Cluster", path: "/cluster", keywords: "cluster nodes actors" },
];

export function pathForSearchHit(hit: SearchHit): string {
  if (hit.kind === "job") return `/jobs/${hit.id}`;
  if (hit.kind === "task") {
    if (hit.job_id) return `/jobs/${hit.job_id}?task=${hit.id}`;
    return `/tasks/${hit.id}`;
  }
  if (hit.kind === "actor") return `/cluster?focus=actor&id=${encodeURIComponent(hit.id)}`;
  if (hit.kind === "node") return `/cluster?focus=node&id=${encodeURIComponent(hit.id)}`;
  return `/jobs/${hit.id}`;
}

export function paletteItemsForQuery(query: string, hits: SearchHit[]): PaletteNavItem[] {
  const q = query.trim().toLowerCase();
  const commands: PaletteNavItem[] = PALETTE_COMMANDS.filter(
    (cmd) => !q || cmd.label.toLowerCase().includes(q) || cmd.keywords.includes(q),
  ).map((cmd) => ({ type: "command", id: cmd.id, label: cmd.label, path: cmd.path }));
  const searchHits: PaletteNavItem[] = hits.map((hit) => ({ type: "hit", hit }));
  if (q.length >= 2) return [...commands, ...searchHits];
  return commands;
}
