from typing import Any, Dict
from fastapi import APIRouter, Request
from cdp.x402 import create_facilitator_config
from x402.fastapi.middleware import require_payment
from apps.web.models.pay import PayTableInstall
from apps.web.ai.wave import WaveApiInstance
import uuid
import os
import logging

log = logging.getLogger(__name__)

router = APIRouter()

COINBASE_KEY = os.getenv("COINBASE_KEY")
COINBASE_SECRET = os.getenv("COINBASE_SECRET")
COINBASE_ADDRESS = os.getenv("COINBASE_ADDRESS")
BASE_URL = os.getenv("BASE_URL")

facilitator_config = create_facilitator_config(
    api_key_id=COINBASE_KEY,
    api_key_secret=COINBASE_SECRET,
)

# Single source of truth for all x402 creator models.
# key = model slug (used in URL path and pricing lookup)
# value = (vendor, full model name passed to WaveApi.x402create)
#
# Sora 2 was removed on 2026-04-22 after OpenAI announced discontinuation:
#   - Sora app shuts down 2026-04-26
#   - Sora API shuts down 2026-09-24
# Replaced by Luma Ray 2 and Vidu Q3, both available on WaveSpeed.
# All other models upgraded to latest versions supported by WaveSpeed docs
# (wavespeed.ai/docs) as of 2026-04-22.
MODEL_REGISTRY: Dict[str, Dict[str, str]] = {
    # Alibaba WAN 2.5 → 2.7 (latest; 2.5/2.6 still on WaveSpeed)
    "wan-2.7":    {"vendor": "alibaba",     "model": "wan-2.7/text-to-video"},
    # Character.ai OVI (still current)
    "ovi":        {"vendor": "character-ai", "model": "ovi/text-to-video"},
    # Google Veo 3.1 (still current; slug normalized from veo3.1)
    "veo-3.1":    {"vendor": "google",      "model": "veo-3.1/text-to-video"},
    # Lightricks LTX 2 Pro → 2.3
    "ltx-2.3":    {"vendor": "lightricks",  "model": "ltx-2.3/text-to-video"},
    # Minimax Hailuo 02 → 2.3
    "hailuo-2.3": {"vendor": "minimax",     "model": "hailuo-2.3/t2v-standard"},
    # ByteDance Seedance V1 → 2.0 (confirmed WaveSpeed path: bytedance/seedance-2.0/text-to-video)
    "seedance-2.0": {"vendor": "bytedance", "model": "seedance-2.0/text-to-video"},
    # Kwaivgi Kling V2.0 → V3.0
    "kling-3.0":  {"vendor": "kwaivgi",     "model": "kling-v3.0-std/text-to-video"},
    # Pixverse V4.5 → V6
    "pixverse-v6": {"vendor": "pixverse",   "model": "pixverse-v6/text-to-video"},
    # NEW: Luma Ray 2 (confirmed WaveSpeed path: luma/ray-2-t2v — uses combined slug)
    "luma-ray-2": {"vendor": "luma",        "model": "ray-2-t2v"},
    # NEW: Vidu Q3 (confirmed WaveSpeed path: vidu/q3/text-to-video)
    "vidu-q3":    {"vendor": "vidu",        "model": "q3/text-to-video"},
}

_ROUTE_PREFIX = "/creator/api/v1/x402/creator/"


def _no_cache(response):
    response.headers["Cache-Control"] = "no-cache, no-store, must-revalidate"
    response.headers["Pragma"] = "no-cache"
    response.headers["Expires"] = "0"
    return response


async def payment_middleware(request: Request, call_next):
    """Unified x402 payment gate for all creator models.

    Replaces 9 near-identical if-blocks that also had a copy-paste bug:
    every branch called calTotal(request, "wan-2.5") regardless of the
    actual model, so non-wan-2.5 models were all priced as wan-2.5.
    """
    path = request.url.path
    if not path.startswith(_ROUTE_PREFIX):
        return await call_next(request)

    slug = path[len(_ROUTE_PREFIX):]
    if slug not in MODEL_REGISTRY:
        return await call_next(request)

    # Correct per-model pricing (fixes prior bug).
    result = calTotal(request, slug)
    request.state.messageid = result["messageid"]

    inner_middleware = require_payment(
        path=path,
        price=result["amount"],
        pay_to_address=COINBASE_ADDRESS,
        network="base",
        facilitator_config=facilitator_config,
    )
    response = await inner_middleware(request, call_next)
    return _no_cache(response)


def calTotal(request: Request, model: str):
    messageid = str(uuid.uuid4())
    size = request.query_params.get("size")
    duration = request.query_params.get("duration")
    return WaveApiInstance.calc_model_price(model, duration, size, messageid)


def _make_creator_handler(slug: str):
    """Factory: build a GET handler for one model slug."""
    cfg = MODEL_REGISTRY[slug]

    async def handler(messageid: str, prompt: str, size: str, duration: int) -> Dict[str, Any]:
        pay = PayTableInstall.get_by_messageid(messageid)
        if pay is not None:
            PayTableInstall.update_status(pay.id, True, True)

        result = WaveApiInstance.x402create(
            cfg["vendor"], cfg["model"], prompt, duration, size
        )

        request_id = None
        if result is not None and result.get("code") == 200:
            request_id = result["data"]["id"]
        else:
            log.warning(
                f"x402create failed for {slug}: {result.get('code') if result else 'no response'}"
            )

        return {
            "success": request_id is not None,
            "model": slug,
            "path": f"{BASE_URL}?createid={request_id}" if request_id else None,
        }

    handler.__name__ = f"get_param_{slug.replace('-', '_').replace('.', '_')}"
    return handler


# Register one GET endpoint per registered model.
for _slug in MODEL_REGISTRY:
    router.get(f"/creator/{_slug}")(_make_creator_handler(_slug))
