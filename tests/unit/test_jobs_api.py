import pytest
from httpx import AsyncClient


@pytest.mark.asyncio
async def test_list_jobs_from_fixture(api_client: AsyncClient) -> None:
    response = await api_client.get("/jobs")
    assert response.status_code == 200
    body = response.json()
    assert len(body["items"]) == 3
    assert body["sync"]["source"] == "live_cache"
    assert body["sync"]["ray_out_of_sync"] is False
    assert body["sync"]["sync_delay_ms"] is not None


@pytest.mark.asyncio
async def test_list_jobs_job_kind_query(api_client: AsyncClient) -> None:
    response = await api_client.get("/jobs", params={"job_kind": "submission"})
    assert response.status_code == 200
    bad = await api_client.get("/jobs", params={"job_kind": "invalid"})
    assert bad.status_code == 422


@pytest.mark.asyncio
async def test_get_job_detail(api_client: AsyncClient) -> None:
    response = await api_client.get("/jobs/01000000")
    assert response.status_code == 200
    job = response.json()["job"]
    assert job["job_id"] == "01000000"
    assert job["status"] == "RUNNING"
    assert job["metadata"]["user"] == "demo"


@pytest.mark.asyncio
async def test_job_logs_fixture_mode(api_client: AsyncClient) -> None:
    response = await api_client.get("/jobs/01000000/logs")
    assert response.status_code == 200
    body = response.json()
    assert body.get("error_message") in (None, "")
    assert "train.py" in body["logs"]
    assert body["content_length"] == len(body["logs"])
    assert body["content_offset"] == 0


@pytest.mark.asyncio
async def test_job_logs_tail_and_incremental(api_client: AsyncClient) -> None:
    full = await api_client.get("/jobs/01000000/logs")
    assert full.status_code == 200
    full_body = full.json()
    full_text = full_body["logs"]
    tail = await api_client.get("/jobs/01000000/logs", params={"tail_lines": 1})
    assert tail.status_code == 200
    tail_body = tail.json()
    assert tail_body["logs"] in full_text
    assert tail_body["content_length"] == len(full_text)
    assert tail_body["content_offset"] > 0

    offset = len(full_text) - 3
    delta = await api_client.get("/jobs/01000000/logs", params={"after_offset": offset})
    assert delta.status_code == 200
    delta_body = delta.json()
    assert delta_body["logs"] == full_text[offset:]
    assert delta_body["content_offset"] == offset


@pytest.mark.asyncio
async def test_freshness_endpoint(api_client: AsyncClient) -> None:
    response = await api_client.get("/freshness")
    assert response.status_code == 200
    body = response.json()
    assert body["job_count"] == 3
    assert "sync_delay_ms" in body["sync"]
