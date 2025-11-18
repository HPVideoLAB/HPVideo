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
        messageid: str
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
                "status": False,
                "created_at": int(time.time()),
                "updated_at": int(time.time())
            }
        )
        Pay.create(**pay.model_dump())

	# update pay status
    def update_status(self, id: str, status: bool):
        try:
            query = Pay.update(status=status).where(Pay.id == id)
            res = query.execute()
            return res > 0
        except Exception as e:
            log.error(f"update_vip_end_date: {e}")
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

PayTableInstall = PayTable(DB)
