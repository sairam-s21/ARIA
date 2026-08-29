import os
from pydantic import field_validator
from pydantic_settings import BaseSettings

# Secrets live in the project root .env (shared with backend/), not inside
# AI_stuff/, so resolve an absolute path independent of the process cwd.
_ROOT_ENV_PATH = os.path.join(os.path.dirname(os.path.abspath(__file__)), "..", ".env")

class Settings(BaseSettings):
    APP_NAME: str = "Financial Agent AI Service"
    ENVIRONMENT: str = "development"

    NVIDIA_API_KEY: str = os.getenv("NVIDIA_API_KEY", "").strip()
    NVIDIA_BASE_URL: str = "https://integrate.api.nvidia.com/v1"

    # The root .env wraps NVIDIA_API_KEY in quotes with a stray leading
    # space (" nvapi-..."), which dotenv preserves literally since it's
    # inside the quotes. Strip whatever source populated the field
    # (env_file or a real environment variable) so a malformed key never
    # silently reaches the NVIDIA API as an invalid Bearer token.
    @field_validator("NVIDIA_API_KEY", mode="before")
    @classmethod
    def _strip_api_key(cls, v):
        return v.strip() if isinstance(v, str) else v
    
    # Active 70B Model from your list
    # In config.py
    LLM_MODEL: str = "meta/llama-3.2-11b-vision-instruct"
    
    AUTONOMOUS_MAX_LIMIT: float = 1000.0
    MODERATE_RISK_LIMIT: float = 10000.0
    INJECTION_CONFIDENCE_THRESHOLD: float = 0.80

    class Config:
        env_file = _ROOT_ENV_PATH
        extra = "ignore"

settings = Settings()