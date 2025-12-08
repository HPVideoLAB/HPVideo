from typing import Any, Dict
from fastapi import APIRouter, Request
from cdp.x402 import create_facilitator_config
from x402.fastapi.middleware import require_payment
from apps.web.models.pay import PayTableInstall
from apps.web.ai.wave import WaveApiInstance
import uuid
import os

router = APIRouter()

COINBASE_KEY = os.getenv("COINBASE_KEY")
COINBASE_SECRET = os.getenv("COINBASE_SECRET")
COINBASE_ADDRESS = os.getenv("COINBASE_ADDRESS")
BASE_URL = os.getenv("BASE_URL")

facilitator_config = create_facilitator_config(
    api_key_id= COINBASE_KEY,
    api_key_secret= COINBASE_SECRET
)

# Define an outer middleware
async def payment_middleware(request: Request, call_next):
    # Only effective for the target path
    if request.url.path == "/creator/api/v1/x402/creator/wan-2.5":
        # Calculate the price
        result = calTotal(request, "wan-2.5")
        request.state.messageid = result["messageid"]
        
        # Call require_payment middleware
        inner_middleware = require_payment(
            path="/creator/api/v1/x402/creator/wan-2.5",
            price=result["amount"],
            pay_to_address=COINBASE_ADDRESS,
            network="base",
            facilitator_config=facilitator_config
        )
        # Execute the inner middleware
        response = await inner_middleware(request, call_next)
        
        # add cache control headers to disable caching
        response.headers["Cache-Control"] = "no-cache, no-store, must-revalidate"
        response.headers["Pragma"] = "no-cache"
        response.headers["Expires"] = "0"
        return response
       
    # Only effective for the target path
    if request.url.path == "/creator/api/v1/x402/creator/sora-2":
        # Calculate the price
        result = calTotal(request, "wan-2.5")
        request.state.messageid = result["messageid"]

        # Call require_payment middleware
        inner_middleware = require_payment(
            path="/creator/api/v1/x402/creator/sora-2",
            price=result["amount"],
            pay_to_address=COINBASE_ADDRESS,
            network="base",
            facilitator_config=facilitator_config
        )
        # Execute the inner middleware
        response = await inner_middleware(request, call_next)
        
        # add cache control headers to disable caching
        response.headers["Cache-Control"] = "no-cache, no-store, must-revalidate"
        response.headers["Pragma"] = "no-cache"
        response.headers["Expires"] = "0"
        return response
    
    # Only effective for the target path
    if request.url.path == "/creator/api/v1/x402/creator/ovi":
        # Calculate the price
        result = calTotal(request, "wan-2.5")
        request.state.messageid = result["messageid"]

        # Call require_payment middleware
        inner_middleware = require_payment(
            path="/creator/api/v1/x402/creator/ovi",
            price=result["amount"],
            pay_to_address=COINBASE_ADDRESS,
            network="base",
            facilitator_config=facilitator_config
        )
        # Execute the inner middleware
        response = await inner_middleware(request, call_next)
        
        # add cache control headers to disable caching
        response.headers["Cache-Control"] = "no-cache, no-store, must-revalidate"
        response.headers["Pragma"] = "no-cache"
        response.headers["Expires"] = "0"
        return response
    
    # Only effective for the target path
    if request.url.path == "/creator/api/v1/x402/creator/veo3.1":
        # Calculate the price
        result = calTotal(request, "wan-2.5")
        request.state.messageid = result["messageid"]

        # Call require_payment middleware
        inner_middleware = require_payment(
            path="/creator/api/v1/x402/creator/veo3.1",
            price=result["amount"],
            pay_to_address=COINBASE_ADDRESS,
            network="base",
            facilitator_config=facilitator_config
        )
        # Execute the inner middleware
        response = await inner_middleware(request, call_next)
        
        # add cache control headers to disable caching
        response.headers["Cache-Control"] = "no-cache, no-store, must-revalidate"
        response.headers["Pragma"] = "no-cache"
        response.headers["Expires"] = "0"
        return response
    
    # Only effective for the target path
    if request.url.path == "/creator/api/v1/x402/creator/ltx-2-pro":
        # Calculate the price
        result = calTotal(request, "wan-2.5")
        request.state.messageid = result["messageid"]

        # Call require_payment middleware
        inner_middleware = require_payment(
            path="/creator/api/v1/x402/creator/ltx-2-pro",
            price=result["amount"],
            pay_to_address=COINBASE_ADDRESS,
            network="base",
            facilitator_config=facilitator_config
        )
        # Execute the inner middleware
        response = await inner_middleware(request, call_next)
        
        # add cache control headers to disable caching
        response.headers["Cache-Control"] = "no-cache, no-store, must-revalidate"
        response.headers["Pragma"] = "no-cache"
        response.headers["Expires"] = "0"
        return response
    
    # Only effective for the target path
    if request.url.path == "/creator/api/v1/x402/creator/hailuo-02":
        # Calculate the price
        result = calTotal(request, "wan-2.5")
        request.state.messageid = result["messageid"]

        # Call require_payment middleware
        inner_middleware = require_payment(
            path="/creator/api/v1/x402/creator/hailuo-02",
            price=result["amount"],
            pay_to_address=COINBASE_ADDRESS,
            network="base",
            facilitator_config=facilitator_config
        )
        # Execute the inner middleware
        response = await inner_middleware(request, call_next)
        
        # add cache control headers to disable caching
        response.headers["Cache-Control"] = "no-cache, no-store, must-revalidate"
        response.headers["Pragma"] = "no-cache"
        response.headers["Expires"] = "0"
        return response
    
    # Only effective for the target path
    if request.url.path == "/creator/api/v1/x402/creator/seedance":
        # Calculate the price
        result = calTotal(request, "wan-2.5")
        request.state.messageid = result["messageid"]

        # Call require_payment middleware
        inner_middleware = require_payment(
            path="/creator/api/v1/x402/creator/seedance",
            price=result["amount"],
            pay_to_address=COINBASE_ADDRESS,
            network="base",
            facilitator_config=facilitator_config
        )
        # Execute the inner middleware
        response = await inner_middleware(request, call_next)
        
        # add cache control headers to disable caching
        response.headers["Cache-Control"] = "no-cache, no-store, must-revalidate"
        response.headers["Pragma"] = "no-cache"
        response.headers["Expires"] = "0"
        return response
    
    # Only effective for the target path
    if request.url.path == "/creator/api/v1/x402/creator/kling":
        # Calculate the price
        result = calTotal(request, "wan-2.5")
        request.state.messageid = result["messageid"]

        # Call require_payment middleware
        inner_middleware = require_payment(
            path="/creator/api/v1/x402/creator/kling",
            price=result["amount"],
            pay_to_address=COINBASE_ADDRESS,
            network="base",
            facilitator_config=facilitator_config
        )
        # Execute the inner middleware
        response = await inner_middleware(request, call_next)
        
        # add cache control headers to disable caching
        response.headers["Cache-Control"] = "no-cache, no-store, must-revalidate"
        response.headers["Pragma"] = "no-cache"
        response.headers["Expires"] = "0"
        return response
    
    # Only effective for the target path
    if request.url.path == "/creator/api/v1/x402/creator/pixverse":
        # Calculate the price
        result = calTotal(request, "wan-2.5")
        request.state.messageid = result["messageid"]

        # Call require_payment middleware
        inner_middleware = require_payment(
            path="/creator/api/v1/x402/creator/pixverse",
            price=result["amount"],
            pay_to_address=COINBASE_ADDRESS,
            network="base",
            facilitator_config=facilitator_config
        )
        # Execute the inner middleware
        response = await inner_middleware(request, call_next)
        
        # add cache control headers to disable caching
        response.headers["Cache-Control"] = "no-cache, no-store, must-revalidate"
        response.headers["Pragma"] = "no-cache"
        response.headers["Expires"] = "0"
        return response
    
    # Non-target paths are directly allowed through
    return await call_next(request)

def calTotal(request: Request, model: str):
    address = "wallet_x402pay"
    messageid = str(uuid.uuid4())
    size = request.query_params.get("size")
    duration = request.query_params.get("duration")
    return WaveApiInstance.calc_model_price(model, duration, size, messageid)
    

@router.get("/creator/wan-2.5")
async def get_param(messageid: str, prompt: str, size: str, duration: int) -> Dict[str, Any]:
    pay = PayTableInstall.get_by_messageid(messageid)
    if pay is not None:
        PayTableInstall.update_status(pay.id, True, True)
    result = WaveApiInstance.x402create("alibaba", "wan-2.5/text-to-video", prompt, duration, size)
    if result is not None and result.get('code') == 200:
        requestId = result['data']['id']

    return {
        "success": True,
        "model": "wan2.5",
        "path": f"{BASE_URL}?createid={requestId}"
    }

@router.get("/creator/sora-2")
async def get_param(messageid: str, prompt: str, size: str, duration: int) -> Dict[str, Any]:
    pay = PayTableInstall.get_by_messageid(messageid)
    if pay is not None:
        PayTableInstall.update_status(pay.id, True, True)
    result = WaveApiInstance.x402create("openai", "sora-2/text-to-video", prompt, duration, size)
    if result is not None and result.get('code') == 200:
        requestId = result['data']['id']

    return {
        "success": True,
        "model": "wan2.5",
        "path": f"{BASE_URL}?createid={requestId}"
    }

@router.get("/creator/ovi")
async def get_param(messageid: str, prompt: str, size: str, duration: int) -> Dict[str, Any]:
    pay = PayTableInstall.get_by_messageid(messageid)
    if pay is not None:
        PayTableInstall.update_status(pay.id, True, True)
    result = WaveApiInstance.x402create("character-ai", "ovi/text-to-video", prompt, duration, size)
    if result is not None and result.get('code') == 200:
        requestId = result['data']['id']

    return {
        "success": True,
        "model": "wan2.5",
        "path": f"{BASE_URL}?createid={requestId}"
    }

@router.get("/creator/veo3.1")
async def get_param(messageid: str, prompt: str, size: str, duration: int) -> Dict[str, Any]:
    pay = PayTableInstall.get_by_messageid(messageid)
    if pay is not None:
        PayTableInstall.update_status(pay.id, True, True)
    result = WaveApiInstance.x402create("google", "veo3.1/text-to-video", prompt, duration, size)
    if result is not None and result.get('code') == 200:
        requestId = result['data']['id']

    return {
        "success": True,
        "model": "wan2.5",
        "path": f"{BASE_URL}?createid={requestId}"
    }

@router.get("/creator/ltx-2-pro")
async def get_param(messageid: str, prompt: str, size: str, duration: int) -> Dict[str, Any]:
    pay = PayTableInstall.get_by_messageid(messageid)
    if pay is not None:
        PayTableInstall.update_status(pay.id, True, True)
    result = WaveApiInstance.x402create("lightricks", "ltx-2-pro/text-to-video", prompt, duration, size)
    if result is not None and result.get('code') == 200:
        requestId = result['data']['id']

    return {
        "success": True,
        "model": "wan2.5",
        "path": f"{BASE_URL}?createid={requestId}"
    }

@router.get("/creator/hailuo-02")
async def get_param(messageid: str, prompt: str, size: str, duration: int) -> Dict[str, Any]:
    pay = PayTableInstall.get_by_messageid(messageid)
    if pay is not None:
        PayTableInstall.update_status(pay.id, True, True)
    result = WaveApiInstance.x402create("minimax", "hailuo-02/t2v-standard", prompt, duration, size)
    if result is not None and result.get('code') == 200:
        requestId = result['data']['id']

    return {
        "success": True,
        "model": "wan2.5",
        "path": f"{BASE_URL}?createid={requestId}"
    }

@router.get("/creator/seedance")
async def get_param(messageid: str, prompt: str, size: str, duration: int) -> Dict[str, Any]:
    pay = PayTableInstall.get_by_messageid(messageid)
    if pay is not None:
        PayTableInstall.update_status(pay.id, True, True)
    result = WaveApiInstance.x402create("bytedance", "seedance-v1-pro-t2v-480p", prompt, duration, size)
    if result is not None and result.get('code') == 200:
        requestId = result['data']['id']

    return {
        "success": True,
        "model": "wan2.5",
        "path": f"{BASE_URL}?createid={requestId}"
    }

@router.get("/creator/kling")
async def get_param(messageid: str, prompt: str, size: str, duration: int) -> Dict[str, Any]:
    pay = PayTableInstall.get_by_messageid(messageid)
    if pay is not None:
        PayTableInstall.update_status(pay.id, True, True)
    result = WaveApiInstance.x402create("kwaivgi", "kling-v2.0-t2v-master", prompt, duration, size)
    if result is not None and result.get('code') == 200:
        requestId = result['data']['id']

    return {
        "success": True,
        "model": "wan2.5",
        "path": f"{BASE_URL}?createid={requestId}"
    }

@router.get("/creator/pixverse")
async def get_param(messageid: str, prompt: str, size: str, duration: int) -> Dict[str, Any]:
    pay = PayTableInstall.get_by_messageid(messageid)
    if pay is not None:
        PayTableInstall.update_status(pay.id, True, True)
    result = WaveApiInstance.x402create("pixverse", "pixverse-v4.5-t2v", prompt, duration, size)
    if result is not None and result.get('code') == 200:
        requestId = result['data']['id']

    return {
        "success": True,
        "model": "wan2.5",
        "path": f"{BASE_URL}?createid={requestId}"
    }