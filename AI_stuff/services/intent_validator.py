from schemas.intent_schema import ExtractedIntent
from config import settings

class IntentValidator:
    def validate_and_classify_risk(self, intent: ExtractedIntent) -> dict:
        if intent.is_ambiguous:
            return {
                "is_valid": False,
                "risk_level": "HIGH",
                "reason": "Request is ambiguous or lacks necessary context."
            }

        if intent.action_type in ["TRANSFER", "PAYMENT"]:
            if intent.amount is None or intent.amount <= 0:
                return {
                    "is_valid": False,
                    "risk_level": "HIGH",
                    "reason": "Missing or invalid monetary transaction amount."
                }
            
            if not intent.recipient_account:
                return {
                    "is_valid": False,
                    "risk_level": "HIGH",
                    "reason": "Missing target recipient account."
                }

            if intent.amount < settings.AUTONOMOUS_MAX_LIMIT:
                risk_level = "LOW"
            elif intent.amount <= settings.MODERATE_RISK_LIMIT:
                risk_level = "MODERATE"
            else:
                risk_level = "HIGH"

            return {
                "is_valid": True,
                "risk_level": risk_level,
                "reason": f"Transaction validated under {risk_level} risk tier policy."
            }

        if intent.action_type in ["BALANCE_CHECK", "ACCOUNT_INFO"]:
            return {
                "is_valid": True,
                "risk_level": "LOW",
                "reason": "Read-only query validated."
            }

        return {
            "is_valid": False,
            "risk_level": "HIGH",
            "reason": f"Unrecognized action type: {intent.action_type}"
        }