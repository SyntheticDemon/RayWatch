"""Optional durable JobDetail store (Postgres or local JSON dir)."""

from __future__ import annotations

import json
import logging
import os
from pathlib import Path
from typing import TYPE_CHECKING

from raywatch.model.job import JobDetail, JobSummary

if TYPE_CHECKING:
    from collections.abc import Iterable

logger = logging.getLogger(__name__)

_SCHEMA = """
CREATE TABLE IF NOT EXISTS job_snapshot (
    job_id TEXT PRIMARY KEY,
    payload JSONB NOT NULL,
    updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
"""


class JobSnapshotStore:
    def __init__(self, database_url: str | None, snapshot_dir: str | Path | None = None) -> None:
        self._url = database_url
        self._dir = Path(snapshot_dir) if snapshot_dir else None
        self._schema_ready = False

    def enabled(self) -> bool:
        return bool(self._url) or bool(self._dir)

    def _connect(self):
        import psycopg

        if self._url is None:
            raise RuntimeError("Postgres job_snapshot store is not configured")
        return psycopg.connect(self._url)

    def ensure_schema(self) -> None:
        if self._dir is not None:
            self._dir.mkdir(parents=True, exist_ok=True)
        if not self._url or self._schema_ready:
            return
        try:
            with self._connect() as conn:
                conn.execute(_SCHEMA)
                conn.commit()
            self._schema_ready = True
        except Exception:
            logger.exception("job_snapshot schema init failed")

    def _file_path(self, job_id: str) -> Path:
        assert self._dir is not None
        safe = job_id.replace("/", "_")
        return self._dir / f"{safe}.json"

    def upsert_jobs(self, jobs: Iterable[JobDetail]) -> None:
        if not self.enabled():
            return
        self.ensure_schema()
        if self._dir is not None:
            for job in jobs:
                path = self._file_path(job.job_id)
                path.write_text(job.model_dump_json(), encoding="utf-8")
        if not self._url:
            return
        rows = [(j.job_id, json.dumps(j.model_dump(mode="json"))) for j in jobs]
        if not rows:
            return
        try:
            with self._connect() as conn:
                with conn.cursor() as cur:
                    cur.executemany(
                        """
                        INSERT INTO job_snapshot (job_id, payload, updated_at)
                        VALUES (%s, %s::jsonb, now())
                        ON CONFLICT (job_id) DO UPDATE
                        SET payload = EXCLUDED.payload, updated_at = now()
                        """,
                        rows,
                    )
                conn.commit()
        except Exception:
            logger.exception("job_snapshot upsert failed")

    def get_job(self, job_id: str) -> JobDetail | None:
        if not self.enabled():
            return None
        self.ensure_schema()
        if self._dir is not None:
            path = self._file_path(job_id)
            if not path.is_file():
                return None
            try:
                return JobDetail.model_validate_json(path.read_text(encoding="utf-8"))
            except Exception:
                logger.exception("job_snapshot file read failed for %s", job_id)
                return None
        try:
            with self._connect() as conn:
                row = conn.execute(
                    "SELECT payload FROM job_snapshot WHERE job_id = %s",
                    (job_id,),
                ).fetchone()
        except Exception:
            logger.exception("job_snapshot read failed")
            return None
        if row is None:
            return None
        payload = row[0]
        if isinstance(payload, str):
            payload = json.loads(payload)
        return JobDetail.model_validate(payload)

    def iter_job_summaries(self) -> list[JobSummary]:
        if not self.enabled():
            return []
        self.ensure_schema()
        if self._dir is not None:
            summaries: list[JobSummary] = []
            for path in sorted(self._dir.glob("*.json")):
                try:
                    detail = JobDetail.model_validate_json(path.read_text(encoding="utf-8"))
                except Exception:
                    logger.exception("skip corrupt snapshot %s", path)
                    continue
                summaries.append(JobSummary(**detail.model_dump()))
            return summaries
        try:
            with self._connect() as conn:
                rows = conn.execute(
                    "SELECT payload FROM job_snapshot ORDER BY updated_at DESC"
                ).fetchall()
        except Exception:
            logger.exception("job_snapshot list failed")
            return []
        summaries = []
        for row in rows:
            payload = row[0]
            if isinstance(payload, str):
                payload = json.loads(payload)
            detail = JobDetail.model_validate(payload)
            summaries.append(JobSummary(**detail.model_dump()))
        return summaries

    def search_jobs(self, query: str, limit: int = 20) -> list[JobDetail]:
        if not self.enabled():
            return []
        needle = query.strip().lower()
        if not needle:
            return []
        limit = min(max(limit, 1), 50)
        hits: list[JobDetail] = []
        for summary in self.iter_job_summaries():
            if len(hits) >= limit:
                break
            if needle in summary.job_id.lower() or needle in summary.entrypoint.lower():
                detail = self.get_job(summary.job_id)
                if detail is not None:
                    hits.append(detail)
        if self._url and len(hits) < limit:
            try:
                with self._connect() as conn:
                    rows = conn.execute(
                        """
                        SELECT payload FROM job_snapshot
                        WHERE job_id ILIKE %s
                           OR payload->>'entrypoint' ILIKE %s
                        ORDER BY updated_at DESC
                        LIMIT %s
                        """,
                        (f"%{query.strip()}%", f"%{query.strip()}%", limit),
                    ).fetchall()
            except Exception:
                logger.exception("job_snapshot search failed")
                return hits
            seen = {j.job_id for j in hits}
            for row in rows:
                payload = row[0]
                if isinstance(payload, str):
                    payload = json.loads(payload)
                detail = JobDetail.model_validate(payload)
                if detail.job_id not in seen:
                    hits.append(detail)
                    seen.add(detail.job_id)
                if len(hits) >= limit:
                    break
        return hits[:limit]


def snapshot_store_from_env() -> JobSnapshotStore:
    return JobSnapshotStore(
        os.environ.get("DATABASE_URL"),
        os.environ.get("RAYWATCH_SNAPSHOT_DIR"),
    )
