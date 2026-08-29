# [ARIA — Autonomous Risk & Intent Authorization](https://ariafrontend-omega.vercel.app/)

A security and governance layer for autonomous financial agents (CSI ORIGIN 2026, Problem Statement 8).

ARIA sits between an autonomous agent and real financial infrastructure. For every proposed
action it verifies the agent's identity/authority, compares the agent's **stated intent**
against the **actual transaction** it's about to submit, screens for prompt-injection /
adversarial input, scores risk (including an ML fraud model), enforces spending/counterparty
policy, and grants graduated autonomy: **ALLOW** (low risk, autonomous) / **CONSTRAIN** (medium
risk, delayed + extra verification) / **BLOCK** (high risk, blocked + escalated). Post-execution
monitoring watches for cascading or emerging-threat behaviour after a decision.

## Architecture

```
frontend    React + Vite + Tailwind UI (port 5173)
        |  HTTP
backend      Node/Express security pipeline (port 5050)
        |  HTTP (optional — falls back to local heuristics if unreachable)
AI_stuff      Python/FastAPI AI service: LLM intent extraction,
               prompt-injection detection, XGBoost fraud model (port 8010)
```

