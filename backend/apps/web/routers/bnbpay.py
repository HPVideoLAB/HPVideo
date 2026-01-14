from fastapi import APIRouter, Request, Depends
from web3 import Web3
import os
import asyncio

from apps.web.models.pay import PayTableInstall
from utils.utils import get_current_user

router = APIRouter()

BNB_RPC = os.getenv("BNB_RPC")
USDT_TRAN_ADDRESS = "0x3011aef25585d026BfA3d3c3Fb4323f4b0eF3Eaa"

w3 = Web3(Web3.HTTPProvider(BNB_RPC))


@router.post("/check")
async def bnbcheck(request: Request, user=Depends(get_current_user)):
    body = await request.json()
    hash = body["hash"]
    address = body["address"]
    messageid = body["messageid"]
    model = body["model"]
    size = body["size"]
    duration = int(float(body["duration"]))
    amount = body["amount"]

    PayTableInstall.update_currpay_byaddress(address, False)
    payinfo = PayTableInstall.get_by_messageid(messageid)

    if hash is None or hash == "":
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
        tx_receipt = await asyncio.to_thread(w3.eth.wait_for_transaction_receipt, hash)
        if tx_receipt.status == 1:
            # 解析事件日志
            for log in tx_receipt["logs"]:
                event_signature_hash = w3.keccak(
                    text="Transfer(address,address,uint256)"
                ).hex()
                if log["topics"][0].hex() == event_signature_hash:
                    from_address_hex = log["topics"][1].hex()
                    to_address_hex = log["topics"][2].hex()
                    from_address_hex = from_address_hex[24:]
                    to_address_hex = to_address_hex[24:]
                    from_address = w3.to_checksum_address("0x" + from_address_hex)
                    to_address = w3.to_checksum_address("0x" + to_address_hex)
                    if (
                        address.lower() == from_address.lower()
                        and USDT_TRAN_ADDRESS.lower() == to_address.lower()
                    ):
                        try:
                            if payinfo is None:
                                PayTableInstall.insert_pay(
                                    address,
                                    model,
                                    size,
                                    duration,
                                    amount,
                                    messageid,
                                    hash,
                                    True,
                                    True,
                                )
                            else:
                                PayTableInstall.update_hash_status(
                                    payinfo.id, hash, True, True
                                )
                            return {"ok": True, "message": "check success"}
                        except Exception as e:
                            print("========================", e)
                            return {"ok": False, "message": "check Failed"}
        return {"ok": False, "message": "check Failed"}
