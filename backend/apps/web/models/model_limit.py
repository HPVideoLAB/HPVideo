from peewee import Model, CharField, IntegerField, BigIntegerField
from apps.web.internal.db import DB
from pydantic import BaseModel
from typing import Optional, List
from playhouse.shortcuts import model_to_dict

# Define the ModelLimit model
class ModelLimit(Model):
    id = IntegerField(primary_key=True, unique=True)  # Primary
    user_tier = CharField()  # User Type
    model_type = CharField() # Model Type
    vip = CharField() # VIP Type
    limits = IntegerField()  # Daily Count Limit
    per = IntegerField() # Quantity Consumed Per Time
    created_at = BigIntegerField()  # Create Time

    class Meta:
        database = DB  # Specify the Database
        table_name = 'model_limit'  # Specify the Table Name

# Define the Pydantic model ModelLimitModel
class ModelLimitModel(BaseModel):
    id: int  # Primary
    user_tier: str  # User Type
    model_type: str # Model Type
    vip: str # VIP Type 
    limits: int  # Daily Count Limit
    per: int # Quantity Consumed Per Time
    created_at: int  # Create Time

# Define the ModelLimitTable class
class ModelLimitTable:
    def __init__(self, db):
        self.db = db  # Initialize the database instance
        self.db.create_tables([ModelLimit])  # Create the ModelLimit table

    def get_info_by_user_vip(self, user_tier: str, vip: str, type: str) -> Optional[ModelLimitModel]:
        try:
            modellimit = ModelLimit.select().where(ModelLimit.user_tier == user_tier, ModelLimit.vip == vip, ModelLimit.model_type == type).first()
            return modellimit
        except Exception as e:
            return None
        
    def get_all(self) -> Optional[List[ModelLimitModel]]:
        try:
            modellimits = ModelLimit.select()
            modellimit_list = [ModelLimitModel(**model_to_dict(modellimit)) for modellimit in modellimits] 
            return modellimit_list
        except Exception as e:
            print("============get_modellimit_all============", e)
            return None


# Instantiate the ModelLimitTable class
ModelLimitInstance = ModelLimitTable(DB)

