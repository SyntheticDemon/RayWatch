from pydantic import BaseModel


class NodeSummary(BaseModel):
    node_id: str
    hostname: str | None = None
    state: str | None = None
    is_head: bool = False
    cpu_total: float | None = None
    gpu_total: float | None = None
    memory_bytes_total: float | None = None
    object_store_bytes_total: float | None = None


class ClusterOverview(BaseModel):
    nodes_total: int
    nodes_alive: int
    actors_total: int
    cpu_total: float
    gpu_total: float
    memory_bytes_total: float
    job_count: int
    task_count: int


class ActorSummary(BaseModel):
    actor_id: str
    class_name: str | None = None
    state: str | None = None
    job_id: str | None = None
    worker_id: str | None = None
    node_id: str | None = None
