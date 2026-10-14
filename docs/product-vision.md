# Product vision

## Positioning

RayWatch is a **Ray operations and observability dashboard**: manage and understand many jobs, drill into nested execution, read scoped logs, and perform **lifecycle actions from the UI**. Deep inspection (lineage, blocking chains, optional runtime agents) is **advanced drill-down**, not the product headline.

We are **not** trying to make Ray’s built-in dashboard slightly faster. We are building a **dedicated read-optimized interpretation layer** plus a **thin write plane** for safe actions—and a **durable history** of execution that survives Ray’s ephemeral cluster state.

## UX inspiration (Dagster, simplified)

**Inherit from Dagster (conceptually):**

- **Runs hub** → our **Jobs** list (status, duration, errors, actions)  
- **Run detail** → **Job** shell: summary, nested work, logs  
- **Step / attempt** → **Task** with **attempts** and a timeline  
- **Logs** attached to the level you are viewing (job or task), with level filters and tail  

**Do not inherit:**

- Dense navigation, asset-heavy layouts, or “funky” visual complexity  
- Debugger-first copy and causal graphs as the default home  

## Navigation and nesting

1. **Jobs** — table with server-side filter/sort/pagination; search by job id, driver metadata, error text.  
2. **Job** — summary (state, timing, resource hints), nested **groups** then **tasks** (chevrons/indent, lazy load). Middle layer: user **tags**, function name, actor class, or app-defined stage when Ray has no native “stage.”  
3. **Task** — drawer or side panel: attempts, transition timeline, worker → node, actor, object refs, logs.  
4. **Expand on demand** — parent/child tasks, actor methods, object producer/consumers.  

## Visual design

- **Dark mode first:** near-black background, soft gray text, muted borders, semantic status colors readable on dark (no harsh white panels).  
- **One accent**, strong typography, whitespace; **table + drawer + log pane** as the core pattern (Linear/Vercel-like restraint).  
- **No** rendering hundreds of thousands of rows; aggregation is for **navigation**, drill-down preserves **per-entity** inspection.  

## Actions (v1 direction)

Prioritize what operators do daily: **stop / terminate job**, then **kill actor** or related actions as Ray’s public APIs allow—with confirm dialogs and visible outcome in the job/task timeline.
