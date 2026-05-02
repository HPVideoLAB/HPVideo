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

# Image generation models. Keep slugs in sync with the frontend
# Inspector dropdown so a config.model the user picked actually
# resolves here. The first entry is the canvas default.
IMAGEGEN_REGISTRY: Dict[str, Dict[str, str]] = {
    # OpenAI gpt-image-2 — $0.06 / image @ 1k medium quality. Fast,
    # solid prompt fidelity, broad style range. Default.
    "gpt-image-2": {"vendor": "openai", "model": "gpt-image-2/text-to-image"},
    # Google Nano Banana 2 — 4K capable, fast iteration.
    "nano-banana-2": {"vendor": "google", "model": "nano-banana-2/text-to-image"},
    # ByteDance Seedream Lite — cheaper, decent quality.
    "seedream-v5-lite": {"vendor": "bytedance", "model": "seedream-v5.0-lite/text-to-image"},
}
DEFAULT_IMAGEGEN_MODEL = "gpt-image-2"
IMAGEGEN_POLL_TIMEOUT_S = 90.0
IMAGEGEN_POLL_INTERVAL_S = 3.0

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
@limiter.limit("60/minute")  # Per-IP slowapi gate (NAT-shared); per-user gate below.
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

    Hardening layers:
      - Per-IP slowapi limiter (60/min) — `@limiter.limit` decorator above.
      - Per-user Redis sliding-window limit (60/min/user) — defends
        corporate NAT users from each other.
      - Idempotency-Key header → Redis cache (15min TTL). Replays return
        the cached response with mode="cached" so a network retry can't
        double-bill or double-generate.
      - Successful real-mode generations write a PayTable audit row so
        future billing reconciliation has a paper trail (currpay=False
        because Canvas doesn't yet flow through the x402 gate).
    """
    started = time.monotonic()

    # ----- Per-user rate limit (Redis sliding window) -----
    user_id = getattr(user, "id", None)
    if user_id:
        from apps.redis.redis_client import RedisClientInstance
        rate_key = f"canvas:ratelimit:user:{user_id}:{int(time.time()) // 60}"
        try:
            r = RedisClientInstance.redis_client
            if r is not None:
                cnt = r.incr(rate_key)
                if cnt == 1:
                    r.expire(rate_key, 65)
                if cnt > 60:
                    raise HTTPException(
                        status_code=status.HTTP_429_TOO_MANY_REQUESTS,
                        detail="Per-user rate limit: 60 requests/minute. Slow down.",
                    )
        except HTTPException:
            raise
        except Exception as e:
            log.warning("canvas per-user rate-limit redis error: %s — failing open", e)

    # ----- Idempotency replay -----
    idem_key = (request.headers.get("idempotency-key") or "").strip()
    if idem_key and user_id:
        from apps.redis.redis_client import RedisClientInstance
        cache_key = f"canvas:idem:{user_id}:{idem_key}"
        cached = RedisClientInstance.get_value_by_key(cache_key)
        if cached:
            cached["mode"] = "cached"
            cached["elapsed_s"] = round(time.monotonic() - started, 3)
            return CanvasRunBlockResponse(**cached)

    # ----- Mode resolution: stub vs real-admin -----
    mode = CANVAS_RUN_MODE
    header_mode = (request.headers.get("x-canvas-mode") or "").lower().strip()
    if header_mode == "real":
        if getattr(user, "role", None) != "admin":
            raise HTTPException(
                status_code=status.HTTP_403_FORBIDDEN,
                detail=(
                    "X-Canvas-Mode: real is admin-only during the v0.4 MVP. "
                    "Real per-block dispatch ships broadly once pointpay "
                    "charging is wired up."
                ),
            )
        mode = "real"

    if mode == "real":
        resp = await _run_real(body, started)
    else:
        resp = await _run_stub(body, started)

    # ----- Audit row + idempotency cache for successful results -----
    if resp.status == "ok" and mode == "real" and resp.cost_cr > 0:
        try:
            from apps.web.models.pay import PayTableInstall
            PayTableInstall.insert_pay(
                wallet_addr=str(user_id or "")[:128],
                model=(body.config or {}).get("model") or body.block_type,
                size=str((body.config or {}).get("resolution") or ""),
                duration=int((body.config or {}).get("duration") or 0),
                amount=str(resp.cost_cr),
                messageid=f"canvas:{body.block_id}:{int(time.time())}",
                hash="",
                status=False,   # Not yet billed; future pointpay sweep will reconcile.
                currpay=False,
            )
        except Exception as e:
            log.warning("canvas PayTable audit insert failed: %s", e)

    if idem_key and user_id and resp.status == "ok":
        try:
            from apps.redis.redis_client import RedisClientInstance
            RedisClientInstance.add_key_value(
                f"canvas:idem:{user_id}:{idem_key}",
                resp.model_dump(),
                ttl=900,  # 15 min — long enough for retries, short enough to not stale-replay.
            )
        except Exception as e:
            log.warning("canvas idem cache write failed: %s", e)

    return resp


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
        if bt == "imagegen":
            return await _real_imagegen(body, started)
        if bt == "stitcher":
            return await _real_stitcher(body, started)
        # voice not yet implemented for real mode — fall back.
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


async def _extract_last_frame_to_oss(video_url: str) -> Optional[str]:
    """Download a video, ffmpeg-extract the last frame, upload to OSS.

    Used by multi-shot chaining: the last frame of the upstream videogen
    shot becomes the first frame of the next videogen, fed as `image=`
    to the i2v endpoint. Returns a public HTTPS URL on the OSS bucket
    or None on failure (caller decides whether to fall back to t2v).
    """
    try:
        # 1. Download the source video.
        tmp = tempfile.mkdtemp(prefix="canvas_chain_")
        src = os.path.join(tmp, "src.mp4")
        r = await asyncio.to_thread(requests.get, video_url, timeout=60, stream=True)
        r.raise_for_status()
        with open(src, "wb") as f:
            for chunk in r.iter_content(65536):
                f.write(chunk)

        # 2. Probe duration so we can seek to a frame that actually exists
        #    (ffmpeg's `-sseof` is fragile across container variants).
        probe_args = [
            "ffprobe", "-v", "error", "-show_entries", "format=duration",
            "-of", "default=noprint_wrappers=1:nokey=1", src,
        ]
        probe = await asyncio.create_subprocess_exec(
            *probe_args,
            stdout=asyncio.subprocess.PIPE,
            stderr=asyncio.subprocess.PIPE,
        )
        so, _se = await probe.communicate()
        duration = float(so.decode().strip() or 0)
        seek = max(0.0, duration - 0.1)

        out_png = os.path.join(tmp, "last.png")
        ff = await asyncio.create_subprocess_exec(
            "ffmpeg", "-y", "-ss", f"{seek:.3f}", "-i", src,
            "-vframes", "1", "-q:v", "2", "-update", "1", out_png,
            stdout=asyncio.subprocess.PIPE,
            stderr=asyncio.subprocess.PIPE,
        )
        await ff.communicate()
        if ff.returncode != 0 or not os.path.exists(out_png) or os.path.getsize(out_png) == 0:
            log.warning("last-frame extract failed for %s", video_url)
            return None

        # 3. Upload to OSS with a clean key + Content-Type.
        from apps.web.util.aliossutils import AliOSSUtil
        oss_url_prefix = os.getenv("FILE_OSS_HK_URL", "")
        date = datetime.utcnow().strftime("%Y/%m/%d")
        key = f"canvas/refframes/{date}/lastframe_{uuid.uuid4().hex}.png"
        with open(out_png, "rb") as f:
            data = f.read()
        bucket = AliOSSUtil._get_bucket()
        result = await asyncio.to_thread(
            bucket.put_object, key, data, {"Content-Type": "image/png"},
        )
        if result.status != 200:
            log.warning("OSS put_object status=%s for last-frame", result.status)
            return None
        return f"{oss_url_prefix}{key}"
    except Exception as e:
        log.exception("last-frame extraction errored: %s", e)
        return None
    finally:
        try:
            import shutil
            shutil.rmtree(tmp, ignore_errors=True)
        except Exception:
            pass


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

    # Multi-shot chaining: if an upstream block fed us a video URL via
    # `chain_from_video_url`, extract its last frame and route to the
    # image-to-video endpoint instead of text-to-video.  Same price.
    # Same prompt.  But the next shot starts from the previous shot's
    # final frame, so character + scene continuity carries across the
    # cut.  Currently HappyHorse-1.0 i2v only — falls back to t2v for
    # other models.
    chain_url = inputs.get("chain_from_video_url") or ""
    image_url = inputs.get("first_frame_url") or ""
    if chain_url and "happyhorse" in cfg["model"]:
        log.info("videogen chain: extracting last frame from %s", chain_url[:80])
        extracted = await _extract_last_frame_to_oss(chain_url)
        if extracted:
            image_url = extracted
        else:
            log.info("videogen chain: extraction failed, falling back to t2v")

    # Kick off the generation.
    if image_url and "happyhorse" in cfg["model"]:
        create_resp = await asyncio.to_thread(
            WaveApiInstance.x402create_i2v,
            cfg["vendor"], cfg["model"], prompt, duration, size, image_url,
        )
    else:
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


async def _real_imagegen(body: CanvasRunBlockRequest, started: float) -> CanvasRunBlockResponse:
    """Text-to-image via WaveSpeed (gpt-image-2 default).

    Same poll-based pattern as _real_videogen but resolves to
    output_kind='image'. Idempotency / rate-limit / audit happen at
    the outer run_block layer, so this just wraps the WaveSpeed call.
    """
    from apps.web.ai.wave import WaveApiInstance
    config = body.config or {}
    inputs = body.inputs or {}
    prompt = (inputs.get("prompt") or config.get("text") or "").strip()
    if not prompt:
        return CanvasRunBlockResponse(
            block_id=body.block_id, status="failed",
            error="imagegen block: empty prompt (no upstream prompt block, no config.text)",
            elapsed_s=round(time.monotonic() - started, 2), mode="real",
        )
    model_slug = config.get("model") or DEFAULT_IMAGEGEN_MODEL
    cfg = IMAGEGEN_REGISTRY.get(model_slug)
    if cfg is None:
        return CanvasRunBlockResponse(
            block_id=body.block_id, status="failed",
            error=f"imagegen block: unknown model {model_slug!r}",
            elapsed_s=round(time.monotonic() - started, 2), mode="real",
        )
    aspect = config.get("aspect") or config.get("aspect_ratio") or "16:9"
    resolution = config.get("resolution") or "1k"
    quality = config.get("quality") or "medium"

    create_resp = await asyncio.to_thread(
        WaveApiInstance.x402create_t2i,
        cfg["vendor"], cfg["model"], prompt, aspect, resolution, quality,
    )
    if not create_resp or create_resp.get("code") != 200:
        return CanvasRunBlockResponse(
            block_id=body.block_id, status="failed",
            error=f"imagegen create failed: {create_resp}",
            elapsed_s=round(time.monotonic() - started, 2), mode="real",
        )
    request_id = create_resp.get("data", {}).get("id")
    if not request_id:
        return CanvasRunBlockResponse(
            block_id=body.block_id, status="failed",
            error="imagegen create returned no request_id",
            elapsed_s=round(time.monotonic() - started, 2), mode="real",
        )

    deadline = time.monotonic() + IMAGEGEN_POLL_TIMEOUT_S
    last_status = "unknown"
    while time.monotonic() < deadline:
        await asyncio.sleep(IMAGEGEN_POLL_INTERVAL_S)
        poll = await asyncio.to_thread(WaveApiInstance.get_prediction_result, request_id)
        if not poll.get("success"):
            continue
        data = poll.get("data") or {}
        inner = data.get("data") if isinstance(data.get("data"), dict) else data
        last_status = (inner.get("status") or "").lower()
        if last_status in ("completed", "succeeded", "success"):
            outputs = inner.get("outputs") or []
            output_url = outputs[0] if outputs else inner.get("output") or inner.get("output_url")
            if not output_url:
                return CanvasRunBlockResponse(
                    block_id=body.block_id, status="failed",
                    error=f"imagegen completed but no output_url; raw: {inner}",
                    elapsed_s=round(time.monotonic() - started, 2), mode="real",
                )
            return CanvasRunBlockResponse(
                block_id=body.block_id, status="ok", output_kind="image",
                output_url=output_url,
                cost_cr=int(config.get("cost_cr") or 100),
                elapsed_s=round(time.monotonic() - started, 2), mode="real",
            )
        if last_status in ("failed", "error", "cancelled", "canceled"):
            err = inner.get("error") or inner.get("message") or "unknown failure"
            return CanvasRunBlockResponse(
                block_id=body.block_id, status="failed",
                error=f"imagegen {last_status}: {err}",
                elapsed_s=round(time.monotonic() - started, 2), mode="real",
            )
    return CanvasRunBlockResponse(
        block_id=body.block_id, status="failed",
        error=f"imagegen poll timeout after {IMAGEGEN_POLL_TIMEOUT_S}s (last status={last_status})",
        elapsed_s=round(time.monotonic() - started, 2), mode="real",
    )


# ===========================================================================
# Workspace persistence (Canvas v0.4 batch 11)
# ===========================================================================

class CanvasSaveRequest(BaseModel):
    id: Optional[str] = None              # If set, update existing; else create new.
    name: Optional[str] = None             # Friendly name; default "Untitled canvas".
    nodes: List[Dict[str, Any]] = []
    edges: List[Dict[str, Any]] = []
    viewport: Optional[Dict[str, Any]] = None


class CanvasSaveResponse(BaseModel):
    id: str
    name: str
    share_token: Optional[str] = None
    created_at: int
    updated_at: int


@router.post("/save", response_model=CanvasSaveResponse)
async def canvas_save(body: CanvasSaveRequest, user=Depends(get_current_user)):
    """Save (or create) a canvas workspace. Returns the canonical id.

    Frontend pattern: on Save click, POST with `id=null` for first save
    (backend mints a UUID), POST with `id=<existing>` for subsequent
    saves (backend updates in place).
    """
    from apps.web.models.canvas_workspace import CanvasWorkspaceInstall
    import json as _json

    nodes_json = _json.dumps(body.nodes or [])
    edges_json = _json.dumps(body.edges or [])
    viewport_json = _json.dumps(body.viewport) if body.viewport else None

    if body.id:
        ws = CanvasWorkspaceInstall.update(
            id=body.id,
            user_id=user.id,
            name=body.name,
            nodes_json=nodes_json,
            edges_json=edges_json,
            viewport_json=viewport_json,
        )
        if ws is None:
            raise HTTPException(status_code=404, detail="workspace not found")
    else:
        ws = CanvasWorkspaceInstall.insert(
            user_id=user.id,
            name=body.name or "Untitled canvas",
            nodes_json=nodes_json,
            edges_json=edges_json,
            viewport_json=viewport_json,
        )
    return CanvasSaveResponse(
        id=ws.id,
        name=ws.name,
        share_token=ws.share_token,
        created_at=ws.created_at,
        updated_at=ws.updated_at,
    )


class CanvasLoadResponse(BaseModel):
    id: str
    name: str
    nodes: List[Dict[str, Any]]
    edges: List[Dict[str, Any]]
    viewport: Optional[Dict[str, Any]] = None
    share_token: Optional[str] = None
    created_at: int
    updated_at: int
    read_only: bool = False


@router.get("/load/{ws_id}", response_model=CanvasLoadResponse)
async def canvas_load(ws_id: str, user=Depends(get_current_user)):
    """Load a workspace by id — owner only."""
    from apps.web.models.canvas_workspace import CanvasWorkspaceInstall
    import json as _json

    ws = CanvasWorkspaceInstall.get_by_id(ws_id, user.id)
    if ws is None:
        raise HTTPException(status_code=404, detail="workspace not found")
    return CanvasLoadResponse(
        id=ws.id,
        name=ws.name,
        nodes=_json.loads(ws.nodes or "[]"),
        edges=_json.loads(ws.edges or "[]"),
        viewport=_json.loads(ws.viewport) if ws.viewport else None,
        share_token=ws.share_token,
        created_at=ws.created_at,
        updated_at=ws.updated_at,
        read_only=False,
    )


@router.get("/share/{token}", response_model=CanvasLoadResponse)
async def canvas_load_share(token: str):
    """Public read-only load by share token. No auth required.

    Token is opaque (UUID), 32 chars, infeasible to enumerate. Anyone
    with the link can clone the workflow into their own canvas; the
    backend simply returns the JSON. The owner's name is intentionally
    not revealed.
    """
    from apps.web.models.canvas_workspace import CanvasWorkspaceInstall
    import json as _json

    ws = CanvasWorkspaceInstall.get_by_share_token(token)
    if ws is None:
        raise HTTPException(status_code=404, detail="shared workspace not found")
    return CanvasLoadResponse(
        id=ws.id,
        name=ws.name,
        nodes=_json.loads(ws.nodes or "[]"),
        edges=_json.loads(ws.edges or "[]"),
        viewport=_json.loads(ws.viewport) if ws.viewport else None,
        share_token=ws.share_token,
        created_at=ws.created_at,
        updated_at=ws.updated_at,
        read_only=True,
    )


class CanvasListItem(BaseModel):
    id: str
    name: str
    archived: bool
    has_share_token: bool
    created_at: int
    updated_at: int


@router.get("/list", response_model=List[CanvasListItem])
async def canvas_list(user=Depends(get_current_user)):
    """List the current user's workspaces, newest first."""
    from apps.web.models.canvas_workspace import CanvasWorkspaceInstall
    items = CanvasWorkspaceInstall.list_by_user(user.id)
    return [
        CanvasListItem(
            id=item.id, name=item.name, archived=item.archived,
            has_share_token=item.has_share_token,
            created_at=item.created_at, updated_at=item.updated_at,
        )
        for item in items
    ]


@router.delete("/{ws_id}")
async def canvas_delete(ws_id: str, user=Depends(get_current_user)):
    from apps.web.models.canvas_workspace import CanvasWorkspaceInstall
    ok = CanvasWorkspaceInstall.delete(ws_id, user.id)
    if not ok:
        raise HTTPException(status_code=404, detail="workspace not found")
    return {"ok": True}


class CanvasShareRequest(BaseModel):
    enable: bool


class CanvasShareResponse(BaseModel):
    share_token: Optional[str] = None
    share_url: Optional[str] = None


@router.post("/{ws_id}/share", response_model=CanvasShareResponse)
async def canvas_share(ws_id: str, body: CanvasShareRequest, user=Depends(get_current_user)):
    """Mint or revoke a share token for a workspace."""
    from apps.web.models.canvas_workspace import CanvasWorkspaceInstall
    token = CanvasWorkspaceInstall.set_share_token(ws_id, user.id, body.enable)
    if body.enable and token is None:
        raise HTTPException(status_code=404, detail="workspace not found")
    if not body.enable:
        return CanvasShareResponse(share_token=None, share_url=None)
    return CanvasShareResponse(
        share_token=token,
        share_url=f"/creator/canvas?share={token}",
    )
