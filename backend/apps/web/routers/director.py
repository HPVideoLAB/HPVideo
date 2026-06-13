"""Director Mode backend router.

Three endpoints under /director:

* POST /plan   — thin proxy to nest-app's /director/plan (3 LLM agents:
                 scene splitter + character bible + storyboard artist).
                 Server-side recomputes total_cost_cr from pricing.ts
                 mirror so the client can't fudge the price.
* POST /charge — on-chain DLP transfer verification, mints the Redis
                 paid bucket. Mirrors /canvas/charge shape so the
                 frontend can reuse dlcpCharge.ts (with a different
                 base URL). Bucket key namespaced `director:paid:...`.
* POST /run    — SSE stream. Drives the storyboard end-to-end via
                 canvas internals (_real_videogen + i2v chain +
                 _real_stitcher). Per-shot progress events; drains
                 the paid bucket per shot.

Day 2 ships /charge + /run with the SSE wiring.
"""

import asyncio
import json
import logging
import os
import time
import uuid
from typing import Any, Dict, List, Literal, Optional

import requests
from fastapi import APIRouter, Depends, HTTPException, Request, status
from fastapi.responses import StreamingResponse
from pydantic import BaseModel

from utils.utils import get_current_user

log = logging.getLogger(__name__)
router = APIRouter()


# ----------------------------------------------------------------------
# Pricing mirror — must stay in sync with
# src/lib/components/canvas/pricing.ts and
# backend/.../degpt-nest/.../director.service.ts happyhorseCostCr.
# Defense in depth: we never trust the storyboard's `total_cost_cr` from
# the client; we recompute here from the per-shot duration.
# ----------------------------------------------------------------------
def _happyhorse_cost_cr(duration_s: int) -> int:
    return 2400 if duration_s >= 7 else 1500


# Cap per /plan call: keeps a malicious user from triggering an
# 800-shot LLM bill via a huge body.
DIRECTOR_SHOT_CAP = 12


class DirectorCharacter(BaseModel):
    name: str
    static_features: str
    dynamic_features: str = ""
    voice_hint: str = ""


class DirectorShot(BaseModel):
    idx: int
    scene_idx: int = 0
    prompt: str
    ff_desc: str = ""
    lf_desc: str = ""
    motion_desc: str = ""
    duration_s: Literal[5, 8] = 5
    model: str = "happyhorse-1.0"
    characters_in_shot: List[str] = []


class DirectorStoryboardMeta(BaseModel):
    scene_count: int
    shot_count: int
    lang: str
    cached: bool


class DirectorStoryboard(BaseModel):
    characters: List[DirectorCharacter]
    shots: List[DirectorShot]
    total_cost_cr: int
    meta: DirectorStoryboardMeta


class DirectorPlanRequest(BaseModel):
    text: str
    lang: Optional[Literal["en", "zh", "ja", "ko"]] = "en"


def _nest_base_url() -> str:
    """Internal address of the nest-app service. Reuses the same env
    var (`NEST_ORIGIN`) the /nest-proxy route in backend/main.py uses,
    so a single deploy config covers both. The /nest prefix is the
    global API prefix nest-app exposes."""
    return os.getenv("NEST_ORIGIN", "http://127.0.0.1:3008")


@router.post("/plan", response_model=DirectorStoryboard)
async def director_plan(
    body: DirectorPlanRequest,
    user=Depends(get_current_user),
):
    """Generate a storyboard from a long-form idea / story.

    We proxy through nest-app rather than calling ZenMux directly here
    so the LLM provider switch + caching stay in one place.
    """
    if not body.text or len(body.text.strip()) < 8:
        raise HTTPException(status_code=400, detail="text too short")
    if len(body.text) > 6000:
        body.text = body.text[:6000]

    try:
        resp = requests.post(
            f"{_nest_base_url()}/nest/director/plan",
            json={"text": body.text, "lang": body.lang},
            timeout=90,  # 3 sequential LLM calls; 90s gives headroom
        )
    except Exception as e:
        log.warning("director nest call failed: %s", e)
        raise HTTPException(status_code=502, detail=f"director upstream: {e}")
    if resp.status_code != 200:
        log.warning(
            "director nest non-200 status=%s body=%s",
            resp.status_code,
            resp.text[:300],
        )
        raise HTTPException(
            status_code=502,
            detail=f"director upstream {resp.status_code}: {resp.text[:200]}",
        )

    payload = resp.json()

    # Server-side cost recompute. The nest agent computed its own number;
    # we recompute from the storyboard so the client can't dodge billing
    # by editing total_cost_cr before /charge.
    shots = payload.get("shots") or []
    if len(shots) > DIRECTOR_SHOT_CAP:
        shots = shots[:DIRECTOR_SHOT_CAP]
        payload["shots"] = shots
    total = sum(_happyhorse_cost_cr(int(s.get("duration_s") or 5)) for s in shots)
    payload["total_cost_cr"] = total

    # Re-validate via the pydantic model — drops anything malformed.
    return DirectorStoryboard.model_validate(payload)


# ============================================================================
# /charge — verify the DLP transfer + mint the director paid bucket.
# Mirrors /canvas/charge logic; only the Redis key prefix differs so the
# two modes can't accidentally share a bucket.
# ============================================================================

class DirectorChargeRequest(BaseModel):
    run_id: str
    hash: str
    address: str
    amount: str  # DLP whole tokens (e.g. "9060" for a 9 060 cr storyboard)


class DirectorChargeResponse(BaseModel):
    ok: bool
    run_id: str
    paid_amount: str
    message: Optional[str] = None


PAID_BUCKET_TTL_S = 3600


def _director_paid_key(user_id: str, run_id: str) -> str:
    return f"director:paid:{user_id}:{run_id}"


@router.post("/charge", response_model=DirectorChargeResponse)
async def director_charge(
    body: DirectorChargeRequest,
    user=Depends(get_current_user),
):
    from apps.web.routers.pointpay import (
        DLCP_TOKEN_ADDRESS,
        DLCP_RECEIVE_ADDRESS,
        TOKEN_DECIMALS,
        w3_dbc,
    )
    from apps.web.models.pay import PayTableInstall
    from apps.redis.redis_client import RedisClientInstance

    if not body.run_id or not body.hash or not body.address or not body.amount:
        raise HTTPException(status_code=400, detail="missing required fields")

    try:
        if PayTableInstall.is_hash_used(body.hash):
            return DirectorChargeResponse(
                ok=False, run_id=body.run_id, paid_amount="0",
                message="tx hash already used",
            )
    except Exception:
        pass

    try:
        tx_receipt = await asyncio.to_thread(
            w3_dbc.eth.wait_for_transaction_receipt, body.hash, timeout=30,
        )
    except Exception as e:
        log.info("director charge wait_for_transaction_receipt error: %s", e)
        return DirectorChargeResponse(
            ok=False, run_id=body.run_id, paid_amount="0",
            message=f"tx not confirmed: {e}",
        )

    if tx_receipt.status != 1:
        return DirectorChargeResponse(
            ok=False, run_id=body.run_id, paid_amount="0",
            message="tx failed on chain",
        )

    try:
        expected_wei = int(float(body.amount) * (10 ** TOKEN_DECIMALS))
    except (ValueError, TypeError):
        return DirectorChargeResponse(
            ok=False, run_id=body.run_id, paid_amount="0",
            message="invalid amount",
        )

    transfer_sig = w3_dbc.keccak(text="Transfer(address,address,uint256)").hex()

    matched = False
    for evt in tx_receipt["logs"]:
        if evt["topics"][0].hex() != transfer_sig:
            continue
        from_hex = evt["topics"][1].hex()[24:]
        to_hex = evt["topics"][2].hex()[24:]
        from_addr = w3_dbc.to_checksum_address("0x" + from_hex)
        to_addr = w3_dbc.to_checksum_address("0x" + to_hex)
        if from_addr.lower() != body.address.lower():
            continue
        if to_addr.lower() != DLCP_RECEIVE_ADDRESS.lower():
            continue
        if evt["address"].lower() != DLCP_TOKEN_ADDRESS.lower():
            continue
        try:
            actual_wei = int(evt["data"].hex(), 16)
        except (ValueError, AttributeError):
            try:
                actual_wei = int(evt["data"], 16)
            except (ValueError, TypeError):
                continue
        if actual_wei < expected_wei:
            continue
        matched = True
        break

    if not matched:
        return DirectorChargeResponse(
            ok=False, run_id=body.run_id, paid_amount="0",
            message="no matching DLP Transfer log",
        )

    try:
        PayTableInstall.insert_pay(
            wallet_addr=body.address,
            model=f"director:run:{body.run_id}",
            size="",
            duration=0,
            amount=body.amount,
            messageid=f"director:charge:{body.run_id}",
            hash=body.hash,
            status=True,
            currpay=True,
        )
    except Exception as e:
        log.warning("director charge audit insert failed: %s", e)

    try:
        RedisClientInstance.add_key_value(
            _director_paid_key(user.id, body.run_id),
            {
                "amount_dlcp": body.amount,
                "tx_hash": body.hash,
                "wallet": body.address,
                "spent_cr": 0,
            },
            ttl=PAID_BUCKET_TTL_S,
        )
    except Exception as e:
        log.warning("director charge redis flag write failed: %s", e)

    return DirectorChargeResponse(
        ok=True, run_id=body.run_id, paid_amount=body.amount,
        message="payment verified",
    )


# ============================================================================
# /run — SSE stream that drives the storyboard end-to-end.
# Reuses canvas's _real_videogen + _real_stitcher (the shipped, tested
# implementations) so we don't fork the generation path.
# ============================================================================

class DirectorRunRequest(BaseModel):
    run_id: str
    storyboard: DirectorStoryboard
    transitions: Literal["cut", "crossfade"] = "crossfade"


def _director_paid_check(user_id: str, run_id: str, block_cost_cr: int):
    """Returns (ok, remaining, err)."""
    from apps.redis.redis_client import RedisClientInstance
    if not user_id or not run_id:
        return (False, 0.0, "missing user or run_id")
    paid = RedisClientInstance.get_value_by_key(
        _director_paid_key(user_id, run_id)
    )
    if not paid:
        return (False, 0.0, f"no payment for run_id={run_id} (POST /director/charge first)")
    try:
        remaining = float(paid.get("amount_dlcp", "0")) - float(paid.get("spent_cr", 0))
    except Exception:
        return (False, 0.0, "corrupt payment record")
    if remaining + 1e-6 < float(block_cost_cr):
        return (False, remaining,
                f"insufficient credits: need {block_cost_cr}, have {remaining:.0f}")
    return (True, remaining, "")


def _director_paid_consume(user_id: str, run_id: str, block_cost_cr: int) -> None:
    from apps.redis.redis_client import RedisClientInstance
    if not user_id or not run_id or block_cost_cr <= 0:
        return
    key = _director_paid_key(user_id, run_id)
    paid = RedisClientInstance.get_value_by_key(key)
    if not paid:
        return
    paid["spent_cr"] = int(paid.get("spent_cr", 0)) + int(block_cost_cr)
    try:
        RedisClientInstance.add_key_value(key, paid, ttl=PAID_BUCKET_TTL_S)
    except Exception:
        pass


def _build_shot_prompt(shot: DirectorShot, characters: List[DirectorCharacter]) -> str:
    """Compose the prompt sent to HappyHorse:
    - storyboard prompt (motion + style)
    - character bible anchors for static features + voice
    - the shot's motion descriptor

    Keeps text-layer continuity strong across cuts. The i2v chain
    handles pixel-level continuity (last-frame → first-frame).
    """
    bits: List[str] = [shot.prompt.strip()]
    if shot.motion_desc:
        bits.append(f"Camera motion: {shot.motion_desc}.")
    # Inject anchors for every character actually visible in this shot.
    in_shot = set(n.strip() for n in (shot.characters_in_shot or []))
    for c in characters:
        if c.name in in_shot and c.static_features:
            piece = f"{c.name} ({c.static_features}"
            if c.voice_hint:
                piece += f"; voice: {c.voice_hint}"
            piece += ")"
            bits.append(piece)
    return " ".join(b for b in bits if b)


@router.post("/run")
async def director_run(
    body: DirectorRunRequest,
    user=Depends(get_current_user),
):
    """Orchestrates the storyboard. Streams SSE progress.

    Event shapes (data: <json>\\n\\n):
      { "type": "start",   "shot_count": int }
      { "type": "shot",    "idx": int, "status": "running"|"ok"|"failed",
                            "url"?: str, "elapsed_s"?: float, "error"?: str }
      { "type": "stitch",  "status": "running"|"ok"|"failed",
                            "url"?: str, "error"?: str }
      { "type": "done",    "final_url": str, "total_elapsed_s": float }
      { "type": "error",   "message": str }
    """
    if not body.run_id or not body.storyboard or not body.storyboard.shots:
        raise HTTPException(status_code=400, detail="missing run_id or storyboard")

    user_id = getattr(user, "id", None)
    if not user_id:
        raise HTTPException(status_code=401, detail="auth required")

    # Lazy import: pulls in WaveAPI/OSS deps only when /run is called.
    # _real_videogen internally extracts the last frame when
    # `chain_from_video_url` is in inputs, so we don't need the
    # _extract_last_frame_to_oss helper directly.
    from apps.web.routers.canvas import (
        CanvasRunBlockRequest,
        _real_videogen,
        _real_stitcher,
    )

    storyboard = body.storyboard
    shots = list(storyboard.shots)
    characters = list(storyboard.characters)

    async def stream():
        t0 = time.monotonic()
        yield f"data: {json.dumps({'type': 'start', 'shot_count': len(shots)})}\n\n"
        clip_urls: List[str] = []
        chain_url: Optional[str] = None  # carries lf of previous shot for i2v

        for shot in shots:
            shot_cost = _happyhorse_cost_cr(int(shot.duration_s))
            ok, _remaining, err = _director_paid_check(
                user_id, body.run_id, shot_cost
            )
            if not ok:
                yield f"data: {json.dumps({'type': 'shot', 'idx': shot.idx, 'status': 'failed', 'error': err})}\n\n"
                yield f"data: {json.dumps({'type': 'error', 'message': err})}\n\n"
                return

            yield f"data: {json.dumps({'type': 'shot', 'idx': shot.idx, 'status': 'running'})}\n\n"

            block_id = f"director-{body.run_id}-{shot.idx}"
            prompt = _build_shot_prompt(shot, characters)
            inputs: Dict[str, Any] = {"prompt": prompt}
            if chain_url:
                # _real_videogen knows to extract the last frame and
                # route to the i2v endpoint when this is present.
                inputs["chain_from_video_url"] = chain_url

            req = CanvasRunBlockRequest(
                block_id=block_id,
                block_type="videogen",
                config={
                    "model": shot.model or "happyhorse-1.0",
                    "duration": int(shot.duration_s),
                    "resolution": "720p",
                },
                inputs=inputs,
            )
            started = time.monotonic()
            try:
                resp = await _real_videogen(req, started)
            except Exception as e:
                log.warning("director videogen crash shot=%s: %s", shot.idx, e)
                yield f"data: {json.dumps({'type': 'shot', 'idx': shot.idx, 'status': 'failed', 'error': f'crash: {e}'})}\n\n"
                yield f"data: {json.dumps({'type': 'error', 'message': str(e)})}\n\n"
                return

            elapsed = round(time.monotonic() - started, 2)
            if resp.status != "ok" or not resp.output_url:
                yield f"data: {json.dumps({'type': 'shot', 'idx': shot.idx, 'status': 'failed', 'error': resp.error or 'no output_url', 'elapsed_s': elapsed})}\n\n"
                yield f"data: {json.dumps({'type': 'error', 'message': resp.error or 'shot failed'})}\n\n"
                return

            _director_paid_consume(user_id, body.run_id, shot_cost)
            clip_urls.append(resp.output_url)
            chain_url = resp.output_url

            yield f"data: {json.dumps({'type': 'shot', 'idx': shot.idx, 'status': 'ok', 'url': resp.output_url, 'elapsed_s': elapsed})}\n\n"

        # ----- Stitch -----
        if len(clip_urls) == 1:
            # Single shot — no stitch needed.
            total_elapsed = round(time.monotonic() - t0, 2)
            yield f"data: {json.dumps({'type': 'done', 'final_url': clip_urls[0], 'total_elapsed_s': total_elapsed})}\n\n"
            return

        yield f"data: {json.dumps({'type': 'stitch', 'status': 'running'})}\n\n"
        stitch_req = CanvasRunBlockRequest(
            block_id=f"director-{body.run_id}-stitch",
            block_type="stitcher",
            config={"transitions": body.transitions},
            inputs={"clips": clip_urls},
        )
        st0 = time.monotonic()
        try:
            stitched = await _real_stitcher(stitch_req, st0)
        except Exception as e:
            log.warning("director stitcher crash: %s", e)
            yield f"data: {json.dumps({'type': 'stitch', 'status': 'failed', 'error': str(e)})}\n\n"
            yield f"data: {json.dumps({'type': 'error', 'message': str(e)})}\n\n"
            return

        if stitched.status != "ok" or not stitched.output_url:
            yield f"data: {json.dumps({'type': 'stitch', 'status': 'failed', 'error': stitched.error or 'no output_url'})}\n\n"
            yield f"data: {json.dumps({'type': 'error', 'message': stitched.error or 'stitch failed'})}\n\n"
            return

        total_elapsed = round(time.monotonic() - t0, 2)
        yield f"data: {json.dumps({'type': 'stitch', 'status': 'ok', 'url': stitched.output_url})}\n\n"
        yield f"data: {json.dumps({'type': 'done', 'final_url': stitched.output_url, 'total_elapsed_s': total_elapsed})}\n\n"

    return StreamingResponse(stream(), media_type="text/event-stream")
