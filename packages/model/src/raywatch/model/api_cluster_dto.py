from pydantic import BaseModel
from raywatch.model.cluster import (
    ActorSummary,
    ClusterOverview,
    NodeSummary,
    ObjectSummary,
    UtilizationSample,
)
from raywatch.model.freshness import SyncMeta


class NodesPage(BaseModel):
    items: list[NodeSummary]
    sync: SyncMeta


class ActorsPage(BaseModel):
    items: list[ActorSummary]
    sync: SyncMeta


class NodeResponse(BaseModel):
    node: NodeSummary
    sync: SyncMeta


class ActorResponse(BaseModel):
    actor: ActorSummary
    sync: SyncMeta


class ClusterOverviewResponse(BaseModel):
    overview: ClusterOverview
    sync: SyncMeta


class ObjectsPage(BaseModel):
    items: list[ObjectSummary]
    sync: SyncMeta


class ObjectResponse(BaseModel):
    object: ObjectSummary
    sync: SyncMeta


class UtilizationHistoryResponse(BaseModel):
    items: list[UtilizationSample]
    sync: SyncMeta


class KillActorResponse(BaseModel):
    actor_id: str
    accepted: bool
    message: str
    sync: SyncMeta


class ActorLogsResponse(BaseModel):
    actor_id: str
    logs: str
    error_message: str | None = None
    sync: SyncMeta
