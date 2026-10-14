# Architecture (five levels)

Progressive explanation from simplest to full system. Read one level at a time.

---

## Level 1 — Who talks to whom

Ray **runs** work. RayWatch **backend** reads Ray and serves the **browser**; the UI never calls Ray directly.

```mermaid
flowchart LR
  U[Browser] --> API[RayWatch backend]
  API --> R[Ray cluster]
  R -.->|state logs| API
  API -.->|actions| R
```

---

## Level 2 — Read path vs write path

Two pipelines in the backend: **observe** (continuous) and **act** (on demand).

```mermaid
flowchart TB
  subgraph UI["Browser"]
    FE[Frontend]
  end

  subgraph RW["RayWatch backend"]
    API[API + WebSockets]
    COL[Collector]
    IDX[(Live index + graph)]
    CTL[Control actions]
  end

  subgraph Ray["Ray cluster"]
    R[State API · logs · job control]
  end

  FE -->|GET search logs| API
  FE -->|WS patches| API
  FE -->|POST stop| API

  API -->|read| IDX
  API --> CTL

  COL -->|poll events| R
  R -.->|state| COL
  COL -->|normalize| IDX

  CTL -->|stop kill| R
```

| Path | Flow | Purpose |
|------|------|---------|
| **Read** | Ray → Collector → index → API → UI | Fast dashboards; no full-cluster fetch per click |
| **Write** | UI → API → Control → Ray | Stop job, kill actor, etc.; index updates on next ingest |

---

## Level 3 — Inside the backend (read pipeline)

The **collector** owns freshness; the **API** only reads materialized state and pushes deltas to open UI sessions.

```mermaid
flowchart LR
  subgraph Ray
    SA[State API]
    EV[Task events]
    LG[Logs]
  end

  subgraph Collector
    ADP[Ray adapter]
    NORM[Normalize]
    ENG[Index engine]
    BUS[Event bus]
  end

  subgraph Store
    LIVE[(Live index)]
    HIST[(Historical — optional)]
  end

  subgraph API
    HTTP[HTTP queries]
    WS[WebSocket fan-out]
    CTL[Control]
  end

  SA --> ADP
  EV --> ADP
  LG --> ADP
  ADP --> NORM
  NORM --> ENG
  ENG --> LIVE
  ENG --> HIST
  ENG --> BUS
  BUS --> WS

  HTTP --> LIVE
  HTTP --> HIST
  CTL --> Ray
```

| Step | Component | What it does |
|------|-----------|--------------|
| **1. Ingest** | **Ray adapter** | Snapshot on startup; then poll/events for jobs, tasks, actors, workers, nodes, objects, log tails. All Ray-specific HTTP/SDK calls stay here. |
| **2. Normalize** | **Normalizer** | Map Ray JSON → **canonical entities + edges** (independent of Ray dashboard shapes). Emit upserts, deletes, transition events. |
| **3. Store** | **Index engine** | Update **live** indexes (`task_by_id`, `tasks_by_job`, …). Optionally append **historical** rows for completed work. |
| **4. Query** | **HTTP API** | UI calls `GET /jobs`, `GET /tasks/:id?expand=…` — **only** the index, never Ray per request. |
| **5. Stream** | **Event bus → WebSocket** | After index updates, push **patches** to clients subscribed to a job/task channel. |
| **Write** | **Control** | Side path: `POST /jobs/:id/stop` → Ray; collector picks up new state on next ingest (no direct UI → Ray for reads). |

**Why split collector vs API:** Ray I/O is slow and bursty; request handlers stay fast and predictable.

---

## Level 4 — Execution graph (data model)

Everything RayWatch stores is a **graph**: **nodes** (entities) and **edges** (relationships). The UI “nesting” and inspector are just walks on this graph.

### Entities (nodes)

| Entity | Meaning |
|--------|---------|
| **Job** | One driver submission (Ray job id). |
| **Task** | One logical unit of work (remote function or actor method). |
| **Attempt** | One run of a task (retries = new attempts). |
| **Actor** | Stateful remote class instance. |
| **Worker** | Process running tasks/actors. |
| **Node** | Machine hosting workers. |
| **Object** | Object ref in the store (dependency handle). |

### Relationships (edges)

```mermaid
flowchart TB
  J[Job]
  T[Task]
  A[Attempt]
  AC[Actor]
  W[Worker]
  N[Node]
  O[Object]

  J -->|contains| T
  T -->|has| A
  T -->|runs_on| W
  W -->|on| N
  T -->|invokes| AC
  AC -->|pinned_on| W
  T -->|parent_of| T
  T -->|child_of| T
  T -->|reads| O
  T -->|writes| O
  O -->|produced_by| T
  O -->|consumed_by| T
```

### Typical debug walks (what the UI does)

| You select… | Graph walk |
|-------------|------------|
| **Task** | task → attempts, worker → node, actor, parent/child tasks, input/output objects, transitions |
| **Job** | job → tasks (paginated / grouped), aggregate counts by state |
| **Object** | object → producer task, consumer tasks (“who is blocked on this?”) |
| **Actor** | actor → worker → node, running/pending methods as tasks |

### Indexes (why lookups are fast)

Same information as the graph, stored for query—not for drawing the whole cluster at once:

- `job_by_id`, `tasks_by_job`, `task_by_id`, `attempts_by_task`
- `worker_by_id`, `workers_by_node`, `tasks_by_worker`
- `actor_by_id`, `tasks_by_actor`
- `children_by_parent_task`, `objects_by_task_in/out`

The **normalizer** writes entities + edges; the **index engine** maintains these maps.

---

## Level 5 — Scale & ops

*(Next: retention, historical store, 100k jobs, WS fan-out.)*
