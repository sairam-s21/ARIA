import os
import re
import joblib
import pandas as pd
from typing import Dict, Any, Optional
from pydantic import ValidationError
from schemas.request_schema import IntentRequest
from schemas.intent_schema import ExtractedIntent
from services.intent_extractor import IntentExtractor

READ_ONLY_ACTIONS = {"QUERY", "VIEW_BALANCE", "CHECK_STATUS", "SEARCH"}

INJECTION_PATTERNS = [
    r"system\s+instruction",
    r"system\s+override",
    r"ignore\s+(all\s+)?previous\s+instructions",
    r"exfiltrate",
    r"evil\.com",
    r"set\s+spending\s+limit\s+to\s+unlimited",
    r"unlimited\s+balance",
    r"admin\s+mode",
    r"developer\s+mode",
    r"sudo\s+",
    r"jailbreak",
    r"bypass\s+security",
    r"do\s+anything\s+now",
    r"dan\s+mode",
    r"prompt\s+injection",
    r"disregard\s+rules",
]


class IntentPipeline:
    def __init__(self, model_path: str = "models/paysim_fraud_model.pkl"):
        self.intent_extractor = IntentExtractor()
        self.fraud_model = None

        if os.path.exists(model_path):
            try:
                self.fraud_model = joblib.load(model_path)
                print(f"[Pipeline] Loaded XGBoost Fraud Classifier from '{model_path}'")
            except Exception as e:
                print(f"[Pipeline] Warning: Failed to load XGBoost model ({str(e)}). Falling back to rule engine.")
        else:
            print(f"[Pipeline] Notice: XGBoost model not found at '{model_path}'. Running rule-based fallback.")

    def _detect_prompt_injection(self, raw_prompt: str) -> tuple[bool, float, str]:
        text_lower = raw_prompt.lower()
        for pattern in INJECTION_PATTERNS:
            if re.search(pattern, text_lower):
                return True, 0.95, f"Prompt injection pattern detected matching rule: '{pattern}'"

        if re.search(r"\[\s*system\b[^\]]*\]", text_lower):
            return True, 0.90, "System instruction override inside brackets detected."

        return False, 0.0, ""

    def _predict_fraud_ml(self, amount: float, context: Dict[str, Any]) -> tuple[bool, float]:
        old_bal_org = float(context.get("oldbalanceOrg", 0.0))
        new_bal_orig = float(context.get("newbalanceOrig", max(0.0, old_bal_org - amount)))
        old_bal_dest = float(context.get("oldbalanceDest", 0.0))
        new_bal_dest = float(context.get("newbalanceDest", old_bal_dest + amount))

        balance_diff_org = old_bal_org - new_bal_orig
        balance_diff_dest = new_bal_dest - old_bal_dest
        is_exact_drain = 1 if (old_bal_org > 0 and old_bal_org == amount) else 0
        is_zero_dest_before = 1 if old_bal_dest == 0.0 else 0

        feature_dict = {
            "amount": [amount],
            "oldbalanceOrg": [old_bal_org],
            "newbalanceOrig": [new_bal_orig],
            "oldbalanceDest": [old_bal_dest],
            "newbalanceDest": [new_bal_dest],
            "balance_diff_org": [balance_diff_org],
            "balance_diff_dest": [balance_diff_dest],
            "is_exact_drain": [is_exact_drain],
            "is_zero_dest_before": [is_zero_dest_before],
        }

        X_df = pd.DataFrame(feature_dict)
        fraud_prob = float(self.fraud_model.predict_proba(X_df)[0][1])

        is_fraud = fraud_prob >= 0.35 or (is_exact_drain == 1 and is_zero_dest_before == 1)

        return is_fraud, fraud_prob

    def process(
        self,
        request: IntentRequest,
        context: Optional[Dict[str, Any]] = None,
        override_intent: Optional[Any] = None
    ) -> Dict[str, Any]:
        raw_prompt = request.raw_prompt

        # STEP 1: Security Injection Check
        is_injection, threat_conf, injection_reason = self._detect_prompt_injection(raw_prompt)
        if is_injection:
            return {
                "status": "BLOCKED",
                "risk_level": "HIGH",
                "threat_confidence": threat_conf,
                "reason": injection_reason,
                "extracted_intent": None,
            }

        # STEP 2: Intent Extraction & Safe Pydantic Parsing
        try:
            target_data = override_intent if override_intent is not None else self.intent_extractor.extract(raw_prompt)

            if isinstance(target_data, ExtractedIntent):
                extracted_intent = target_data
            elif isinstance(target_data, dict):
                extracted_intent = ExtractedIntent.model_validate(target_data)
            else:
                extracted_intent = ExtractedIntent.model_validate(target_data.__dict__)

        except ValidationError as ve:
            # Cleanly format error location without IndexError for root model validators
            error_details = []
            for e in ve.errors():
                loc_str = ":".join(str(l) for l in e["loc"]) if e["loc"] else "payload"
                error_details.append(f"{loc_str}: {e['msg']}")
            error_msg = "; ".join(error_details)

            return {
                "status": "BLOCKED",
                "risk_level": "HIGH",
                "threat_confidence": 0.85,
                "reason": f"Pydantic Validation Error: {error_msg}",
                "extracted_intent": None,
            }
        except Exception as e:
            return {
                "status": "BLOCKED",
                "risk_level": "HIGH",
                "threat_confidence": 0.0,
                "reason": f"Failed to parse user intent: {str(e)}",
                "extracted_intent": None,
            }

        intent_dict = extracted_intent.model_dump()

        # STEP 3: Prompt-to-Intent Entity Consistency Verification
        is_consistent, consistency_reason = extracted_intent.verify_against_prompt(raw_prompt)
        if not is_consistent:
            return {
                "status": "BLOCKED",
                "risk_level": "HIGH",
                "threat_confidence": 0.90,
                "reason": consistency_reason,
                "extracted_intent": intent_dict,
            }

        action = extracted_intent.action_type
        amount = extracted_intent.amount
        recipient = extracted_intent.recipient

        # STEP 4: Financial Transactions & ML Fraud Check
        if action in {"TRANSFER", "PAYMENT"}:
            if self.fraud_model and context:
                is_fraud, fraud_prob = self._predict_fraud_ml(amount, context)
                if is_fraud:
                    return {
                        "status": "BLOCKED",
                        "risk_level": "HIGH",
                        "threat_confidence": round(fraud_prob, 4),
                        "reason": f"XGBoost Fraud Classifier flagged transaction (Probability: {fraud_prob:.2%}).",
                        "extracted_intent": intent_dict,
                    }

            return {
                "status": "ALLOWED",
                "risk_level": "LOW",
                "threat_confidence": 0.05,
                "reason": "Transaction validated as consistent and legitimate.",
                "extracted_intent": intent_dict,
            }

        # STEP 5: Read-Only Actions
        if action in READ_ONLY_ACTIONS:
            return {
                "status": "ALLOWED",
                "risk_level": "LOW",
                "threat_confidence": 0.0,
                "reason": f"Read-only action '{action}' validated successfully.",
                "extracted_intent": intent_dict,
            }

        # STEP 6: Adaptable Handling for Ambiguous or Unknown Actions
        return {
            "status": "FLAGGED_FOR_REVIEW",
            "risk_level": "MEDIUM",
            "threat_confidence": 0.30,
            "reason": f"Unrecognized or ambiguous action type: '{action}'. Flagged for review.",
            "extracted_intent": intent_dict,
        }