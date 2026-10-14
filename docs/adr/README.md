# Architecture Decision Records (ADRs)

RayWatch uses short ADRs so **code and docs stay aligned** and the **architect can review tradeoffs** before we spread a pattern across the repo.

## When to write an ADR

| Situation | Action |
|-----------|--------|
| New storage, process split, or public API break | **New ADR** + PR tagged `architecture` |
| Ray version pin or dashboard API shape change | Update ADR **0004** or add **0005** |
| Deferred scope (e.g. Postgres) | ADR with **Accepted** + consequences (see **0003**) |
| Small refactor, same boundaries | No ADR; mention in PR body |

## Template

Copy into `docs/adr/NNNN-short-title.md`:

```markdown
# ADR NNNN: Title

## Status
Proposed | Accepted | Superseded by NNNN

## Context
What problem and constraints?

## Decision
What we will do.

## Consequences
What gets easier / harder; what we are not doing yet.

## Open questions / guesses
What we could not verify; hypotheses for follow-up.
```

## Architect sync

1. Open a PR with the ADR in **Proposed** (or describe the decision in the PR if tiny).
2. Link related docs (`architecture.md`, `mvp-scope.md`, NFRs).
3. Do **not** merge behavior that contradicts an **Accepted** ADR without superseding it.
4. Unresolved risks go in [known-challenges.md](../known-challenges.md), not only in chat.

## Index

| ADR | Topic |
|-----|--------|
| [0001](./0001-mvp-single-process.md) | API + embedded sync loop |
| [0002](./0002-fixture-first-ingest.md) | Fixture-first CI |
| [0003](./0003-defer-postgres.md) | Defer `job_snapshot` in MVP |
| [0004](./0004-ray-version-grounding.md) | Pin and test real Ray |
