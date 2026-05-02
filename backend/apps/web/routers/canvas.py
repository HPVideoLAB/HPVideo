"""
Canvas backend router.

Single endpoint POST /api/v1/canvas/run-block. Receives a block
description, dispatches to a generator, returns a result.

Two run modes:
  - stub  (default): returns a deterministic placeholder URL after a
          short delay. Used by every non-admin caller and by v0.3 demo.
  - real (admin-only MVP): per-request opt-in via header
          `X-Canvas-Mode: real`. Routes:
            videogen → WaveAPI x402create + poll
            stitcher → ffmpeg concat + OSS upload
            imageref → SSRF-checked URL pass-through
            prompt   → returns config.text (same as stub)
          Other block types (imagegen, voice) fall back to stub.
          Idempotency / per-user rate limiting / pointpay charging are
          still on the v0.4 followup list — fine for owner-only MVP
          testing, gated by the admin role check.
"""
import asyncio
import logging
import os
import re
import subprocess
import tempfile
import time
import uuid
from datetime import datetime
from urllib.parse import urlparse

import requests
from fastapi import APIRouter, Depends, HTTPException, Request, status
from pydantic import BaseModel
from typing import Any, Dict, List, Literal, Optional
from slowapi import Limiter
from slowapi.util import get_remote_address

from utils.utils import get_current_user

log = logging.getLogger(__name__)
router = APIRouter()
limiter = Limiter(key_func=get_remote_address)

# Default run mode. `real` is the new behavior; `stub` is the safe demo.
# Per-request override via `X-Canvas-Mode: real` header is admin-only.
CANVAS_RUN_MODE = os.getenv("CANVAS_RUN_MODE", "stub")

# Map a Canvas videogen `model` config value to (vendor, model) used by
# WaveSpeed. Mirrors x402pay.MODEL_REGISTRY but kept local so canvas.py
# doesn't take a hard import from the payment router.
VIDEOGEN_REGISTRY: Dict[str, Dict[str, str]] = {
    "wan-2.7":        {"vendor": "alibaba",      "model": "wan-2.7/text-to-video"},
    # HappyHorse-1.0: native joint audio+video. Single forward pass produces
    # synced lip-sync dialogue, ambient sound, and Foley across 7 languages
    # (en/zh/yue/ja/ko/de/fr) at 14.6% WER. Currently #1 on WaveSpeed
    # leaderboard. Speculated to be Alibaba's next WAN; vendor confirmed
    # alibaba on WaveSpeed.
    "happyhorse-1.0": {"vendor": "alibaba",      "model": "happyhorse-1.0/text-to-video"},
    "ovi":            {"vendor": "character-ai", "model": "ovi/text-to-video"},
    "veo3.1":         {"vendor": "google",       "model": "veo3.1/text-to-video"},
    "ltx-2.3":        {"vendor": "wavespeed-ai", "model": "ltx-2.3/text-to-video"},
    "hailuo-2.3":     {"vendor": "minimax",      "model": "hailuo-2.3/t2v-pro"},
    "seedance-2.0":   {"vendor": "bytedance",    "model": "seedance-2.0/text-to-video"},
    "kling-3.0":      {"vendor": "kwaivgi",      "model": "kling-v3.0-std/text-to-video"},
    "pixverse-v6":    {"vendor": "pixverse",     "model": "pixverse-v6/text-to-video"},
    "luma-ray-2":     {"vendor": "luma",         "model": "ray-2-t2v"},
    "vidu-q3":        {"vendor": "vidu",         "model": "q3/text-to-video"},
}

DEFAULT_VIDEOGEN_MODEL = "happyhorse-1.0"
VIDEOGEN_POLL_TIMEOUT_S = 240.0
VIDEOGEN_POLL_INTERVAL_S = 5.0

# Hostnames allowed as inputs.file_url for the imageref block. Anything
# else is rejected before we make a server-side fetch (SSRF guard).
IMAGEREF_ALLOW_HOSTS = (
    "degptwav.oss-cn-hongkong.aliyuncs.com",
    os.getenv("FILE_OSS_HK_URL", "").replace("https://", "").replace("http://", "").rstrip("/"),
)

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
    started = time.monotonic()

    # Resolve effective mode for this request:
    #   1. global CANVAS_RUN_MODE (env)
    #   2. per-request header `X-Canvas-Mode: real` overrides to real,
    #      but only if the user is admin (MVP gate — real-mode is not
    #      yet hardened with per-user rate limits, idempotency, or
    #      cost deduction, so we don't expose it broadly yet).
    mode = CANVAS_RUN_MODE
    header_mode = (request.headers.get("x-canvas-mode") or "").lower().strip()
    if header_mode == "real":
        if getattr(user, "role", None) != "admin":
            raise HTTPException(
                status_code=status.HTTP_403_FORBIDDEN,
                detail=(
                    "X-Canvas-Mode: real is admin-only during the v0.4 MVP. "
                    "Real per-block dispatch ships broadly once pointpay / "
                    "idempotency / per-user rate limits are wired up."
                ),
            )
        mode = "real"

    if mode == "real":
        return await _run_real(body, started)
    return await _run_stub(body, started)


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


# ===========================================================================
# Real-mode dispatch (admin-only MVP)
# ===========================================================================

async def _run_real(body: CanvasRunBlockRequest, started: float) -> CanvasRunBlockResponse:
    """Real per-block dispatch.

    Routed only when admin sends `X-Canvas-Mode: real`. Falls back to
    stub for block types not yet wired to real backends (imagegen,
    voice).
    """
    bt = body.block_type
    try:
        if bt == "prompt":
            text = (body.config or {}).get("text", "")
            return CanvasRunBlockResponse(
                block_id=body.block_id, status="ok", output_kind="text",
                output_text=text, cost_cr=0,
                elapsed_s=round(time.monotonic() - started, 2), mode="real",
            )
        if bt == "imageref":
            return await _real_imageref(body, started)
        if bt == "videogen":
            return await _real_videogen(body, started)
        if bt == "stitcher":
            return await _real_stitcher(body, started)
        # imagegen / voice not yet implemented for real mode — fall back.
        log.info("canvas real-mode fallback to stub for block_type=%s", bt)
        return await _run_stub(body, started)
    except HTTPException:
        raise
    except Exception as e:
        log.exception("canvas real-mode unexpected error for block_type=%s", bt)
        return CanvasRunBlockResponse(
            block_id=body.block_id, status="failed",
            error=f"real-mode error: {e}",
            elapsed_s=round(time.monotonic() - started, 2), mode="real",
        )


async def _real_imageref(body: CanvasRunBlockRequest, started: float) -> CanvasRunBlockResponse:
    """SSRF-checked URL pass-through.

    The frontend's imageref block uploads to OSS via /upload/base and
    plumbs the resulting public URL into `inputs.file_url`. We refuse
    anything not on the allowlist so a malicious config can't make us
    fetch http://169.254.169.254/ etc. when downstream blocks try to
    use the URL.
    """
    url = (body.inputs or {}).get("file_url") or (body.config or {}).get("file_url")
    if not url:
        return CanvasRunBlockResponse(
            block_id=body.block_id, status="failed",
            error="imageref block: missing file_url in inputs or config",
            elapsed_s=round(time.monotonic() - started, 2), mode="real",
        )
    parsed = urlparse(url)
    if parsed.scheme not in ("https",) or not parsed.hostname:
        return CanvasRunBlockResponse(
            block_id=body.block_id, status="failed",
            error="imageref block: file_url must be https://",
            elapsed_s=round(time.monotonic() - started, 2), mode="real",
        )
    host_ok = any(parsed.hostname.endswith(h) for h in IMAGEREF_ALLOW_HOSTS if h)
    if not host_ok:
        return CanvasRunBlockResponse(
            block_id=body.block_id, status="failed",
            error=f"imageref block: host {parsed.hostname} not in allowlist",
            elapsed_s=round(time.monotonic() - started, 2), mode="real",
        )
    return CanvasRunBlockResponse(
        block_id=body.block_id, status="ok", output_kind="image",
        output_url=url, cost_cr=0,
        elapsed_s=round(time.monotonic() - started, 2), mode="real",
    )


async def _real_videogen(body: CanvasRunBlockRequest, started: float) -> CanvasRunBlockResponse:
    """Call WaveAPI x402create + poll for prediction result.

    Reuses the same MODEL_REGISTRY entries as the existing /creator
    standalone endpoints. Polls every 5s up to 4 minutes — wan-2.7
    @720p typically returns in 30-60s. Returns the raw OSS-hosted MP4
    URL straight from WaveSpeed; we don't re-host (yet) so make sure
    the stitcher downloads in time before the URL expires (typically
    ~24h, plenty for a single Run All).
    """
    from apps.web.ai.wave import WaveApiInstance
    config = body.config or {}
    inputs = body.inputs or {}
    prompt = (inputs.get("prompt") or config.get("text") or "").strip()
    if not prompt:
        return CanvasRunBlockResponse(
            block_id=body.block_id, status="failed",
            error="videogen block: empty prompt (no upstream prompt block, no config.text)",
            elapsed_s=round(time.monotonic() - started, 2), mode="real",
        )
    model_slug = config.get("model") or DEFAULT_VIDEOGEN_MODEL
    cfg = VIDEOGEN_REGISTRY.get(model_slug)
    if cfg is None:
        return CanvasRunBlockResponse(
            block_id=body.block_id, status="failed",
            error=f"videogen block: unknown model {model_slug!r}",
            elapsed_s=round(time.monotonic() - started, 2), mode="real",
        )
    duration = int(config.get("duration") or 5)
    size = config.get("resolution") or config.get("size") or "720p"

    # Kick off the generation.
    create_resp = await asyncio.to_thread(
        WaveApiInstance.x402create, cfg["vendor"], cfg["model"], prompt, duration, size
    )
    if not create_resp or create_resp.get("code") != 200:
        return CanvasRunBlockResponse(
            block_id=body.block_id, status="failed",
            error=f"videogen create failed: {create_resp}",
            elapsed_s=round(time.monotonic() - started, 2), mode="real",
        )
    request_id = create_resp.get("data", {}).get("id")
    if not request_id:
        return CanvasRunBlockResponse(
            block_id=body.block_id, status="failed",
            error="videogen create returned no request_id",
            elapsed_s=round(time.monotonic() - started, 2), mode="real",
        )

    # Poll.
    deadline = time.monotonic() + VIDEOGEN_POLL_TIMEOUT_S
    last_status = "unknown"
    while time.monotonic() < deadline:
        await asyncio.sleep(VIDEOGEN_POLL_INTERVAL_S)
        poll = await asyncio.to_thread(WaveApiInstance.get_prediction_result, request_id)
        if not poll.get("success"):
            continue
        data = poll.get("data") or {}
        # WaveSpeed wraps the prediction inside another `data` field.
        inner = data.get("data") if isinstance(data.get("data"), dict) else data
        last_status = (inner.get("status") or "").lower()
        if last_status in ("completed", "succeeded", "success"):
            outputs = inner.get("outputs") or []
            output_url = outputs[0] if outputs else inner.get("output") or inner.get("output_url")
            if not output_url:
                return CanvasRunBlockResponse(
                    block_id=body.block_id, status="failed",
                    error=f"videogen completed but no output_url; raw: {inner}",
                    elapsed_s=round(time.monotonic() - started, 2), mode="real",
                )
            return CanvasRunBlockResponse(
                block_id=body.block_id, status="ok", output_kind="video",
                output_url=output_url,
                cost_cr=int(config.get("cost_cr") or 0),
                elapsed_s=round(time.monotonic() - started, 2), mode="real",
            )
        if last_status in ("failed", "error", "cancelled", "canceled"):
            err = inner.get("error") or inner.get("message") or "unknown failure"
            return CanvasRunBlockResponse(
                block_id=body.block_id, status="failed",
                error=f"videogen {last_status}: {err}",
                elapsed_s=round(time.monotonic() - started, 2), mode="real",
            )
    return CanvasRunBlockResponse(
        block_id=body.block_id, status="failed",
        error=f"videogen poll timeout after {VIDEOGEN_POLL_TIMEOUT_S}s (last status={last_status})",
        elapsed_s=round(time.monotonic() - started, 2), mode="real",
    )


async def _real_stitcher(body: CanvasRunBlockRequest, started: float) -> CanvasRunBlockResponse:
    """Download upstream clips, ffmpeg concat, upload to OSS.

    Tries `-c copy` first (fast, no re-encode) and falls back to
    re-encode if codec mismatch makes copy fail.
    """
    clips: List[str] = (body.inputs or {}).get("clips") or []
    if not clips:
        return CanvasRunBlockResponse(
            block_id=body.block_id, status="failed",
            error="stitcher: no upstream video clips wired in",
            elapsed_s=round(time.monotonic() - started, 2), mode="real",
        )
    if len(clips) < 2:
        # Only one clip — nothing to stitch, just pass through.
        return CanvasRunBlockResponse(
            block_id=body.block_id, status="ok", output_kind="video",
            output_url=clips[0], cost_cr=0,
            elapsed_s=round(time.monotonic() - started, 2), mode="real",
        )

    tmp = tempfile.mkdtemp(prefix="canvas_stitch_")
    try:
        local_files: List[str] = []
        for i, url in enumerate(clips):
            path = os.path.join(tmp, f"clip{i:02d}.mp4")
            try:
                r = await asyncio.to_thread(requests.get, url, timeout=60, stream=True)
                r.raise_for_status()
                with open(path, "wb") as f:
                    for chunk in r.iter_content(chunk_size=65536):
                        f.write(chunk)
                local_files.append(path)
            except Exception as e:
                return CanvasRunBlockResponse(
                    block_id=body.block_id, status="failed",
                    error=f"stitcher: failed to download clip {i} ({url}): {e}",
                    elapsed_s=round(time.monotonic() - started, 2), mode="real",
                )

        list_path = os.path.join(tmp, "list.txt")
        with open(list_path, "w") as f:
            for p in local_files:
                f.write(f"file '{p}'\n")
        out_path = os.path.join(tmp, "stitched.mp4")

        async def _ffmpeg(args: List[str]) -> tuple[int, bytes, bytes]:
            proc = await asyncio.create_subprocess_exec(
                *args,
                stdout=asyncio.subprocess.PIPE,
                stderr=asyncio.subprocess.PIPE,
            )
            so, se = await proc.communicate()
            return proc.returncode or 0, so, se

        # First try fast concat (no re-encode).
        rc, _so, se = await _ffmpeg([
            "ffmpeg", "-y", "-f", "concat", "-safe", "0",
            "-i", list_path, "-c", "copy", out_path,
        ])
        if rc != 0 or not os.path.exists(out_path) or os.path.getsize(out_path) == 0:
            log.info("stitcher: -c copy failed (%s), falling back to re-encode", se[:300] if se else "")
            rc, _so, se = await _ffmpeg([
                "ffmpeg", "-y", "-f", "concat", "-safe", "0",
                "-i", list_path,
                "-c:v", "libx264", "-preset", "veryfast", "-crf", "23",
                "-c:a", "aac", "-b:a", "128k",
                out_path,
            ])
            if rc != 0:
                return CanvasRunBlockResponse(
                    block_id=body.block_id, status="failed",
                    error=f"stitcher ffmpeg failed (rc={rc}): {se[:400].decode('utf-8', 'replace')}",
                    elapsed_s=round(time.monotonic() - started, 2), mode="real",
                )

        # Upload to OSS.
        from apps.web.util.aliossutils import AliOSSUtil
        oss_url_prefix = os.getenv("FILE_OSS_HK_URL", "")
        date = datetime.utcnow().strftime("%Y/%m/%d")
        file_name = f"canvas/{date}/stitch_{uuid.uuid4().hex}.mp4"
        with open(out_path, "rb") as f:
            data = f.read()
        bucket = AliOSSUtil._get_bucket()
        result = await asyncio.to_thread(
            bucket.put_object, file_name, data,
            {"Content-Type": "video/mp4"},
        )
        if result.status != 200:
            return CanvasRunBlockResponse(
                block_id=body.block_id, status="failed",
                error=f"stitcher oss put_object status={result.status}",
                elapsed_s=round(time.monotonic() - started, 2), mode="real",
            )
        return CanvasRunBlockResponse(
            block_id=body.block_id, status="ok", output_kind="video",
            output_url=f"{oss_url_prefix}{file_name}",
            cost_cr=0,
            elapsed_s=round(time.monotonic() - started, 2), mode="real",
        )
    finally:
        # Best-effort cleanup; don't fail the response if rmtree fails.
        try:
            import shutil
            shutil.rmtree(tmp, ignore_errors=True)
        except Exception:
            pass
