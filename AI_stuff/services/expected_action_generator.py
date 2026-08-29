import json
from openai import OpenAI
from config import settings
from schemas.intent_schema import ExtractedIntent

class ExpectedActionGenerator:
    def __init__(self):
        self.client = OpenAI(
            api_key=settings.NVIDIA_API_KEY,
            base_url=settings.NVIDIA_BASE_URL
        )
        with open("prompts/expected_action_prompt.txt", "r") as f:
            self.prompt_template = f.read()

    def generate(self, intent: ExtractedIntent, risk_level: str) -> dict:
        prompt = self.prompt_template.format(intent_data=intent.model_dump_json())
        try:
            response = self.client.chat.completions.create(
                model=settings.LLM_MODEL,
                messages=[{"role": "user", "content": prompt}],
                response_format={"type": "json_object"},
                temperature=0.1
            )
            base_payload = json.loads(response.choices[0].message.content)
        except Exception:
            base_payload = {
                "target_service": "financial_core_api",
                "endpoint": f"/v1/{intent.action_type.lower()}",
                "parameters": intent.model_dump()
            }

        base_payload["execution_routing"] = {
            "risk_level": risk_level,
            "require_human_approval": risk_level in ["MODERATE", "HIGH"],
            "auto_execute": risk_level == "LOW"
        }
        return base_payload