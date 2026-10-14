# Frontend features

Planned UI capabilities for RayWatch. **v1** = first shippable slice; **later** = follows once API/index support exists.

## Shell & navigation

| Feature | Phase | Description |
|---------|-------|-------------|
| App shell (header, nav) | v1 | Jobs home; **Actors**, **Cluster**, **Internal runs** tabs |
| Command palette search (⌘K) | v1 | Jump by job / task / actor / worker / object id |
| URL deep links | v1 | Shareable `/jobs/:id`, `/jobs/:id?task=:taskId` |
| Stale / degraded banner | v1 | When ingest paused or data older than threshold |
| Light theme toggle | later | Optional; dark remains default |
| Breadcrumbs | v1 | Jobs → Job name → Task |

## Jobs hub

| Feature | Phase | Description |
|---------|-------|-------------|
| Virtualized jobs table | v1 | Server cursor pagination; never fetch all jobs |
| Column sort (server) | v1 | Started, duration, status, task counts |
| Filters | v1 | Status chips, **last 1h / 24h / 7d** presets + custom range, debounced text search (URL state), per-column filters |
| Quick views | v1 | Tabs or chips: **Running**, **Failed (24h)**, **All** (cursor) |
| Row summary | v1 | Status badge, duration, error one-liner, task run/fail counts |
| Bulk select | later | Multi-select for tag/export; bulk stop only if API supports safely |
| Saved filters | later | Named views (e.g. “prod failures”) |
| Job compare | later | Side-by-side two runs |

## Job detail

| Feature | Phase | Description |
|---------|-------|-------------|
| Job summary header | v1 | Status, timestamps, driver metadata, resource hints |
| Stop / terminate job | v1 | Confirm dialog; show id; error toast on failure |
| Overview stats | v1 | Aggregated task counts by state (running/failed/waiting/done) |
| Nested task tree | v1 | Expand groups (tag / function / actor class); lazy-load children |
| Task state badges | v1 | Color semantic on dark theme |
| Job-scoped log viewer | v1 | Tail, pause, level filter, copy line, download chunk |
| Actions tab | v1 | Stop job + links to related cluster entities |
| Timeline (job-level) | later | High-level milestones (submitted, first task, terminal) |
| Stage / pipeline view | later | When app tags or DAG metadata exist |

## Task inspector (drawer)

| Feature | Phase | Description |
|---------|-------|-------------|
| Task drawer (keep job context) | v1 | Slide-over from job or search |
| Attempt list | v1 | Retry history per task |
| State transition timeline | v1 | Submitted → waiting → running → failed/complete |
| Related entities | v1 | Worker, node, actor (links), parent/child tasks |
| Object refs (in/out) | v1 | Producer/consumer links; copy ref |
| Task-scoped logs | v1 | Same LogViewer component as job |
| Expand one hop | v1 | Click worker → mini worker card; click actor → actor summary |
| Blocking hint | later | “Waiting on object X” from backend derivation |
| Full dependency mini-graph | later | Small graph for one task neighborhood only |

## Actors, workers, nodes (secondary entry)

| Feature | Phase | Description |
|---------|-------|-------------|
| Open actor from task | v1 | Actor id, state, worker, pending/running methods (if API provides) |
| Kill actor | later | Confirm + audit; v1 if Ray API stable in adapter |
| Worker card | v1 | PID, node, active tasks list (paginated) |
| Node summary | later | Workers on node, resource pressure snapshot |
| Global entity search result routes | v1 | Palette resolves any id type to correct view |

## Logs

| Feature | Phase | Description |
|---------|-------|-------------|
| Stream / tail | v1 | WebSocket or chunked poll for live |
| Level filter | v1 | ERROR, WARN, INFO, DEBUG |
| Text filter | v1 | Client filter on loaded window; server `q=` for large scopes |
| Copy link to line | v1 | Deep link with timestamp |
| Wrap / unwrap | v1 | Monospace viewer UX |
| Multi-stream | later | Job + selected task side-by-side |

## Live updates

| Feature | Phase | Description |
|---------|-------|-------------|
| WS patches on open job | v1 | Task rows and summary counts update in place |
| WS on open task drawer | v1 | Status + timeline append |
| Connection indicator | v1 | Connected / reconnecting |
| Manual refresh | v1 | Force resync button |

## Ray CLI console

| Feature | Phase | Description |
|---------|-------|-------------|
| Guided Ray commands | after v1 | Safe list: `status`, `job list`, `job status`, etc.; output in terminal-style panel |
| Embedded terminal (xterm) | v2 | WebSocket PTY to backend `ray` CLI; cluster address preconfigured |
| Contextual “Open in CLI” | v2 | From job row, pre-fill job id / suggested command |
| Allowlisted commands only | v2 | Block shell escape; role-based subcommand set |
| Full shell (admin) | later | Optional deploy flag; audit every line |

Details: [ray-cli-console.md](./ray-cli-console.md).

## Actions & safety

| Feature | Phase | Description |
|---------|-------|-------------|
| Confirm destructive actions | v1 | Stop job (required pattern for all kills) |
| Action result feedback | v1 | Success / error with Ray message |
| Disable while in flight | v1 | Prevent double submit |
| Audit trail view | later | Who stopped what (needs backend auth) |

## UX & accessibility

| Feature | Phase | Description |
|---------|-------|-------------|
| Dark-first design tokens | v1 | Consistent status colors on dark |
| Keyboard navigation | v1 | Table rows, drawer close, palette |
| Focus management in drawer | v1 | Trap focus, Esc to close |
| Reduced motion respect | later | `prefers-reduced-motion` |
| WCAG AA contrast | v1 | Target for text and badges |

## Explicitly not in frontend v1

- Full-cluster graph canvas  
- Multi-cluster switcher  
- In-browser Ray config editor  
- Automatic actor memory / model weights viewer  

## Related

- [frontend.md](./frontend.md) — stack and folder layout  
- [product-vision.md](./product-vision.md)  
- [non-functional-requirements.md](./non-functional-requirements.md)  
