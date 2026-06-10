"""Director Mode backend router.

Three endpoints under /director:

* POST /plan   — thin proxy to nest-app's /director/plan (3 LLM agents:
                 scene splitter + character bible + storyboard artist).
                 Server-side recomputes total_cost_cr from pricing.ts
                 mirror so the client can't fudge the price.
* POST /charge — on-chain DLP transfer verification, mints the Redis
                 paid bucket. Same shape as /canvas/charge so the
                 frontend can reuse dlcpCharge.ts.
* POST /run    — drives the storyboard end-to-end via canvas internals
                 (_real_videogen + i2v chain + _real_stitcher). Drains
                 the paid bucket per shot.

Phase-1 lands /plan + the schemas. /charge and /run come in Phase 2.
"""

import logging
import os
from typing import Any, Dict, List, Literal, Optional

import requests
from fastapi import APIRouter, Depends, HTTPException, Request, status
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
