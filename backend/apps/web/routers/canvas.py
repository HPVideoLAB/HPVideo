"""
Canvas v0.3 backend router.

Single endpoint POST /api/v1/canvas/run-block. Receives a block
description, dispatches to a real generation path, returns a result.

v0.3 cut: stub mode by default — returns a placeholder URL after a
short delay so the frontend can prove its DAG executor works without
spending real credits. Set CANVAS_RUN_MODE=real (env) to flip on the
actual model calls; that path comes online in v0.4 once we've vetted
each block-type's wiring against the existing x402 / wave / oss
infrastructure.
"""
import asyncio
import logging
import os
import uuid

from fastapi import APIRouter, Depends, HTTPException, Request, status
from pydantic import BaseModel
from typing import Any, Dict, Literal, Optional
from slowapi import Limiter
from slowapi.util import get_remote_address

from utils.utils import get_current_user

log = logging.getLogger(__name__)
router = APIRouter()
limiter = Limiter(key_func=get_remote_address)

# v0.3 ships in stub mode. v0.4 sets CANVAS_RUN_MODE=real and adds the
# per-block dispatch tables.
CANVAS_RUN_MODE = os.getenv("CANVAS_RUN_MODE", "stub")

# Demo media URLs used by the stub. Hosted on the same OSS bucket as
# the rest of the product so they actually play in <video> / <img>.
STUB_IMAGE_URL = (
    "https://degptwav.oss-cn-hongkong.aliyuncs.com/canvas-demo/sample-image.jpg"
)
STUB_VIDEO_URL = (
    "https://degptwav.oss-cn-hongkong.aliyuncs.com/canvas-demo/sample-video.mp4"
)


class CanvasRunBlockRequest(BaseModel):
    block_id: str
    block_type: Literal[
        "imageref", "prompt", "imagegen", "videogen", "voice", "stitcher"
    ]
    config: Dict[str, Any] = {}
    # Resolved upstream outputs the block depends on, e.g.
    # `{"prompt": "a cat on a roof", "first_frame_url": "https://..."}`.
    inputs: Dict[str, Any] = {}


class CanvasRunBlockResponse(BaseModel):
    block_id: str
    status: Literal["ok", "failed"]
    # Type-tagged result so the frontend can wire it into the next block.
    output_kind: Optional[Literal["image", "video", "audio", "text"]] = None
    output_url: Optional[str] = None
    output_text: Optional[str] = None
    cost_cr: int = 0
    error: Optional[str] = None
    # Round-trip elapsed seconds so the frontend can show "took 4.2s".
    elapsed_s: float = 0.0
    mode: str = "stub"


@router.post("/run-block", response_model=CanvasRunBlockResponse)
@limiter.limit("60/minute")
async def run_block(
    request: Request,
    body: CanvasRunBlockRequest,
    user=Depends(get_current_user),
):
    """Run a single canvas block.

    The frontend walks the DAG topologically and calls this endpoint
    once per block, in dependency order, threading each block's
    `output_url` into the next block's `inputs`. Wire-protocol stays
    flat (no SSE / WebSocket) so v0.3 can ship without new infra.
    """
    import time
    started = time.monotonic()

    if CANVAS_RUN_MODE == "stub":
        return await _run_stub(body, started)

    # v0.4 real-mode dispatch lands here.
    raise HTTPException(
        status_code=status.HTTP_501_NOT_IMPLEMENTED,
        detail=(
            "CANVAS_RUN_MODE=real is not implemented yet. v0.3 ships in "
            "stub mode so the frontend DAG executor can be exercised "
            "without real generation cost. Switch the env var when v0.4 "
            "lands."
        ),
    )


async def _run_stub(body: CanvasRunBlockRequest, started: float) -> CanvasRunBlockResponse:
    """Mock dispatch: pretends to run, returns a deterministic sample.

    Latency is faked per block-type to give the frontend a realistic
    state-transition feel:
        imageref / prompt   → instant (no work)
        imagegen            → 1.5s
        videogen            → 4.5s
        stitcher            → 2.0s
        voice               → 1.0s
    """
    import time

    delays = {
        "imageref": 0.0,
        "prompt": 0.0,
        "imagegen": 1.5,
        "videogen": 4.5,
        "voice": 1.0,
        "stitcher": 2.0,
    }
    delay = delays.get(body.block_type, 0.5)
    if delay > 0:
        await asyncio.sleep(delay)

    bt = body.block_type

    if bt == "imageref":
        url = (body.inputs or {}).get("file_url") or STUB_IMAGE_URL
        return CanvasRunBlockResponse(
            block_id=body.block_id,
            status="ok",
            output_kind="image",
            output_url=url,
            cost_cr=0,
            elapsed_s=round(time.monotonic() - started, 2),
        )

    if bt == "prompt":
        text = (body.config or {}).get("text", "")
        return CanvasRunBlockResponse(
            block_id=body.block_id,
            status="ok",
            output_kind="text",
            output_text=text,
            cost_cr=0,
            elapsed_s=round(time.monotonic() - started, 2),
        )

    if bt == "imagegen":
        return CanvasRunBlockResponse(
            block_id=body.block_id,
            status="ok",
            output_kind="image",
            output_url=STUB_IMAGE_URL,
            cost_cr=100,
            elapsed_s=round(time.monotonic() - started, 2),
        )

    if bt == "videogen":
        # Pick stub cost based on resolution config so the frontend's
        # cost estimator matches what the backend reports.
        res = (body.config or {}).get("resolution", "720p")
        cost_by_res = {"480p": 750, "720p": 1500, "1080p": 4500}
        return CanvasRunBlockResponse(
            block_id=body.block_id,
            status="ok",
            output_kind="video",
            output_url=STUB_VIDEO_URL,
            cost_cr=cost_by_res.get(res, 1500),
            elapsed_s=round(time.monotonic() - started, 2),
        )

    if bt == "stitcher":
        # Stitcher's "output" is the concatenated MP4 — for the stub we
        # just hand back the same demo video.
        return CanvasRunBlockResponse(
            block_id=body.block_id,
            status="ok",
            output_kind="video",
            output_url=STUB_VIDEO_URL,
            cost_cr=0,
            elapsed_s=round(time.monotonic() - started, 2),
        )

    if bt == "voice":
        return CanvasRunBlockResponse(
            block_id=body.block_id,
            status="failed",
            error="Voice block ships in v1.0",
            elapsed_s=round(time.monotonic() - started, 2),
        )

    return CanvasRunBlockResponse(
        block_id=body.block_id,
        status="failed",
        error=f"Unknown block_type: {bt}",
        elapsed_s=round(time.monotonic() - started, 2),
    )
