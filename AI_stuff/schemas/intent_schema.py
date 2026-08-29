from typing import Optional
from pydantic import BaseModel, Field, field_validator, model_validator


class ExtractedIntent(BaseModel):
    action_type: str = Field(..., description="Action type like TRANSFER, PAYMENT, QUERY, etc.")
    amount: Optional[float] = Field(default=None, ge=0, description="Transaction amount (must be non-negative)")
    recipient: Optional[str] = Field(default=None, description="Target recipient account or name")

    @field_validator("action_type", mode="before")
    @classmethod
    def normalize_action_type(cls, v: str) -> str:
        if isinstance(v, str) and v.strip():
            return v.strip().upper()
        return "UNKNOWN"

    @field_validator("recipient", mode="before")
    @classmethod
    def sanitize_recipient(cls, v: Optional[str]) -> Optional[str]:
        if isinstance(v, str):
            cleaned = v.strip()
            return cleaned if cleaned else None
        return None

    @model_validator(mode="after")
    def validate_action_payload_consistency(self) -> "ExtractedIntent":
        """
        Enforces cross-field transactional consistency at the schema level.
        """
        if self.action_type in {"TRANSFER", "PAYMENT"}:
            if self.amount is None or self.amount <= 0:
                raise ValueError(f"Action '{self.action_type}' requires a positive monetary amount.")
            if not self.recipient:
                raise ValueError(f"Action '{self.action_type}' requires a valid target recipient.")
        return self

    def verify_against_prompt(self, raw_prompt: str) -> tuple[bool, str]:
        """
        Validates semantic consistency between the extracted Pydantic payload and the raw prompt text.
        """
        prompt_lower = raw_prompt.lower()
        action = self.action_type.upper()

        read_keywords = ["show", "check", "view", "what is", "get", "display", "balance", "history", "summarize"]
        transfer_keywords = ["send", "pay", "transfer", "wire", "remit", "give"]

        # 1. Action-Intent Alignment Check
        if action in {"QUERY", "VIEW_BALANCE", "CHECK_STATUS", "SEARCH"}:
            if any(w in prompt_lower for w in transfer_keywords) and not any(w in prompt_lower for w in read_keywords):
                return False, f"Consistency Violation: Raw prompt indicates transfer action, but extracted action was '{action}'."

        if action in {"TRANSFER", "PAYMENT"}:
            # 2. Recipient Consistency Check
            if self.recipient:
                rec_clean = self.recipient.lower().strip()
                if rec_clean not in prompt_lower:
                    return False, f"Consistency Violation: Extracted recipient '{self.recipient}' not present in prompt."

            # 3. Monetary Amount Consistency Check
            if self.amount is not None:
                amt = self.amount
                amt_int_str = f"{int(amt)}"
                amt_float_str = f"{amt:.2f}"

                if amt_int_str not in prompt_lower and amt_float_str not in prompt_lower:
                    return False, f"Consistency Violation: Extracted amount (${amt}) does not match numerical values in prompt."

        return True, "Intent consistent with raw prompt."