from pydantic import BaseModel
from datetime import datetime
from typing import Optional


class AiAnalysisRead(BaseModel):
    id: int
    ticket_id: int
    predicted_category: Optional[str] = None
    confidence: Optional[float] = None
    suggested_reply: Optional[str] = None
    provider: str
    model_version: Optional[str] = None
    created_at: Optional[datetime] = None

    class Config:
        from_attributes = True


class AnalyzeResponse(BaseModel):
    predicted_category: str
    confidence: float
    provider: str
    model_version: str
    analysis_id: int


class SuggestReplyResponse(BaseModel):
    suggested_reply: str
    provider: str
    model_version: str
    analysis_id: int
