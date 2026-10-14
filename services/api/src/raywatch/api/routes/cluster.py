from fastapi import APIRouter, HTTPException, Query
from raywatch.api.state import live_cache
from raywatch.model.api_cluster_dto import (
    ActorResponse,
    ActorsPage,
    ClusterOverviewResponse,
    NodeResponse,
    NodesPage,
    ObjectResponse,
    ObjectsPage,
    UtilizationHistoryResponse,
)

router = APIRouter(prefix="/cluster", tags=["cluster"])

_NODE_NOT_FOUND = HTTPException(
    status_code=404,
    detail={"code": "NODE_NOT_FOUND", "message": "Node not in live_cache"},
)
_ACTOR_NOT_FOUND = HTTPException(
    status_code=404,
    detail={"code": "ACTOR_NOT_FOUND", "message": "Actor not in live_cache"},
)
_OBJECT_NOT_FOUND = HTTPException(
    status_code=404,
    detail={"code": "OBJECT_NOT_FOUND", "message": "Object not in live_cache"},
)


@router.get("/overview", response_model=ClusterOverviewResponse)
def cluster_overview() -> ClusterOverviewResponse:
    return ClusterOverviewResponse(
        overview=live_cache.cluster_overview(),
        sync=live_cache.sync_meta(),
    )


@router.get("/nodes", response_model=NodesPage)
def list_nodes() -> NodesPage:
    return NodesPage(items=live_cache.list_nodes(), sync=live_cache.sync_meta())


@router.get("/nodes/{node_id}", response_model=NodeResponse)
def get_node(node_id: str) -> NodeResponse:
    node = live_cache.get_node(node_id)
    if node is None:
        raise _NODE_NOT_FOUND
    return NodeResponse(node=node, sync=live_cache.sync_meta())


@router.get("/actors", response_model=ActorsPage)
def list_actors(limit: int = Query(default=200, ge=1, le=500)) -> ActorsPage:
    return ActorsPage(items=live_cache.list_actors(limit=limit), sync=live_cache.sync_meta())


@router.get("/actors/{actor_id}", response_model=ActorResponse)
def get_actor(actor_id: str) -> ActorResponse:
    actor = live_cache.get_actor(actor_id)
    if actor is None:
        raise _ACTOR_NOT_FOUND
    return ActorResponse(actor=actor, sync=live_cache.sync_meta())


@router.get("/objects", response_model=ObjectsPage)
def list_objects(limit: int = Query(default=200, ge=1, le=500)) -> ObjectsPage:
    return ObjectsPage(items=live_cache.list_objects(limit=limit), sync=live_cache.sync_meta())


@router.get("/objects/{object_id}", response_model=ObjectResponse)
def get_object(object_id: str) -> ObjectResponse:
    obj = live_cache.get_object(object_id)
    if obj is None:
        raise _OBJECT_NOT_FOUND
    return ObjectResponse(object=obj, sync=live_cache.sync_meta())


@router.get("/utilization/history", response_model=UtilizationHistoryResponse)
def utilization_history() -> UtilizationHistoryResponse:
    return UtilizationHistoryResponse(
        items=live_cache.utilization_history(),
        sync=live_cache.sync_meta(),
    )
