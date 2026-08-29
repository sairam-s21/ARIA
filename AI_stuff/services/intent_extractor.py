import json
import re
from openai import OpenAI
from config import settings
from schemas.intent_schema import ExtractedIntent


class IntentExtractor:
    def __init__(self):
        self.client = OpenAI(
            base_url=settings.NVIDIA_BASE_URL,
            api_key=settings.NVIDIA_API_KEY
        )

    def extract(self, raw_prompt: str) -> ExtractedIntent:
        system_prompt = (
            "You are an intent extraction engine. Extract structured details from the user prompt.\n"
            "Return ONLY a valid, strict JSON object with NO markdown formatting, NO single quotes, and NO trailing commas.\n\n"
            "Required Schema:\n"
            "{\n"
            '  "action_type": "TRANSFER" | "PAYMENT" | "QUERY" | "VIEW_BALANCE" | "CHECK_STATUS" | "UNKNOWN",\n'
            '  "recipient": string or null,\n'
            '  "amount": float or null,\n'
            '  "currency": "USD",\n'
            '  "is_ambiguous": boolean\n'
            "}"
        )

        response = self.client.chat.completions.create(
            model=settings.LLM_MODEL,
            messages=[
                {"role": "system", "content": system_prompt},
                {"role": "user", "content": raw_prompt}
            ],
            temperature=0.0
        )

        content = response.choices[0].message.content.strip()

        # Extract JSON substring if surrounded by markdown or explanatory text
        match = re.search(r"\{.*\}", content, re.DOTALL)
        if match:
            content = match.group(0)

        # Sanitize common JSON errors produced by LLMs (e.g., trailing commas)
        content = re.sub(r",\s*([\]}])", r"\1", content)

        try:
            data = json.loads(content)
        except json.JSONDecodeError:
            # Fallback if the LLM output is malformed JSON
            data = {
                "action_type": "UNKNOWN",
                "recipient": None,
                "amount": None,
                "currency": "USD",
                "is_ambiguous": True
            }

        # Ensure action_type is never empty or null
        if not data.get("action_type"):
            data["action_type"] = "UNKNOWN"

        return ExtractedIntent.model_validate(data)