from pydantic import BaseModel


class NodeSummary(BaseModel):
    node_id: str
    hostname: str | None = None
    state: str | None = None
    is_head: bool = False


class ActorSummary(BaseModel):
    actor_id: str
    class_name: str | None = None
    state: str | None = None
    job_id: str | None = None
    worker_id: str | None = None
    node_id: str | None = None
