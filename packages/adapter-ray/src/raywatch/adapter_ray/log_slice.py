"""Slice job log text for tail / incremental fetch."""

from __future__ import annotations

from dataclasses import dataclass


@dataclass(frozen=True)
class LogSlice:
    text: str
    content_offset: int
    content_length: int


def slice_job_logs(
    full_text: str,
    *,
    tail_lines: int | None = None,
    after_offset: int | None = None,
) -> LogSlice:
    content_length = len(full_text)
    if after_offset is not None and after_offset > 0:
        start = min(after_offset, content_length)
        return LogSlice(
            text=full_text[start:],
            content_offset=start,
            content_length=content_length,
        )
    if tail_lines is not None and tail_lines > 0:
        lines = full_text.splitlines(keepends=True)
        if len(lines) <= tail_lines:
            return LogSlice(
                text=full_text,
                content_offset=0,
                content_length=content_length,
            )
        tail = "".join(lines[-tail_lines:])
        return LogSlice(
            text=tail,
            content_offset=content_length - len(tail),
            content_length=content_length,
        )
    return LogSlice(text=full_text, content_offset=0, content_length=content_length)
