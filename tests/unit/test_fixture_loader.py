"""Golden fixture loading."""

import json
from pathlib import Path

import pytest
from raywatch.adapter_ray.fixture_loader import load_json_fixture


def test_load_json_fixture_reads_object(tmp_path: Path) -> None:
    path = tmp_path / "payload.json"
    path.write_text(json.dumps({"result": True}), encoding="utf-8")
    assert load_json_fixture(path) == {"result": True}


def test_load_json_fixture_rejects_non_object(tmp_path: Path) -> None:
    path = tmp_path / "array.json"
    path.write_text("[1, 2]", encoding="utf-8")
    with pytest.raises(ValueError, match="JSON object"):
        load_json_fixture(path)
