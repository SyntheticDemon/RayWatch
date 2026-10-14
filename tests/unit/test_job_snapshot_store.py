import json

from raywatch.engine.job_snapshot_store import JobSnapshotStore
from raywatch.model.job import JobDetail, JobStatus


class _FakeCursor:
    def __init__(self) -> None:
        self.rows: list[tuple] = []

    def executemany(self, _sql: str, rows: list) -> None:
        for row in rows:
            self.rows.append(row)

    def __enter__(self):
        return self

    def __exit__(self, *args) -> None:
        return None


class _FakeConn:
    def __init__(self) -> None:
        self.storage: dict[str, dict] = {}
        self._cursor = _FakeCursor()

    def execute(self, sql: str, params=None):
        if params and "SELECT" in sql:
            job_id = params[0]
            payload = self.storage.get(job_id)
            return _RowResult((payload,) if payload else None)
        return _RowResult(None)

    def cursor(self):
        return self._cursor

    def commit(self) -> None:
        for job_id, payload_json in self._cursor.rows:
            self.storage[job_id] = json.loads(payload_json)

    def __enter__(self):
        return self

    def __exit__(self, *args) -> None:
        return None


class _RowResult:
    def __init__(self, row) -> None:
        self._row = row

    def fetchone(self):
        return self._row

    def fetchall(self):
        return [self._row] if self._row else []


def test_snapshot_upsert_and_read(monkeypatch) -> None:
    store = JobSnapshotStore("postgresql://fake")
    fake = _FakeConn()
    monkeypatch.setattr(store, "_connect", lambda: fake)
    store._schema_ready = True
    job = JobDetail(job_id="j1", status=JobStatus.SUCCEEDED, entrypoint="echo hi")
    store.upsert_jobs([job])
    loaded = store.get_job("j1")
    assert loaded is not None
    assert loaded.entrypoint == "echo hi"


def test_snapshot_search(monkeypatch) -> None:
    store = JobSnapshotStore("postgresql://fake")
    fake = _FakeConn()
    fake.storage["j-find"] = {
        "job_id": "j-find",
        "status": "SUCCEEDED",
        "entrypoint": "grep me",
        "metadata": {},
    }
    monkeypatch.setattr(store, "_connect", lambda: fake)
    store._schema_ready = True

    class _SearchConn(_FakeConn):
        def execute(self, sql, params=None):
            if params and "ILIKE" in sql:
                return _RowResult((fake.storage["j-find"],))
            return super().execute(sql, params)

    monkeypatch.setattr(store, "_connect", lambda: _SearchConn())
    jobs = store.search_jobs("grep", limit=5)
    assert len(jobs) == 1
    assert jobs[0].job_id == "j-find"
