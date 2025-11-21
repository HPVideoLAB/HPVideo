from fastapi import APIRouter, Request, Depends
from web3 import Web3
import os
import asyncio

from apps.web.models.pay import PayTableInstall
from utils.utils import get_current_user

router = APIRouter()

BNB_RPC = os.getenv("BNB_RPC")
USDT_TRAN_ADDRESS = os.getenv("USDT_TRAN_ADDRESS")

w3 = Web3(Web3.HTTPProvider(BNB_RPC))

@router.post("/check")
async def bnbcheck(request: Request, user=Depends(get_current_user)):
  body = await request.json()
  hash = body["hash"]
  address = body["address"]
  messageid = body["messageid"]

  tx_receipt = await asyncio.to_thread(w3.eth.wait_for_transaction_receipt, hash)
  if tx_receipt.status == 1:
    # 解析事件日志
    for log in tx_receipt['logs']:
      event_signature_hash = w3.keccak(text='Transfer(address,address,uint256)').hex()
      if log['topics'][0].hex() == event_signature_hash:
        from_address_hex = log['topics'][1].hex()
        to_address_hex = log['topics'][2].hex()
        from_address_hex = from_address_hex[24:]
        to_address_hex = to_address_hex[24:]
        from_address = w3.to_checksum_address('0x' + from_address_hex)
        to_address = w3.to_checksum_address('0x' + to_address_hex)
        if address.lower() == from_address.lower() and USDT_TRAN_ADDRESS.lower() == to_address.lower():
          pay = PayTableInstall.get_by_messageid(messageid)
          if pay is not None:
            PayTableInstall.update_addr_status(pay.id, address, True)
  return True