from datetime import datetime

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


class UtilizationSample(BaseModel):
    recorded_at: datetime
    cpu_used: float
    cpu_total: float
    memory_bytes_used: float
    memory_bytes_total: float
    object_store_bytes_used: float
    object_store_bytes_total: float


class ResourceUtilization(BaseModel):
    cpu_used: float
    cpu_total: float
    memory_bytes_used: float
    memory_bytes_total: float
    object_store_bytes_used: float
    object_store_bytes_total: float


class ClusterOverview(BaseModel):
    nodes_total: int
    nodes_alive: int
    actors_total: int
    objects_total: int
    cpu_total: float
    gpu_total: float
    memory_bytes_total: float
    job_count: int
    task_count: int
    utilization: ResourceUtilization | None = None


class ActorSummary(BaseModel):
    actor_id: str
    class_name: str | None = None
    name: str | None = None
    repr_name: str | None = None
    state: str | None = None
    job_id: str | None = None
    worker_id: str | None = None
    node_id: str | None = None
    pid: int | None = None
    ray_namespace: str | None = None
    num_restarts: int = 0
    placement_group_id: str | None = None


class ObjectSummary(BaseModel):
    object_id: str
    object_size: int | None = None
    reference_type: str | None = None
    task_status: str | None = None
    owner_type: str | None = None
    pid: int | None = None
    ip: str | None = None
