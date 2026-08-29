from pydantic import BaseModel, Field
from typing import Optional, Dict, Any

class IntentRequest(BaseModel):
    user_id: str = Field(..., example="USR-88219")
    session_id: str = Field(..., example="SESS-102938")
    raw_prompt: str = Field(..., example="Transfer $500 to account ACC-123456 for monthly hosting invoice.")
    context_metadata: Optional[Dict[str, Any]] = Field(default_factory=dict)

class IntentResponse(BaseModel):
    status: str = Field(..., example="SUCCESS")  # SUCCESS, ESCALATED, or BLOCKED
    canonical_financial_intent: Optional[Dict[str, Any]] = Field(
        None, description="1) Canonical Financial Intent JSON extracted from user query."
    )
    expected_action: Optional[Dict[str, Any]] = Field(
        None, description="2) Expected Action payload generated for backend execution."
    )
    intent_risk_drift_score: Dict[str, Any] = Field(
        ..., description="3) Intent Risk Level and Drift Telemetry Metrics."
    )