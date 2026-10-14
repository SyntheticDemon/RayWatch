"""Classify Ray job ids for list filters (submission vs driver/internal)."""

from __future__ import annotations

import re

_SUBMISSION_HEX = re.compile(r"^[0-9a-f]{8}$", re.IGNORECASE)


def is_submission_job_id(job_id: str) -> bool:
    """True for Ray Jobs API submission ids and 8-char fixture driver ids."""
    return job_id.startswith("raysubmit_") or bool(_SUBMISSION_HEX.fullmatch(job_id))


def job_id_matches_kind(job_id: str, job_kind: str | None) -> bool:
    if job_kind is None:
        return True
    submission = is_submission_job_id(job_id)
    if job_kind == "submission":
        return submission
    if job_kind == "internal":
        return not submission
    return True
