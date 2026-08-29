import json
from openai import OpenAI
from config import settings

class InjectionDetector:
    def __init__(self):
        self.client = OpenAI(
            api_key=settings.NVIDIA_API_KEY,
            base_url=settings.NVIDIA_BASE_URL
        )
        with open("prompts/injection_prompt.txt", "r") as f:
            self.prompt_template = f.read()

    def analyze(self, user_prompt: str) -> dict:
        prompt = self.prompt_template.format(user_prompt=user_prompt)
        try:
            response = self.client.chat.completions.create(
                model=settings.LLM_MODEL,
                messages=[{"role": "user", "content": prompt}],
                response_format={"type": "json_object"},
                temperature=0.0
            )
            result = json.loads(response.choices[0].message.content)
            
            is_threat = (
                result.get("is_injection", False) and 
                result.get("confidence_score", 0.0) >= settings.INJECTION_CONFIDENCE_THRESHOLD
            )
            return {
                "is_threat": is_threat,
                "confidence": float(result.get("confidence_score", 0.0)),
                "reason": result.get("reason", "No threat detected")
            }
        except Exception as e:
            return {"is_threat": False, "confidence": 0.0, "reason": f"Bypassed: {str(e)}"}