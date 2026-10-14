from datetime import datetime

from pydantic import BaseModel


class SyncMeta(BaseModel):
    """Attached to API responses so clients know trust level."""

    source: str = "live_cache"
    last_sync_at: datetime | None = None
    sync_delay_ms: int | None = None
    ray_out_of_sync: bool = False
    cluster_epoch: str = "default"
