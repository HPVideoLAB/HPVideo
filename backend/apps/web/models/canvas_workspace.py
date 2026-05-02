"""Canvas workspace persistence — saved DAG workflows.

Each workspace is one user's saved canvas: an arbitrary set of nodes
(blocks) and edges (wires), plus a viewport snapshot for UI restore.
Mirrors the Chat / Tag persistence shape — JSON serialized into a
TEXT column so we don't need migrations every time the canvas
schema evolves.

Sharing is intentionally minimal: a `share_token` (UUID) lets anyone
with the link load the workspace read-only. The link can be revoked
by setting share_token=None. No view counters / acl yet — that's
v0.5 territory.
"""
import json
import time
import uuid
from typing import List, Optional

from peewee import (
    BigIntegerField,
    BooleanField,
    CharField,
    Model,
    TextField,
)
from pydantic import BaseModel
from playhouse.shortcuts import model_to_dict

from apps.web.internal.db import DB


class CanvasWorkspace(Model):
    id = CharField(unique=True)            # UUID
    user_id = CharField(index=True)        # owner
    name = TextField()                     # "Untitled canvas" default; user-editable
    nodes = TextField()                    # JSON array of xyflow nodes
    edges = TextField()                    # JSON array of xyflow edges
    viewport = TextField(null=True)        # optional JSON {x, y, zoom}
    share_token = CharField(null=True, unique=True)  # null = not shared
    archived = BooleanField(default=False)
    created_at = BigIntegerField()
    updated_at = BigIntegerField()

    class Meta:
        database = DB


class CanvasWorkspaceModel(BaseModel):
    id: str
    user_id: str
    name: str
    nodes: str
    edges: str
    viewport: Optional[str] = None
    share_token: Optional[str] = None
    archived: bool = False
    created_at: int
    updated_at: int


class CanvasWorkspaceListItem(BaseModel):
    """Lightweight summary for `/canvas/list` — no node/edge payload."""
    id: str
    name: str
    archived: bool
    has_share_token: bool
    created_at: int
    updated_at: int


class CanvasWorkspaceTable:
    def __init__(self, db):
        self.db = db
        self.db.create_tables([CanvasWorkspace])

    def insert(
        self,
        user_id: str,
        name: str,
        nodes_json: str,
        edges_json: str,
        viewport_json: Optional[str] = None,
    ) -> CanvasWorkspaceModel:
        now = int(time.time())
        ws = CanvasWorkspace.create(
            id=str(uuid.uuid4()),
            user_id=user_id,
            name=name or "Untitled canvas",
            nodes=nodes_json,
            edges=edges_json,
            viewport=viewport_json,
            share_token=None,
            archived=False,
            created_at=now,
            updated_at=now,
        )
        return CanvasWorkspaceModel(**model_to_dict(ws))

    def update(
        self,
        id: str,
        user_id: str,
        name: Optional[str] = None,
        nodes_json: Optional[str] = None,
        edges_json: Optional[str] = None,
        viewport_json: Optional[str] = None,
    ) -> Optional[CanvasWorkspaceModel]:
        try:
            ws = CanvasWorkspace.get(
                (CanvasWorkspace.id == id) & (CanvasWorkspace.user_id == user_id)
            )
        except CanvasWorkspace.DoesNotExist:
            return None
        if name is not None:
            ws.name = name
        if nodes_json is not None:
            ws.nodes = nodes_json
        if edges_json is not None:
            ws.edges = edges_json
        if viewport_json is not None:
            ws.viewport = viewport_json
        ws.updated_at = int(time.time())
        ws.save()
        return CanvasWorkspaceModel(**model_to_dict(ws))

    def get_by_id(self, id: str, user_id: str) -> Optional[CanvasWorkspaceModel]:
        try:
            ws = CanvasWorkspace.get(
                (CanvasWorkspace.id == id) & (CanvasWorkspace.user_id == user_id)
            )
            return CanvasWorkspaceModel(**model_to_dict(ws))
        except CanvasWorkspace.DoesNotExist:
            return None

    def get_by_share_token(self, token: str) -> Optional[CanvasWorkspaceModel]:
        try:
            ws = CanvasWorkspace.get(CanvasWorkspace.share_token == token)
            return CanvasWorkspaceModel(**model_to_dict(ws))
        except CanvasWorkspace.DoesNotExist:
            return None

    def list_by_user(self, user_id: str, include_archived: bool = False) -> List[CanvasWorkspaceListItem]:
        q = CanvasWorkspace.select().where(CanvasWorkspace.user_id == user_id)
        if not include_archived:
            q = q.where(CanvasWorkspace.archived == False)  # noqa: E712 (peewee needs ==False, not `is`)
        q = q.order_by(CanvasWorkspace.updated_at.desc())
        return [
            CanvasWorkspaceListItem(
                id=ws.id,
                name=ws.name,
                archived=ws.archived,
                has_share_token=bool(ws.share_token),
                created_at=ws.created_at,
                updated_at=ws.updated_at,
            )
            for ws in q
        ]

    def delete(self, id: str, user_id: str) -> bool:
        q = CanvasWorkspace.delete().where(
            (CanvasWorkspace.id == id) & (CanvasWorkspace.user_id == user_id)
        )
        return q.execute() > 0

    def set_share_token(self, id: str, user_id: str, enable: bool) -> Optional[str]:
        """Mint or revoke a share token. Returns the new token or None
        when revoking / when the workspace doesn't belong to user."""
        try:
            ws = CanvasWorkspace.get(
                (CanvasWorkspace.id == id) & (CanvasWorkspace.user_id == user_id)
            )
        except CanvasWorkspace.DoesNotExist:
            return None
        if enable:
            if not ws.share_token:
                ws.share_token = str(uuid.uuid4()).replace("-", "")
        else:
            ws.share_token = None
        ws.updated_at = int(time.time())
        ws.save()
        return ws.share_token


CanvasWorkspaceInstall = CanvasWorkspaceTable(DB)
