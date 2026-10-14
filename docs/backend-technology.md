# Backend technology (fast, modern Python)

RayWatch’s backend is **mostly I/O-bound**: polling Ray’s State API, tailing logs, pushing WebSocket patches. Raw HTTP RPS is not the bottleneck—the **ingestion loop**, **normalization**, and **indexed graph** are. We still use a **current-generation** Python stack so the API and WS layer are not the weak link.

## Recommended stack

| Layer | Choice | Why |
|--------|--------|-----|
| **Language** | **Python 3.13** (floor 3.12) | Latest stable perf and typing; pin Ray-compatible minors in CI. |
| **Project tooling** | **[uv](https://github.com/astral-sh/uv)** | Fast installs, lockfile, workspaces for monorepo (`api`, `collector`, `model`, `adapter-ray`). |
| **Lint / format** | **[Ruff](https://github.com/astral-sh/ruff)** | Replaces flake8/black/isort; fast in CI. |
| **HTTP API** | **[FastAPI](https://fastapi.tiangolo.com/)** or **[Starlette](https://www.starlette.io/)** | Mature ASGI, OpenAPI for the web app, WebSocket support. FastAPI if you want schemas + docs generated from Pydantic. |
| **ASGI server (prod)** | **[Granian](https://github.com/emmett-framework/granian)** (`--interface asgi`) | Rust HTTP server; strong throughput and WebSocket concurrency vs classic Gunicorn+Uvicorn stacks. |
| **ASGI server (dev)** | **Uvicorn** | Simple reload and debugging. |
| **Validation / DTOs** | **Pydantic v2** | Rust-core validation; canonical model and API contracts. |
| **JSON (hot paths)** | **orjson** | Fast serialize for API responses and WS frames. |
| **Ray HTTP client** | **httpx** (async) | Concurrent State API / log fetches with connection pooling. |
| **Logging** | **structlog** | Structured logs for collector and API. |
| **Types** | **mypy** or **pyright** | Strict packages for `model` and `adapter-ray`. |

Optional later: **msgspec** for even faster struct encode/decode if profiling shows JSON as hot; **PostgreSQL** for historical store; **Redis** only if API and collector are split across processes and need pub/sub.

## What “fast” means for RayWatch

1. **Two runtime roles (recommended)**  
   - **Collector process**: async loop—snapshot, incremental poll/events, normalize, update indexes, append history.  
   - **API process**: read-only from the live index + history; WebSockets subscribe to internal events.  
   This keeps slow Ray calls off the request thread and avoids blocking UI queries during a full reconcile.

2. **In-memory indexes first**  
   Dicts + secondary indexes (`tasks_by_job`, `children_by_parent`, etc.) in the collector; API queries are O(1) lookups, not scans of Ray state.

3. **Do not over-async CPU work**  
   Heavy diff/normalize on large batches: run in a **thread pool** or **worker process** so the event loop stays responsive (GIL-aware design).

4. **Framework choice is secondary**  
   Benchmarks show that once you hit external I/O (Ray, DB), **query design and architecture** dominate; Granian + thin ASGI app is enough headroom.

## What we are not doing (yet)

- **Rewriting the engine in Rust/Go** — only if profiling proves Python indexing is insufficient.  
- **Free-threaded CPython (nogil)** — experimental; revisit when Ray + deps support it clearly.  
- **Celery** for ingestion — a dedicated asyncio collector is simpler and lower latency than task queues for live state.

## CI / quality

- **pytest** + **pytest-asyncio**; **anyio** for async tests.  
- Integration job: **Docker** + pinned **Ray** image; golden JSON fixtures for normalization (no cluster needed for unit tests).  
- **OpenAPI** export from FastAPI as the contract for the TypeScript client.

## Related

- [architecture.md](./architecture.md)  
- [frontend.md](./frontend.md)  
