from typing import Any, Dict
from fastapi import APIRouter, Request
from cdp.x402 import create_facilitator_config
from x402.fastapi.middleware import require_payment
from apps.web.models.pay import PayTableInstall
import os

router = APIRouter()

COINBASE_KEY = os.getenv("COINBASE_KEY")
COINBASE_SECRET = os.getenv("COINBASE_SECRET")
COINBASE_ADDRESS = os.getenv("COINBASE_ADDRESS")

facilitator_config = create_facilitator_config(
    api_key_id= COINBASE_KEY,
    api_key_secret= COINBASE_SECRET
)

amounts = {
  "wan-2.5": {
    "480": {"5": 0.375, "10": 0.75},
    "720": {"5": 0.75, "10": 1.5}, 
    "1080": {"5": 1.125, "10": 2.25}
  },
  "sora-2": {
    "720": {"4": 0.45, "8": 1.35, "12": 2.7}
  },
  "ovi": {
    "540": {"10": 0.45, "30": 1.35, "60": 2.7}
  },
  "veo3.1": {
    "*": {"4": 2.4, "6": 3.6, "8": 4.8}
  },
  "ltx-2-pro": {
    "*": {"6": 0.54, "8": 0.72, "10": 0.9}
  },
  "hailuo-02": {
    "*": {"6": 0.345, "10": 0.84}
  },
  "seedance": {
    "*": {"6": 0.27, "9": 0.405, "12": 0.54}
  },
  "kling": {
    "*": {"5": 1.95, "10": 3.9}
  },
  "pixverse": {
    "*": {"5": 0.525, "8": 1.05}
  }
}

# Define an outer middleware
async def payment_middleware(request: Request, call_next):
    # Only effective for the target path
    if request.url.path == "/creator/api/v1/x402/creator":
        # Calculate the price
        price = calTotal(request)
        
        # Call require_payment middleware
        inner_middleware = require_payment(
            path="/creator/api/v1/x402/creator",
            price=price,
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

def calTotal(request: Request):
    query_params = request.query_params
    address = query_params.get("address")
    model = query_params.get("model")
    size = query_params.get("size")
    duration = query_params.get("duration")
    messageid = query_params.get("messageid")
    amount_dict = amounts.get(model)
    amount = "$0.02"
    if model is not None and messageid is not None:
        for key in amount_dict:
          if size.find(key) != -1:
              amount = f"${amount_dict.get(key).get(str(duration))}"
        pay = PayTableInstall.get_by_messageid(messageid)
        if pay is None:
            PayTableInstall.insert_pay(address, model, size, duration, amount, messageid) 
    return amount

@router.get("/creator")
async def get_param(model: str, messageid: str) -> Dict[str, Any]:
    pay = PayTableInstall.get_by_messageid(messageid)
    if pay is not None:
        PayTableInstall.update_status(pay.id, True)
    return {
        "model": model,
        "messageid": messageid
    }