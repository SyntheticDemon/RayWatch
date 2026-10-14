"""Integration tests run inside compose with Ray (scaffold)."""

import pytest


@pytest.mark.integration
def test_integration_placeholder() -> None:
    """Replace with Ray submit smoke once compose Ray service is wired."""
    pytest.skip("Integration stack not wired yet")
