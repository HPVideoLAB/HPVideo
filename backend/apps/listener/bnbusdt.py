from web3 import Web3
import os
import asyncio

from apps.web.models.pay import PayTableInstall

BNB_RPC = os.getenv("BNB_RPC")
USDT_CONTRACT_ADDRESS = os.getenv("USDT_CONTRACT_ADDRESS")
USDT_TRAN_ADDRESS = "0x3011aef25585d026BfA3d3c3Fb4323f4b0eF3Eaa"


import logging

logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)

# BNB USDT ABI
USDT_ABI = [
    {
        "anonymous": False,
        "inputs": [
            {"indexed": True, "name": "from", "type": "address"},
            {"indexed": True, "name": "to", "type": "address"},
            {"indexed": False, "name": "value", "type": "uint256"},
        ],
        "name": "Transfer",
        "type": "event",
    }
]

w3 = Web3(Web3.HTTPProvider(BNB_RPC))
contract = w3.eth.contract(address=USDT_CONTRACT_ADDRESS, abi=USDT_ABI)


class BNBUSDTPayListener:

    async def start_listening(self):
        # create tran event
        event_filter = contract.events.Transfer.create_filter(from_block="latest")

        while True:
            try:
                # check new event
                for event in event_filter.get_new_entries():
                    await self.handle_transfer_event(event)

                # check every 2s
                await asyncio.sleep(2)

            except Exception as e:
                asyncio.sleep(5)
                event_filter = self.contract.events.Transfer.create_filter(
                    from_block="latest"
                )

    async def handle_transfer_event(self, event):
        try:
            from_address = event["args"]["from"]
            to_address = event["args"]["to"]
            value = event["args"]["value"]

            # check tran info
            if to_address.lower() == USDT_TRAN_ADDRESS:
                amount = w3.from_wei(value, "ether")
                tx_hash = event["transactionHash"].hex()

                payinfo = PayTableInstall.get_currpay_byaddress(from_address)
                print("===================Pay Info==============", payinfo)
                if payinfo is not None:
                    PayTableInstall.update_hash_status(payinfo.id, tx_hash, True, True)

                print("===================Pay Info==============")
                print(f"Pay Amount: {amount} USDT")
                print(f"From Address: {from_address}")
                print(f"Tran Hash: {tx_hash}")

        except Exception as e:
            print(f"Listener Error: {e}")


BNBUSDTPayListenerInstance = BNBUSDTPayListener()
