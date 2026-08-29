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
frontend    React + Vite + Tailwind UI (port 5173)
        |  HTTP
backend      Node/Express security pipeline (port 5050)
        |  HTTP (optional — falls back to local heuristics if unreachable)
AI_stuff      Python/FastAPI AI service: LLM intent extraction,
               prompt-injection detection, XGBoost fraud model (port 8010)
```

The Node backend is the actual security gate (authority, policy, risk, consistency, behavior
monitoring). The Python AI service is optional-but-recommended: it adds LLM-based intent
extraction/scenario generation and a trained fraud classifier. If it's not running, the backend
still works using deterministic keyword/regex fallbacks.

> **Note on ports:** the dev machine this was built on has a WSL `wslrelay` process squatting on
> the "obvious" ports 5000 and 8000, which caused the backend/AI service to intermittently
> receive traffic meant for something else. Ports were moved to **5050** (backend) and **8010**
> (AI service) to avoid that conflict — see `backend/.env` and `frontend/.env` below.

## Prerequisites

- Node.js 18+
- Python 3.10+ (tested on 3.14)
- `AI_stuff/config.py` loads `NVIDIA_API_KEY` (used by the AI service's LLM calls) from a root
  `.env` — create one at the project root with `NVIDIA_API_KEY=...` if it's not already there.

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
node server.js
```

Runs on `http://localhost:5050` (see `backend/.env`: `PORT=5050`,
`AI_SERVICE_URL=http://localhost:8010`). Verify with `http://localhost:5050/api/health`.

**One-time Supabase setup** (needed for the transaction log to persist — without it, the app
still works but falls back to an in-memory/local-file log that doesn't survive across serverless
invocations in production). In your Supabase project's SQL Editor, run:

```sql
create table if not exists public.transactions (
  id bigint generated always as identity primary key,
  agent_id text not null,
  user_intent text not null,
  transaction jsonb,
  result jsonb,
  created_at timestamptz not null default now()
);

alter table public.transactions enable row level security;

create policy "allow anon read" on public.transactions
  for select to anon using (true);

create policy "allow anon insert" on public.transactions
  for insert to anon with check (true);
```

## 3. Start the frontend (React)

```bash
cd frontend
npm install
npm run dev
```

Opens on `http://localhost:5173` (see `frontend/.env`: `VITE_BACKEND_URL=http://localhost:5050`).

## Deployment

Three services, three targets:

| Service | Where | Why |
|---|---|---|
| Frontend (`frontend/`) | Vercel | Static Vite build, zero config changes needed |
| Backend (`backend/`) | Vercel | Already has `backend/vercel.json`; runs as a serverless function |
| AI service (`AI_stuff/`) | Render (or Railway) | `xgboost` + `pandas` risk exceeding Vercel's serverless size limit, and a loaded ML model doesn't suit cold-start serverless well. Render/Railway run it as a normal long-running process instead. |

All three need this GitHub repo connected, since that's how both Vercel and Render pull your code.

**1. AI service → Render.** This repo includes [`render.yaml`](render.yaml) at the project root.
On Render: New → Blueprint → point it at this repo → it reads `render.yaml` and creates the
`aria-ai-service` web service automatically (root dir `AI_stuff`, build `pip install -r
requirements.txt`, start `uvicorn api.intent_api:app --host 0.0.0.0 --port $PORT`). Set the
`NVIDIA_API_KEY` environment variable in the Render dashboard (it's marked `sync: false` in the
blueprint deliberately, so the real secret is never committed to the repo). Note the resulting
URL, e.g. `https://aria-ai-service.onrender.com`.

**2. Backend → Vercel.** New Project → import this repo → set **Root Directory** to `backend` →
add Environment Variables:
- `AI_SERVICE_URL` = your Render URL from step 1
- `SUPABASE_URL`, `SUPABASE_ANON_KEY` (from `backend/.env`)
- `ELEVENLABS_API_KEY` / `ELEVENLABS_VOICE_ID` (optional)

Deploy. Note the resulting URL, e.g. `https://finsec.vercel.app`.

**3. Frontend → Vercel.** New Project → import the same repo again → set **Root Directory** to
`frontend` → add Environment Variable `VITE_BACKEND_URL` = the backend URL from step 2 → Deploy.

No code changes are required for any of this — every cross-service link (`AI_SERVICE_URL`,
`VITE_BACKEND_URL`) is already read from an environment variable, never hardcoded.

## Using it

- **Analyze** — pick an agent, either type a stated intent + transaction yourself or click
  "New Safe Example" / "New Injection Example" to generate a matched or deliberately-mismatched
  pair, then **Analyze Action** to run it through the full security pipeline.
- **Dashboard / Transactions / Security Log** — live history of every decision (persisted to
  `backend/data/transactions.json`).
- **Agents** — the registered agent registry (`backend/data/agents.json`): each agent has
  a role, allowed assets, a max transaction amount, approved contracts, and allowed action types.
- **Policies** — the enforced control list.

## Fixes made to get this running end-to-end

- `AI_stuff/config.py`: `NVIDIA_API_KEY` in `.env` has a stray leading space inside the quotes
  (`" nvapi-..."`), which `python-dotenv` preserves literally. Added a validator that strips it
  regardless of source, so a malformed key never reaches the NVIDIA API.
- `backend/services/intentService.js`: the keyword-based intent classifier used plain substring
  matching, so `"Uniswap"` (contains `"swap"`) made any `"approve Uniswap..."` intent get
  misclassified as a `SWAP`, which then falsely flagged a legitimate approve-to-Uniswap
  transaction as an intent/transaction mismatch (false `CONSTRAIN`/`BLOCK`). Switched to
  word-boundary matching, ranked by which verb appears earliest in the sentence. Same fix applied
  to the fallback check in `backend/services/consistencyEngine.js`.
- `backend/services/scenarioService.js` and `AI_stuff/api/intent_api.py`: one of the built-in
  "safe" demo scenarios was itself ambiguously worded ("Approve Uniswap... for a scheduled swap"
  — two real action verbs in one sentence), which would still trigger a false mismatch after the
  fix above. Reworded it.
- `frontend/src/services/api.ts`: `TransactionLog` was missing the `consistency` field the
  backend actually sends, which broke `tsc -b` / `npm run build`. Added it.
- Moved backend/AI-service ports off 5000/8000 to 5050/8010 to avoid a local WSL relay port
  conflict.
- Flattened the originally double-nested `frontend/frontend/` and `backend/backend/` folders to
  `frontend/` and `backend/`, so each is a clean Vercel "Root Directory" on its own.

Everything else (transaction decoding/simulation, policy engine, risk scoring, behavioral
anomaly detection, post-execution monitoring, the ML fraud model wiring, and the full frontend)
was already correctly implemented and has been verified working end-to-end through the browser.
