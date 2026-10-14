import json
from pathlib import Path
from typing import Any


def load_json_fixture(path: Path) -> dict[str, Any]:
    text = path.read_text(encoding="utf-8")
    data = json.loads(text)
    if not isinstance(data, dict):
        raise ValueError(f"Fixture {path} must be a JSON object")
    return data
