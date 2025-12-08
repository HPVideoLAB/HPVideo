from peewee import Model, CharField, IntegerField, BigIntegerField
from apps.web.internal.db import DB
from pydantic import BaseModel
from playhouse.shortcuts import model_to_dict
from typing import Optional
import uuid
import time

import logging
from config import ( SRC_LOG_LEVELS )
log = logging.getLogger(__name__)
log.setLevel(SRC_LOG_LEVELS["VIP"])


class Pay(Model):
    id = CharField(unique=True)
    wallet_addr = CharField()
    model = CharField()
    size = CharField()
    duration = IntegerField()
    amount = CharField()
    messageid = CharField()
    status = CharField(null=False)
    currpay = CharField(null=False)
    hash = CharField()
    created_at = BigIntegerField()
    updated_at = BigIntegerField()
    
    class Meta:
        database = DB
        models = "pay"

# 定义Pydantic模型PayModel
class PayModel(BaseModel):
    id: str
    wallet_addr: str
    model: str
    size: str
    duration: int
    amount: str
    messageid: str
    status: Optional[bool] = False
    currpay: Optional[bool] = False
    hash: str
    updated_at: int
    created_at: int


# 定义PayTable类
class PayTable:
    def __init__(self, db):
        self.db = db
        self.db.create_tables([Pay])
        
	# insert pay info
    def insert_pay(
        self,
        wallet_addr: str,
        model: str,
        size: str,
        duration: int ,
        amount: str,
        messageid: str,
        hash: str,
        status: bool,
        currpay: bool
    ) -> Optional[PayModel]:
        pay = PayModel(
            **{
                "id": str(uuid.uuid4()),
                "wallet_addr": wallet_addr,
                "model": model,
                "size": size,
                "duration": duration,
                "amount": amount,
                "messageid": messageid,
                "hash": hash,
                "status": status,
                "currpay": currpay,
                "created_at": int(time.time()),
                "updated_at": int(time.time())
            }
        )
        Pay.create(**pay.model_dump())

    # update pay address
    def update_pay_address(self, id: str, address: str):
        try:
            query = Pay.update(address=address).where(Pay.id == id)
            res = query.execute()
            return res > 0
        except Exception as e:
            log.error(f"update_pay_address: {e}")
            return False
        
	# update pay status
    def update_status(self, id: str, status: bool, currpay: bool):
        try:
            query = Pay.update(status=status, currpay=currpay).where(Pay.id == id)
            res = query.execute()
            return res > 0
        except Exception as e:
            log.error(f"update_status: {e}")
            return False
    
    def update_addr_status(self, id: str, address: str, status: bool, currpay: bool):
        try:
            query = Pay.update(status=status, wallet_addr=address, currpay=currpay).where(Pay.id == id)
            res = query.execute()
            return res > 0
        except Exception as e:
            log.error(f"update_addr_status: {e}")
            return False
        
    def update_hash_status(self, id: str, hash: str, status: bool, currpay: bool):
        try:
            query = Pay.update(status=status, currpay=currpay, hash=hash).where(Pay.id == id)
            res = query.execute()
            return res > 0
        except Exception as e:
            log.error(f"update_hash_status: {e}")
            return False
        
    # update currpay status by address
    def update_currpay_byaddress(self, address: str, currpay: bool):
        try:
            query = Pay.update(currpay=currpay).where((Pay.status == False) & (Pay.wallet_addr == address))
            res = query.execute()
            return res > 0
        except Exception as e:
            log.error(f"update_currpay_byaddress: {e}")
            return False
        
    # update currpay status by id
    def update_currpay_byid(self, id: str, currpay: bool):
        try:
            query = Pay.update(currpay=currpay).where(Pay.id == id)
            res = query.execute()
            return res > 0
        except Exception as e:
            log.error(f"update_currpay_byid: {e}")
            return False
        
	# get payinfo by id
    def get_by_id(self, id: str) -> Optional[PayModel]:
        try:
            pay = Pay.get(Pay.id == id)
            pay_dict = model_to_dict(pay)
            pay_model = PayModel(**pay_dict)
            return pay_model
        except:
            return None
        
	# get payinfo by id
    def get_by_messageid(self, messageid: str) -> Optional[PayModel]:
        try:
            pay = Pay.get(Pay.messageid == messageid)
            pay_dict = model_to_dict(pay)
            pay_model = PayModel(**pay_dict)
            return pay_model
        except:
            return None

    # get currpay by address
    def get_currpay_byaddress(self, address: str):
        try:
            pay = Pay.get(Pay.wallet_addr == address, Pay.status == False, Pay.currpay == True)
            pay_dict = model_to_dict(pay)
            pay_model = PayModel(**pay_dict)
            return pay_model
        except:
            return None
PayTableInstall = PayTable(DB)
