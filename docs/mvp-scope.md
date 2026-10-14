# MVP scope (implementation order)

1. **M0 scaffold** — monorepo, health API, tests, Docker, web shell ✅  
2. **M1 model** — `Job`, `Task`, ingest types + golden normalize fixtures ✅  
3. **M2 collector** — `sync_active_jobs` → `live_cache` ✅ (embedded in API for MVP)  
4. **M3 API** — `GET /jobs`, `GET /jobs/{id}`, `/freshness`, `sync` fields ✅  
5. **M4 UI** — jobs table + job detail from API ✅  
6. **M5** — `job_snapshot` to Postgres (deferred, see ADR 0003)  
7. **M6** — `POST /jobs/{id}/stop` ✅ · WS patches (deferred)  

See [architecture.md](./architecture.md) for full roadmap.
