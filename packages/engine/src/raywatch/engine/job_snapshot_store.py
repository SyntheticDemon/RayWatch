"""Optional Postgres write-through for JobDetail (M5)."""

from __future__ import annotations

import json
import logging
import os
from typing import TYPE_CHECKING

from raywatch.model.job import JobDetail

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
    def __init__(self, database_url: str | None) -> None:
        self._url = database_url
        self._schema_ready = False

    def enabled(self) -> bool:
        return bool(self._url)

    def _connect(self):
        import psycopg

        return psycopg.connect(self._url)

    def ensure_schema(self) -> None:
        if not self.enabled() or self._schema_ready:
            return
        try:
            with self._connect() as conn:
                conn.execute(_SCHEMA)
                conn.commit()
            self._schema_ready = True
        except Exception:
            logger.exception("job_snapshot schema init failed")

    def upsert_jobs(self, jobs: Iterable[JobDetail]) -> None:
        if not self.enabled():
            return
        self.ensure_schema()
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


def snapshot_store_from_env() -> JobSnapshotStore:
    return JobSnapshotStore(os.environ.get("DATABASE_URL"))
