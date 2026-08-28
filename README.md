# ARIA — Autonomous Risk & Intent Authorization

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
frontend/frontend   React + Vite + Tailwind UI (port 5173)
        |  HTTP
backend/backend      Node/Express security pipeline (port 5050)
        |  HTTP (optional — falls back to local heuristics if unreachable)
AI_stuff              Python/FastAPI AI service: LLM intent extraction,
                       prompt-injection detection, XGBoost fraud model (port 8010)
```

The Node backend is the actual security gate (authority, policy, risk, consistency, behavior
monitoring). The Python AI service is optional-but-recommended: it adds LLM-based intent
extraction/scenario generation and a trained fraud classifier. If it's not running, the backend
still works using deterministic keyword/regex fallbacks.

> **Note on ports:** this machine has a WSL `wslrelay` process squatting on the "obvious" ports
> 5000 and 8000, which caused the backend/AI service to intermittently receive traffic meant for
> something else. Ports were moved to **5050** (backend) and **8010** (AI service) to avoid that
> conflict — see `backend/backend/.env`, `frontend/frontend/.env`, and `AI_stuff` below.

## Prerequisites

- Node.js 18+
- Python 3.10+ (tested on 3.14)
- The root [`.env`](.env) already has `NVIDIA_API_KEY` (used by the AI service's LLM calls) and
  Supabase credentials.

## 1. Start the AI service (Python)

```bash
cd AI_stuff
python -m pip install -r requirements.txt
python -m uvicorn api.intent_api:app --host 0.0.0.0 --port 8010
```

Must be run with `AI_stuff` as the working directory (it loads the fraud model and prompt
templates via paths relative to it). Verify with `http://localhost:8010/docs`.

## 2. Start the backend (Node)

```bash
cd backend
npm install
node backend/server.js
```

Runs on `http://localhost:5050` (see `backend/backend/.env`: `PORT=5050`,
`AI_SERVICE_URL=http://localhost:8010`). Verify with `http://localhost:5050/api/health`.

## 3. Start the frontend (React)

```bash
cd frontend/frontend
npm install
npm run dev
```

Opens on `http://localhost:5173` (see `frontend/frontend/.env`: `VITE_BACKEND_URL=http://localhost:5050`).

## Using it

- **Analyze** — pick an agent, either type a stated intent + transaction yourself or click
  "New Safe Example" / "New Injection Example" to generate a matched or deliberately-mismatched
  pair, then **Analyze Action** to run it through the full security pipeline.
- **Dashboard / Transactions / Security Log** — live history of every decision (persisted to
  `backend/backend/data/transactions.json`).
- **Agents** — the registered agent registry (`backend/backend/data/agents.json`): each agent has
  a role, allowed assets, a max transaction amount, approved contracts, and allowed action types.
- **Policies** — the enforced control list.

## Fixes made to get this running end-to-end

- `AI_stuff/config.py`: `NVIDIA_API_KEY` in the root `.env` has a stray leading space inside the
  quotes (`" nvapi-..."`), which `python-dotenv` preserves literally. Added a validator that
  strips it regardless of source, so a malformed key never reaches the NVIDIA API.
- `backend/backend/services/intentService.js`: the keyword-based intent classifier used plain
  substring matching, so `"Uniswap"` (contains `"swap"`) made any `"approve Uniswap..."` intent
  get misclassified as a `SWAP`, which then falsely flagged a legitimate approve-to-Uniswap
  transaction as an intent/transaction mismatch (false `CONSTRAIN`/`BLOCK`). Switched to
  word-boundary matching. Same fix applied to the fallback check in
  `backend/backend/services/consistencyEngine.js`.
- `backend/backend/services/scenarioService.js` and `AI_stuff/api/intent_api.py`: one of the
  built-in "safe" demo scenarios was itself ambiguously worded ("Approve Uniswap... for a
  scheduled swap" — two real action verbs in one sentence), which would still trigger a false
  mismatch after the fix above. Reworded it.
- Moved backend/AI-service ports off 5000/8000 to 5050/8010 to avoid the WSL relay port conflict
  described above.

Everything else (transaction decoding/simulation, policy engine, risk scoring, behavioral
anomaly detection, post-execution monitoring, the ML fraud model wiring, and the full frontend)
was already correctly implemented and has been verified working end-to-end through the browser.
