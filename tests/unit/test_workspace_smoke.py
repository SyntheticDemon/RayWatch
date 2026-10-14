"""Workspace import smoke tests."""


def test_model_package_imports() -> None:
    import raywatch.model  # noqa: F401


def test_engine_package_imports() -> None:
    import raywatch.engine  # noqa: F401


def test_adapter_ray_package_imports() -> None:
    import raywatch.adapter_ray  # noqa: F401
