# Benchmark results

Generated when you run:

```bash
make benchmark
RAYWATCH_BENCHMARK_WRITE=1 make benchmark
make benchmark-ray   # RayWatch + Ray dashboard on a live head
```

Output file: **`jobs-list-latency.md`** (tracked in git; refreshed automatically).

| Command | Updates report |
|---------|----------------|
| `make perf` | Read-path regression section (cold + gate p95) |
| `make benchmark` | RayWatch vs Ray section (Ray column if head is up) |
| `make benchmark-ray` | Both; Ray column with live cluster |

Tune scales with `BENCHMARK_JOB_SCALES=50,200,500,1000`.

**Scales reference:** [docs/benchmark-scales.md](../docs/benchmark-scales.md)  
**Busy Ray for UI/logs:** `make demo-ray`
