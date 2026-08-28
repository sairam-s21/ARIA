# CSI_Hackkathon_Project
System Architecture
                 +-------------------------------------------------+
                 |               AUTONOMOUS AI AGENT               |
                 |       (Generates Financial Action Plan)         |
                 +------------------------+------------------------+
                                          |
                                          v  [Intended Execution Payload]
                 ===================================================
                 |     DYNAMIC FINANCIAL AGENT GOVERNANCE LAYER    |
                 ===================================================
                                          |
  [STEP 1: OBSERVE & UNDERSTAND INTENT]   v
+---------------------------------------------------------------------------------+
|  Input Interceptor & Prompt Inspection (NVIDIA NeMo Guardrails / Guardrails AI) |
|  * Checks for Indirect Prompt Injection, Malicious Tool Outputs & Goal Drift    |
|  * Converts Natural Language Action to Logic/SMT Formats (ePCA Parser)          |
+---------------------------------------------------------------------------------+
                                          |
                                          v
  [STEP 2: VERIFY IDENTITY & AUTHORITY]   |
+---------------------------------------------------------------------------------+
|  Agent Identity & Delegation Verification (OAuth 2.0 SPIFFE / SPIRE)            |
|  * Verifies Cryptographic Agent ID, Session Scope & Token Authority             |
+---------------------------------------------------------------------------------+
                                          |
                                          v
  [STEP 3 & 4: CONTEXT RISK EVALUATION & POLICY ENFORCEMENT]
+---------------------------------------------------------------------------------+
|  Zero-Trust Policy & Context Engine (Open Policy Agent - OPA)                   |
|  * Verifies Spending Caps, Wallet Allow-lists, Counterparty Reputation Score    |
|  * Assesses Context: Dynamic Market Conditions & Frequency Trajectory           |
+---------------------------------------------------------------------------------+
                                          |
                                          v
  [STEP 5: EVALUATE RISK & GRADUATE AUTONOMY]
+---------------------------------------------------------------------------------+
|  Risk-Aware Autonomy Decision Router                                            |
+---------------------+-------------------+---------------------------------------+
                      |                   |
        +-------------+                   +------------------+
        | Low Risk                        | Moderate Risk    | High Risk
        v                                 v                  v
+---------------+                +------------------+  +--------------------------+
|  AUTONOMOUS   |                |  CONSTRAINED /   |  |     HARD BLOCK &         |
|   EXECUTION   |                | STEP-UP MFA      |  |  HUMAN-IN-THE-LOOP (HITL)|
+-------+-------+                +--------+---------+  +------------+-------------+
        |                                 |                       |
        +----------------+----------------+                       |
                         |                                        v
                         v                             [Alert Security Ops]
    +-------------------------------------------+
    |   TRANSACTION EXECUTION INFRASTRUCTURE    |
    |  (Bank APIs / Smart Contract Wallets)     |
    +--------------------+----------------------+
                         |
                         v
  [STEP 6: MONITOR & ADAPT]
+------------------------------------------------------------------------------------+
|  Post-Execution Behavioral & Anomaly Telemetry (AgentOps / Datadog / OpenTelemetry)|
|  * Session Trajectory Analysis: Detects Multi-Step Exfiltration & Cascading Drift  |
|  * Adapt Phase: Feeds Behavioral Anomaly Signals back into OPA Policy Rules        |
+------------------------------------------------------------------------------------+
AIML Member File Organization:-
ai-service/
├── config.py                         # Environment vars, LLM model settings, thresholds
├── api/
│   └── intent_api.py                 # FastAPI/Flask endpoint handlers
├── services/
│   ├── pipeline.py                   # Orchestrates execution flow across services
│   ├── injection_detector.py         # Prompt injection shield
│   ├── intent_extractor.py           # Core extraction logic
│   ├── intent_validator.py           # Output validation logic
│   ├── drift_detector.py             # Latency, output quality, and format tracking
│   └── expected_action_generator.py  # Generates expected backend action payloads
├── schemas/
│   ├── request_schema.py             # Incoming payload validation schemas
│   └── intent_schema.py              # Pydantic models for structured outputs
├── prompts/
│   ├── injection_prompt.txt          # Detection system prompts
│   ├── intent_prompt.txt             # Intent extraction prompts
│   └── expected_action_prompt.txt    # Action generation prompts
└── tests/
    ├── test_runner.py                # Automated evaluation suite executor
    ├── safe_cases.json               # Benchmark safe test cases
    └── attack_cases.json             # Security test cases (prompt injection/jailbreaks)
