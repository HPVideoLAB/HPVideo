from fastapi import APIRouter, Request, Depends
from web3 import Web3
import os
import asyncio

from apps.web.models.pay import PayTableInstall
from utils.utils import get_current_user

router = APIRouter()

BNB_RPC = os.getenv("BNB_RPC")
USDT_TRAN_ADDRESS = "0x3011aef25585d026BfA3d3c3Fb4323f4b0eF3Eaa"

# DBC Chain config for DLCP points payment
DBC_RPC = "https://rpc1.dbcwallet.io"
DLCP_RECEIVE_ADDRESS = os.getenv("DLCP_RECEIVE_ADDRESS", "0xeAc67D1B54730FF65D322aA21F2C3c8A8202Be0C")

w3 = Web3(Web3.HTTPProvider(BNB_RPC))
w3_dbc = Web3(Web3.HTTPProvider(DBC_RPC))


def verify_transfer_log(w3_instance, tx_receipt, sender_address, receive_address):
    """Verify ERC20 Transfer event in transaction receipt"""
    if tx_receipt.status != 1:
        return False
    for log in tx_receipt["logs"]:
        event_signature_hash = w3_instance.keccak(
            text="Transfer(address,address,uint256)"
        ).hex()
        if log["topics"][0].hex() == event_signature_hash:
            from_address_hex = log["topics"][1].hex()[24:]
            to_address_hex = log["topics"][2].hex()[24:]
            from_address = w3_instance.to_checksum_address("0x" + from_address_hex)
            to_address = w3_instance.to_checksum_address("0x" + to_address_hex)
            if (
                sender_address.lower() == from_address.lower()
                and receive_address.lower() == to_address.lower()
            ):
                return True
    return False


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
    pay_type = body.get("pay_type", "token")  # "token" (USDT/BSC) or "points" (DLCP/DBC)

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
        # Choose chain based on pay_type
        if pay_type == "points":
            w3_chain = w3_dbc
            receive_addr = DLCP_RECEIVE_ADDRESS
        else:
            w3_chain = w3
            receive_addr = USDT_TRAN_ADDRESS

        try:
            tx_receipt = await asyncio.to_thread(
                w3_chain.eth.wait_for_transaction_receipt, hash, timeout=30
            )
        except Exception as e:
            print(f"wait_for_transaction_receipt error: {e}")
            return {"ok": False, "message": "check Failed"}

        if verify_transfer_log(w3_chain, tx_receipt, address, receive_addr):
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
                print("========================", e)
                return {"ok": False, "message": "check Failed"}

        return {"ok": False, "message": "check Failed"}
