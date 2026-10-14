# Ray primer (for architects)

Short orientation to Ray’s architecture—enough to reason about RayWatch ingestion, UI nesting, and gaps.

## What Ray is

Ray is a **distributed runtime** for Python (and other languages): you call remote functions and classes; Ray **schedules** work across a cluster, stores **shared objects**, and tracks **metadata** on the head node.

## Core concepts

| Concept | Meaning |
|---------|---------|
| **Driver** | Process that calls `ray.init()` and submits work (`.remote()`). |
| **Job** | One driver submission; Ray assigns a **job id**—primary key for our Jobs hub. |
| **Task** | One execution of a `@ray.remote` function (stateless). |
| **Task attempt** | A single run of a task; retries create new attempts. |
| **Actor** | Stateful `@ray.remote` class instance; **methods** are scheduled like tasks on a dedicated worker. |
| **Worker** | OS process on a node that runs tasks/actors. |
| **Node** | Machine in the cluster (CPU/GPU, object store shard). |
| **Object ref** | Handle to a value in the **distributed object store**; tasks depend on refs, not always inlined values. |
| **GCS / head** | Global control service; dashboards and **State API** read cluster metadata from here. |

## Mental model for the UI

Users think: **“my job.”**  
Ray stores: **job → many tasks → on workers → on nodes**, linked by **object dependencies** and **parent/child task** relationships.

RayWatch mirrors that: **Job → (optional group) → Task → Attempt**, with **logs and actions** at job and task scope.

## What RayWatch reads (typical sources)

- **State API** — jobs, tasks, actors, workers, nodes, objects (formats and completeness vary by Ray version).  
- **Task events / runtime events** — lifecycle transitions when exposed.  
- **Logs** — driver, worker, and component logs; correlation uses job id, task id, worker id.  

A **capability matrix** (per Ray version) should map each edge in our graph to a concrete API field or polling strategy; gaps drive optional agents or rare upstream requests.

## What Ray still owns

Scheduling, fault tolerance, object placement, and execution. RayWatch **observes and acts through APIs**; it does not become a second scheduler.
