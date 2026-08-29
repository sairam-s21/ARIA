import json
import os
import random

from fastapi import FastAPI, HTTPException
from openai import OpenAI
from pydantic import BaseModel
from config import settings
from schemas.request_schema import IntentRequest
from services.pipeline import IntentPipeline

app = FastAPI(
    title="Financial AI Agent Service",
    description="Production-grade zero-cost AI financial intent processing microservice",
    version="1.0.0"
)

pipeline = IntentPipeline()

_PROMPTS_DIR = os.path.join(os.path.dirname(os.path.abspath(__file__)), "..", "prompts")
with open(os.path.join(_PROMPTS_DIR, "scenario_generator_prompt.txt"), "r") as f:
    _SCENARIO_PROMPT_TEMPLATE = f.read()

_llm_client = OpenAI(api_key=settings.NVIDIA_API_KEY, base_url=settings.NVIDIA_BASE_URL)

# Note: pipeline.process() returns {status, risk_level, threat_confidence,
# reason, extracted_intent} — this never matched the IntentResponse schema
# (canonical_financial_intent/expected_action/intent_risk_drift_score), so a
# response_model=IntentResponse here made every call fail response
# validation with a 500. Returning the pipeline's actual shape directly.
@app.post("/v1/extract-intent")
def extract_intent(request: IntentRequest):
    try:
        response = pipeline.process(request)
        return response
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))


class SimpleIntentRequest(BaseModel):
    text: str


class SimpleIntentResponse(BaseModel):
    type: str
    expectedAction: str
    description: str


@app.post("/extract-intent", response_model=SimpleIntentResponse)
def extract_intent_simple(request: SimpleIntentRequest):
    """
    Minimal {text} -> {type, expectedAction, description} contract consumed by
    the Node backend's intentService (ARIA_stuff/backend integration). Wraps
    the full IntentPipeline so the ARIA_stuff security checks (injection
    detection, fraud scoring) still run under the hood.
    """
    try:
        internal_request = IntentRequest(
            user_id="ARIA-BACKEND",
            session_id="ARIA-BACKEND-SESSION",
            raw_prompt=request.text,
        )
        result = pipeline.process(internal_request)

        extracted = result.get("extracted_intent") or {}
        action_type = extracted.get("action_type", "UNKNOWN")

        return SimpleIntentResponse(
            type=action_type,
            expectedAction=action_type,
            description=result.get("reason", ""),
        )
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))


class ScenarioRequest(BaseModel):
    scenario_type: str = "safe"


class ScenarioResponse(BaseModel):
    userIntent: str
    transaction: dict


_FALLBACK_SAFE_SCENARIOS = [
    ("Rebalance my portfolio using {n} USDC", lambda n: {"type": "swap", "from": "USDC", "to": "ETH", "amount": n}),
    ("Swap {n} USDC for ETH to rebalance holdings", lambda n: {"type": "swap", "from": "USDC", "to": "ETH", "amount": n}),
    ("Approve Uniswap to spend {n} USDC for an upcoming trade", lambda n: {"type": "approve", "token": "USDC", "spender": "Uniswap", "amount": n}),
    ("Stake {n} ETH into Aave for yield", lambda n: {"type": "stake", "token": "ETH", "protocol": "Aave", "amount": n}),
]

# Each pair is deliberately mismatched: userIntent sounds authorized/benign,
# transaction is what an agent hijacked by prompt injection would actually
# submit. The gap between the two IS the attack.
_FALLBACK_INJECTION_SCENARIOS = [
    ("Rebalance my portfolio using {n} USDC", lambda n: {"type": "approve", "token": "USDC", "spender": "0xUnknownContract", "amount": "unlimited"}),
    ("Swap {n} USDC for ETH as part of routine rebalancing", lambda n: {"type": "transfer", "token": "USDC", "to": "ANONYMOUS_ACC", "amount": n * 100}),
    ("Approve Uniswap for a small routine trade", lambda n: {"type": "approve", "token": "USDC", "spender": "0xUnknownContract", "amount": "unlimited"}),
    ("Stake my ETH into Aave for yield", lambda n: {"type": "approve", "token": "ETH", "spender": "0xDrainContract", "amount": "unlimited"}),
]


def _fallback_scenario(scenario_type: str) -> dict:
    pool = _FALLBACK_INJECTION_SCENARIOS if scenario_type == "injection" else _FALLBACK_SAFE_SCENARIOS
    template, build_tx = random.choice(pool)
    amount = random.choice([250, 500, 750, 1200, 2500, 15000])
    return {"userIntent": template.format(n=amount), "transaction": build_tx(amount)}


@app.post("/generate-scenario", response_model=ScenarioResponse)
def generate_scenario(request: ScenarioRequest):
    """
    Generates one varied (userIntent, transaction) pair per call for the
    frontend's 'generate a new example' buttons. For "injection" scenarios
    the pair is deliberately mismatched — the whole point is demonstrating
    intent-vs-transaction divergence, not just a scary-sounding sentence.
    Uses the LLM for creative variety with a random-template fallback if the
    call fails — this endpoint is not on the security-critical analyze path,
    so latency here is acceptable in a way it isn't for /extract-intent.
    """
    scenario_type = "injection" if request.scenario_type == "injection" else "safe"
    try:
        prompt = _SCENARIO_PROMPT_TEMPLATE.format(scenario_type=scenario_type)
        response = _llm_client.chat.completions.create(
            model=settings.LLM_MODEL,
            messages=[{"role": "user", "content": prompt}],
            response_format={"type": "json_object"},
            temperature=0.9,
        )
        data = json.loads(response.choices[0].message.content)
        user_intent = data.get("userIntent")
        transaction = data.get("transaction")
        if not user_intent or not isinstance(user_intent, str):
            raise ValueError("LLM returned no usable userIntent")
        if not transaction or not isinstance(transaction, dict) or "type" not in transaction:
            raise ValueError("LLM returned no usable transaction")
        return ScenarioResponse(userIntent=user_intent, transaction=transaction)
    except Exception as e:
        print(f"[generate-scenario] LLM generation failed, using fallback: {e}")
        return ScenarioResponse(**_fallback_scenario(scenario_type))


class FraudScoreRequest(BaseModel):
    amount: float
    oldBalanceOrg: float = 0.0
    newBalanceOrig: float = 0.0
    oldBalanceDest: float = 0.0
    newBalanceDest: float = 0.0


class FraudScoreResponse(BaseModel):
    isFraud: bool
    fraudProbability: float
    modelAvailable: bool


@app.post("/fraud-score", response_model=FraudScoreResponse)
def fraud_score(request: FraudScoreRequest):
    """
    Actually invokes the trained XGBoost PaySim fraud classifier — the one
    thing that was loaded at startup but never called anywhere else in this
    service, since pipeline.process() only reaches it when a full balance
    context is supplied (which /extract-intent never provided). The Node
    backend calls this for TRANSFER transactions, deriving the balance
    context from its own simulated portfolio state, so the trained model
    actually contributes to a risk decision instead of sitting unused.
    """
    if not pipeline.fraud_model:
        return FraudScoreResponse(isFraud=False, fraudProbability=0.0, modelAvailable=False)

    try:
        is_fraud, fraud_prob = pipeline._predict_fraud_ml(request.amount, {
            "oldbalanceOrg": request.oldBalanceOrg,
            "newbalanceOrig": request.newBalanceOrig,
            "oldbalanceDest": request.oldBalanceDest,
            "newbalanceDest": request.newBalanceDest,
        })
        return FraudScoreResponse(isFraud=is_fraud, fraudProbability=round(fraud_prob, 4), modelAvailable=True)
    except Exception as e:
        print(f"[fraud-score] prediction failed: {e}")
        return FraudScoreResponse(isFraud=False, fraudProbability=0.0, modelAvailable=False)


if __name__ == "__main__":
    import uvicorn
    uvicorn.run(app, host="0.0.0.0", port=8000)