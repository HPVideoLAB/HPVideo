from pydantic import BaseModel
from typing import Optional

class AiModelReq(BaseModel):
    project: str
    source: str
    permodel: str
    model: str
    duration: Optional[int] = 0
    size: Optional[str] = None
    messageid: str
    messages: object
    image: Optional[str] = None

class AiResultReq(BaseModel):
    requestId: str
