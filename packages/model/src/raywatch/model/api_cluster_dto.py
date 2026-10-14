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
