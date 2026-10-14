# ADR 0003: Defer Postgres job_snapshot in MVP

## Status

Accepted (MVP)

## Context

Product requires durable `job_snapshot` after Ray resets.

## Decision

MVP uses **live_cache only** (RAM). Freshness fields expose `sync_delay_ms` and `ray_out_of_sync`. Postgres wiring is M5.

## Consequences

- Meets ops dashboard demo; does not yet survive RayWatch restart.
- NFR tests prove **read latency** on indexed RAM, not durability.

## Learned

Ship read path + honesty flags before disk retention—architect can prioritize M5 next.
