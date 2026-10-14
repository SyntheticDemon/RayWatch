from raywatch.engine.live_cache import LiveCache
from raywatch.model.cluster import ActorSummary, NodeSummary
from raywatch.model.ingest import IngestBatch, IngestOp
from raywatch.model.job import JobDetail, JobStatus
from raywatch.model.task import TaskStatus, TaskSummary


def test_search_entities_includes_actor_and_node() -> None:
    cache = LiveCache()
    cache.apply_ingest_batch(
        IngestBatch(
            ops=[
                IngestOp(
                    kind="upsert_job",
                    job=JobDetail(
                        job_id="job-1",
                        status=JobStatus.RUNNING,
                        entrypoint="main.py",
                    ),
                ),
                IngestOp(
                    kind="upsert_task",
                    task=TaskSummary(
                        task_id="task-abc",
                        job_id="job-1",
                        name="run",
                        status=TaskStatus.RUNNING,
                        func_or_class="my_fn",
                    ),
                ),
            ]
        )
    )
    cache.set_cluster_snapshot(
        nodes=[NodeSummary(node_id="node-xyz", hostname="worker-1", state="ALIVE")],
        actors=[
            ActorSummary(actor_id="actor-99", class_name="Counter", state="ALIVE", job_id="job-1"),
        ],
    )

    actor_hits = cache.search_entities("counter", limit=10)
    assert any(h["kind"] == "actor" for h in actor_hits)

    node_hits = cache.search_entities("worker-1", limit=10)
    assert any(h["kind"] == "node" for h in node_hits)

    task_hits = cache.search_entities("my_fn", limit=10)
    assert any(h["kind"] == "task" for h in task_hits)
