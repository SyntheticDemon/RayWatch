from raywatch.adapter_ray.log_slice import slice_job_logs


def test_slice_full_log_by_default() -> None:
    text = "line1\nline2\n"
    sliced = slice_job_logs(text)
    assert sliced.text == text
    assert sliced.content_offset == 0
    assert sliced.content_length == len(text)


def test_slice_tail_lines() -> None:
    text = "a\nb\nc\nd\n"
    sliced = slice_job_logs(text, tail_lines=2)
    assert sliced.text == "c\nd\n"
    assert sliced.content_offset == 4
    assert sliced.content_length == len(text)


def test_slice_after_offset() -> None:
    text = "hello-world"
    sliced = slice_job_logs(text, after_offset=5)
    assert sliced.text == "-world"
    assert sliced.content_offset == 5
    assert sliced.content_length == len(text)


def test_slice_after_offset_past_end() -> None:
    text = "short"
    sliced = slice_job_logs(text, after_offset=100)
    assert sliced.text == ""
    assert sliced.content_offset == len(text)
