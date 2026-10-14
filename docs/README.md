# RayWatch documentation

RayWatch is a read-optimized operations and observability layer on top of [Ray](https://www.ray.io/), without forking Ray. These documents capture product intent, system architecture, and how Ray fits in—for contributors and architects new to Ray.****

| Document | Purpose |
|----------|---------|
| [architecture.md](./architecture.md) | System layers, data model, challenges, and build order |
| [architecture-levels.md](./architecture-levels.md) | Progressive diagrams (level 1 → 5) |
| [architecture-full-diagram.md](./architecture-full-diagram.md) | **Full component diagram** (read this for the big picture) |
| [product-vision.md](./product-vision.md) | UX goals (jobs hub, nesting, Dagster-like workflow, simple dark UI) |
| [ray-primer.md](./ray-primer.md) | Ray concepts for high-level architects |
| [frontend.md](./frontend.md) | Planned web app structure and UI patterns |
| [frontend-features.md](./frontend-features.md) | Feature list by phase (v1 vs later) |
| [ray-cli-console.md](./ray-cli-console.md) | Browser-hosted `ray` CLI (guided → PTY, security) |
| [persistence-and-history.md](./persistence-and-history.md) | Durable state when Ray resets or forgets |
| [metadata-lineage.md](./metadata-lineage.md) | Asset/metadata lineage retained on top of Ray |
| [job-retention-requirements.md](./job-retention-requirements.md) | Full per-job bundle persisted |
| [docker-and-devkit.md](./docker-and-devkit.md) | Images, compose, `make test` kit |
| [sync-with-ray.md](./sync-with-ray.md) | Live cache vs Ray truth; anti-desync |
| [coding-standards.md](./coding-standards.md) | Repo layout, Python/TS, API, tests, PRs |
| [naming-registry.md](./naming-registry.md) | Locked domain names (after naming game) |
| [mvp-scope.md](./mvp-scope.md) | Implementation milestones M0–M6 |
| [backend-technology.md](./backend-technology.md) | Modern fast Python stack (uv, Granian, async collector) |
| [testing.md](./testing.md) | Unit, contract, Ray-in-Docker integration, e2e |
| [non-functional-requirements.md](./non-functional-requirements.md) | Performance, scale, security, ops, UX targets |
