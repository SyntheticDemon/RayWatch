"""Actor worker logs via Ray log file API (pid + node), or fixture files."""

from __future__ import annotations

import httpx
from raywatch.adapter_ray.fixture_logs import load_fixture_job_logs
from raywatch.adapter_ray.ray_client import fetch_state_log_file, ray_dashboard_base_url
from raywatch.model.cluster import ActorSummary


def _fixture_actor_logs(actor_id: str) -> str | None:
    # Reuse logs/ directory next to jobs fixture (same as job logs).
    return load_fixture_job_logs(actor_id)


async def fetch_logs_for_actor(actor: ActorSummary, *, cluster_epoch: str) -> str:
    if cluster_epoch == "fixture":
        text = _fixture_actor_logs(actor.actor_id)
        if text is not None:
            return text
        return (
            f"INFO No fixture log for actor {actor.actor_id}. "
            f"Add tests/fixtures/ray/logs/{actor.actor_id}.log\n"
        )

    if actor.pid is None or not actor.node_id:
        raise ValueError(
            f"No worker log scope for actor '{actor.actor_id}'. "
            "RayWatch needs the actor pid and node id from Ray state."
        )
    async with httpx.AsyncClient() as client:
        try:
            return await fetch_state_log_file(
                client, pid=actor.pid, node_id=actor.node_id
            )
        except httpx.HTTPStatusError as exc:
            detail = exc.response.text[:400]
            raise ValueError(
                f"Ray refused logs for actor '{actor.actor_id}' at {ray_dashboard_base_url()} "
                f"({exc.response.status_code}). {detail}"
            ) from exc
