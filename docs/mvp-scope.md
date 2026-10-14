# MVP scope (implementation order)

1. **M0 scaffold** — monorepo, health API, tests, Docker, web shell ✅  
2. **M1 model** — `Job`, `Task`, `Attempt` types + golden normalize fixtures  
3. **M2 collector** — `sync_active_jobs`, `live_cache`, watermarks  
4. **M3 API** — `GET /jobs`, `GET /jobs/{id}`, freshness fields  
4. **M4 UI** — jobs table + job detail from API  
5. **M5** — `job_snapshot` to Postgres, `ray_out_of_sync`  
6. **M6** — stop job (control) + WS patches  

See [architecture.md](./architecture.md) for full roadmap.
