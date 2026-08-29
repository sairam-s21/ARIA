import time

class DriftDetector:
    def log_execution_metrics(self, session_id: str, latency_ms: float, risk_level: str, is_blocked: bool) -> dict:
        return {
            "session_id": session_id,
            "latency_ms": round(latency_ms, 2),
            "risk_level": risk_level,
            "is_blocked": is_blocked,
            "timestamp": time.time()
        }