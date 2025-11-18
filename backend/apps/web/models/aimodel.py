from pydantic import BaseModel
from typing import Optional

class AiModelReq(BaseModel):
    project: str
    source: str
    permodel: str
    model: str
    duration: int
    messageid: str
    messages: object
    image: Optional[str] = None
    size: str

class AiResultReq(BaseModel):
    requestId: str
