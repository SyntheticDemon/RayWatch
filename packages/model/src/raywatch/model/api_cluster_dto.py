from pydantic import BaseModel
from raywatch.model.cluster import ActorSummary, NodeSummary
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
