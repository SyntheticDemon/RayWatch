# Frontend architecture (planned)

## Stack (intended)

- **React** (or **Next.js** as static export / SPA behind the API) with **TypeScript**  
- **TanStack Query** for HTTP caching, pagination, and invalidation on WebSocket patches  
- **TanStack Table** (or similar) for virtualized, server-driven jobs/tasks tables  
- **Tailwind CSS** + **CSS variables** for dark-first theming  
- **Radix UI** or **shadcn/ui** for accessible drawer, dialog, tabs, dropdown (confirm for destructive actions)  
- **WebSocket client** (or SSE) scoped to subscribed job/task channels  

Exact choices can be finalized in an ADR when the repo scaffold lands; the **structure below** is what we will implement.

## App structure (`apps/web`)

```
apps/web/
  src/
    app/                    # routes (Next) or pages (Vite)
      jobs/
        page.tsx            # Jobs hub table
        [jobId]/
          page.tsx          # Job shell: summary + nested tasks + job logs
    components/
      layout/
        AppShell.tsx        # top bar, theme, global search
        ThemeProvider.tsx   # dark default, system override
      jobs/
        JobsTable.tsx       # server pagination, filters, row actions
        JobSummary.tsx      # status, duration, stop button
        JobTaskTree.tsx     # nested groups/tasks, lazy children fetch
      tasks/
        TaskDrawer.tsx      # slide-over detail
        AttemptTimeline.tsx # state transitions
        TaskMetadata.tsx    # worker, node, actor, refs
      logs/
        LogViewer.tsx       # monospace, levels, tail, copy link
      actions/
        ConfirmStopJob.tsx  # destructive action pattern
    lib/
      api-client.ts         # typed fetch to RayWatch API
      ws.ts                 # subscribe / patch merge
      types.ts              # mirrors canonical model DTOs
    hooks/
      useJob.ts
      useJobTasks.ts
      useTask.ts
      useLogs.ts
```

## Data flow

1. **Jobs page** — `GET /api/jobs?cursor=&state=&q=` → table; row click → job route.  
2. **Job page** — `GET /api/jobs/:id` + `GET /api/jobs/:id/tasks?cursor=` (tree or flat with `parent_id`); optional `WS /jobs/:id` for summary/task patches.  
3. **Task drawer** — `GET /api/tasks/:id?expand=worker,node,actor,attempts,transitions`; `GET /api/tasks/:id/logs?tail=`.  
4. **Actions** — `POST /api/jobs/:id/stop` (etc.) → optimistic UI + refetch or WS event.  

The frontend **never** talks to Ray directly; only to RayWatch API.

## UI patterns

| Surface | Behavior |
|---------|----------|
| Jobs table | Dense but readable; columns: id, status, started, duration, task counts, error snippet; action menu |
| Job view | Header + tabs or sections: Overview · Tasks · Logs · Actions |
| Task tree | Indent + expand; load children on expand; badge for state |
| Task drawer | Right panel; does not unload job context |
| Log viewer | Shared component; `scope=job|task` prop |
| Search | Command palette (⌘K): paste task/job/actor id → navigate |

## Theming

- Default theme: **dark** (`class="dark"` on root).  
- Tokens: `--bg`, `--surface`, `--border`, `--text`, `--muted`, `--accent`, `--success`, `--warning`, `--danger`.  
- Light mode optional later; design in dark first.

## Testing (frontend)

- **Vitest** + **Testing Library** for components (JobsTable filters, ConfirmStopJob).  
- **MSW** to mock API contracts aligned with backend OpenAPI.  
- Optional **Playwright** smoke: jobs list loads, open job, open task drawer.

## Out of scope for initial UI

- Full dependency graph canvas at cluster scale  
- Automatic actor memory introspection  
- Multi-cluster switcher (single Ray cluster per deployment first)  
