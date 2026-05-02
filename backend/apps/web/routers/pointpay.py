from fastapi import APIRouter, Request, Depends
from web3 import Web3
import os
import asyncio

from apps.web.models.pay import PayTableInstall
from utils.utils import get_current_user
import logging

log = logging.getLogger(__name__)

router = APIRouter()

# DBC Chain RPC for verifying DLCP transfers
DBC_RPC = "https://rpc1.dbcwallet.io"
# DLCP Token contract on DBC Chain (18 decimals)
DLCP_TOKEN_ADDRESS = "0x9b09b4B7a748079DAd5c280dCf66428e48E38Cd6"
# Server wallet receiving DLCP points payments
DLCP_RECEIVE_ADDRESS = os.getenv("DLCP_RECEIVE_ADDRESS", "0xeAc67D1B54730FF65D322aA21F2C3c8A8202Be0C")

TOKEN_DECIMALS = 18

w3_dbc = Web3(Web3.HTTPProvider(DBC_RPC))

ERC20_BALANCE_ABI = [
    {
        "constant": True,
        "inputs": [{"name": "_owner", "type": "address"}],
        "name": "balanceOf",
        "outputs": [{"name": "balance", "type": "uint256"}],
        "stateMutability": "view",
        "type": "function",
    }
]


@router.get("/balance")
async def points_balance(address: str = "", user=Depends(get_current_user)):
    if not address or not address.startswith("0x") or len(address) != 42:
        return {"ok": False, "message": "missing or invalid address"}
    try:
        checksum = w3_dbc.to_checksum_address(address)
    except Exception:
        return {"ok": False, "message": "invalid address"}
    try:
        contract = w3_dbc.eth.contract(
            address=w3_dbc.to_checksum_address(DLCP_TOKEN_ADDRESS),
            abi=ERC20_BALANCE_ABI,
        )
        wei = await asyncio.to_thread(contract.functions.balanceOf(checksum).call)
    except Exception as e:
        log.info("balance read failed for %s: %s", checksum, e)
        return {"ok": False, "message": "rpc error"}
    whole = wei / (10 ** TOKEN_DECIMALS)
    return {
        "ok": True,
        "address": checksum,
        "balance_dlp": f"{whole:.6f}",
        "balance_cr": int(whole),
    }


@router.post("/check")
async def pointcheck(request: Request, user=Depends(get_current_user)):
    body = await request.json()
    hash = body.get("hash", "")
    address = body.get("address", "")
    messageid = body.get("messageid", "")
    model = body.get("model", "")
    size = body.get("size", "")
    duration = int(float(body.get("duration", 0)))
    amount = body.get("amount", "0")
    pay_type = "points"  # Mark as points payment

    PayTableInstall.update_currpay_byaddress(address, False)
    payinfo = PayTableInstall.get_by_messageid(messageid)

    if not hash:
        # Phase 1: Create payment record
        if payinfo is None:
            PayTableInstall.insert_pay(
                address, model, size, duration, amount, messageid, "", False, True
            )
            return {"ok": False, "message": "create pay"}
        else:
            if payinfo.wallet_addr != address:
                PayTableInstall.update_pay_address(payinfo.id, address)
            if payinfo.status:
                return {"ok": True, "message": "pay success"}
            else:
                PayTableInstall.update_currpay_byid(payinfo.id, True)
                return {"ok": False, "message": "pay fail"}
    else:
        # Replay attack prevention: reject tx hash already used for a successful payment
        if PayTableInstall.is_hash_used(hash):
            return {"ok": False, "message": "check Failed"}

        # Phase 2: Verify DLCP transfer on DBC Chain
        try:
            tx_receipt = await asyncio.to_thread(
                w3_dbc.eth.wait_for_transaction_receipt, hash, timeout=30
            )
        except Exception as e:
            log.info(f"pointpay wait_for_transaction_receipt error: {e}")
            return {"ok": False, "message": "check Failed"}

        # Parse expected amount to wei (18 decimals)
        try:
            expected_amount_float = float(amount)
            expected_amount_wei = int(expected_amount_float * (10 ** TOKEN_DECIMALS))
        except (ValueError, TypeError):
            return {"ok": False, "message": "check Failed"}

        if tx_receipt.status == 1:
            # Loop var is `evt` not `log` because shadowing the module-level
            # `log` logger inside this function makes the earlier
            # `log.info(...)` calls (lines ~67, ~122) raise
            # UnboundLocalError as soon as Python sees this rebinding.
            for evt in tx_receipt["logs"]:
                event_signature_hash = w3_dbc.keccak(
                    text="Transfer(address,address,uint256)"
                ).hex()
                if evt["topics"][0].hex() == event_signature_hash:
                    from_address_hex = evt["topics"][1].hex()[24:]
                    to_address_hex = evt["topics"][2].hex()[24:]
                    from_address = w3_dbc.to_checksum_address("0x" + from_address_hex)
                    to_address = w3_dbc.to_checksum_address("0x" + to_address_hex)

                    # Verify: sender matches user, receiver matches our wallet
                    if (
                        address.lower() == from_address.lower()
                        and DLCP_RECEIVE_ADDRESS.lower() == to_address.lower()
                    ):
                        # Verify token contract address
                        evt_contract = evt["address"]
                        if evt_contract.lower() != DLCP_TOKEN_ADDRESS.lower():
                            continue

                        # Verify transferred amount from log data
                        try:
                            actual_amount_wei = int(evt["data"].hex(), 16)
                        except (ValueError, AttributeError):
                            try:
                                actual_amount_wei = int(evt["data"], 16)
                            except (ValueError, TypeError):
                                continue

                        if actual_amount_wei < expected_amount_wei:
                            continue

                        try:
                            if payinfo is None:
                                PayTableInstall.insert_pay(
                                    address, model, size, duration, amount,
                                    messageid, hash, True, True,
                                )
                            else:
                                PayTableInstall.update_hash_status(
                                    payinfo.id, hash, True, True
                                )
                            return {"ok": True, "message": "check success"}
                        except Exception as e:
                            log.info(f"pointpay error:{e}")
                            return {"ok": False, "message": "check Failed"}

        return {"ok": False, "message": "check Failed"}
