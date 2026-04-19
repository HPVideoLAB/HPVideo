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
MODEL_REGISTRY: Dict[str, Dict[str, str]] = {
    "wan-2.5":    {"vendor": "alibaba",     "model": "wan-2.5/text-to-video"},
    "sora-2":     {"vendor": "openai",      "model": "sora-2/text-to-video"},
    "ovi":        {"vendor": "character-ai", "model": "ovi/text-to-video"},
    "veo3.1":     {"vendor": "google",      "model": "veo3.1/text-to-video"},
    "ltx-2-pro":  {"vendor": "lightricks",  "model": "ltx-2-pro/text-to-video"},
    "hailuo-02":  {"vendor": "minimax",     "model": "hailuo-02/t2v-standard"},
    "seedance":   {"vendor": "bytedance",   "model": "seedance-v1-pro-t2v-480p"},
    "kling":      {"vendor": "kwaivgi",     "model": "kling-v2.0-t2v-master"},
    "pixverse":   {"vendor": "pixverse",    "model": "pixverse-v4.5-t2v"},
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
