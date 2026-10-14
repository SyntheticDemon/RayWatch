from raywatch.adapter_ray.log_fetch_cache import (
    clear_log_cache,
    get_cached_log,
    put_cached_log,
)


def test_log_cache_hit_within_ttl(monkeypatch) -> None:
    clear_log_cache()
    monkeypatch.setenv("RAYWATCH_LOG_FETCH_CACHE_TTL_SEC", "5")
    put_cached_log("epoch-a", "job-1", "hello\n")
    assert get_cached_log("epoch-a", "job-1") == "hello\n"
    assert get_cached_log("epoch-b", "job-1") is None


def test_log_cache_disabled_when_ttl_zero(monkeypatch) -> None:
    clear_log_cache()
    monkeypatch.setenv("RAYWATCH_LOG_FETCH_CACHE_TTL_SEC", "0")
    put_cached_log("epoch-a", "job-1", "hello\n")
    assert get_cached_log("epoch-a", "job-1") is None
