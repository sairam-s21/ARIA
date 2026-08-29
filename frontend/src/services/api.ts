// Strips any trailing slash(es): every call site below appends a path that
// already starts with '/', so a VITE_BACKEND_URL set with a trailing slash
// (e.g. "https://host.vercel.app/") would otherwise produce a double slash
// (".../api/overview") that Vercel's routing fails on with no response —
// which the browser then reports as a misleading CORS error.
const BACKEND_URL = (import.meta.env.VITE_BACKEND_URL || 'http://localhost:5050').trim().replace(/\/+$/, '')

export interface TransactionInput {
  type: 'swap' | 'approve' | 'transfer' | 'stake' | 'unknown'
  from?: string
  to?: string
  token?: string
  spender?: string
  protocol?: string
  amount: string
}

export interface AnalyzePayload {
  agentId: string
  userIntent: string
  transaction: TransactionInput
}

export interface AnalysisResult {
  decision: string
  riskLevel: 'LOW' | 'MEDIUM' | 'HIGH'
  riskScore: number
  autonomy?: string
  delaySeconds?: number
  summary?: string
  intent?: {
    type: string
    expectedAction?: string
    description?: string
  }
  transaction?: {
    type?: string
    token?: string
    spender?: string
    amount?: string
    from?: string
    to?: string
    protocol?: string
  }
  transactionSource?: 'provided' | 'inferred'
  consistency?: {
    matched?: boolean
    reason?: string
  }
  policyViolations?: string[]
  behaviorFlags?: string[]
  injection?: boolean
  mlFraudScore?: {
    isFraud: boolean
    fraudProbability: number
  } | null
  simulation?: {
    stateBefore?: Record<string, unknown>
    stateAfter?: Record<string, unknown>
    notes?: string[]
  }
  postExecution?: {
    status?: string
    alerts?: string[]
  }
}

export interface AgentRecord {
  agent_id: string
  role: string
  allowed_assets: string[]
  max_transaction_amount: number
  approved_contracts: string[]
  allowed_actions: string[]
}

export interface TransactionLog {
  id: number
  timestamp?: string
  agentId: string
  userIntent: string
  transaction?: TransactionInput
  decision?: string
  riskLevel?: string
  riskScore?: number
  policyViolations?: string[]
  behaviorFlags?: string[]
  autonomy?: string
  consistency?: {
    matched?: boolean
    reason?: string
  }
}

export interface Overview {
  total: number
  allowed: number
  constrained: number
  blocked: number
  recent: TransactionLog[]
}

export interface PolicyRecord {
  name: string
  description: string
  rule: string
  status: string
  severity: string
}

async function request<T>(path: string, init?: RequestInit): Promise<T> {
  const response = await fetch(`${BACKEND_URL}${path}`, init)
  if (!response.ok) {
    throw new Error(`Backend returned ${response.status}`)
  }
  return response.json()
}

export async function analyzeTransaction(payload: AnalyzePayload): Promise<AnalysisResult> {
  return request<AnalysisResult>('/api/analyze', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(payload),
  })
}

export async function fetchTransactionLog(): Promise<TransactionLog[]> {
  return request<TransactionLog[]>('/api/transactions')
}

export async function fetchAgents(): Promise<AgentRecord[]> {
  return request<AgentRecord[]>('/api/agents')
}

export async function fetchPolicies(): Promise<PolicyRecord[]> {
  return request<PolicyRecord[]>('/api/policies')
}

export async function fetchOverview(): Promise<Overview> {
  return request<Overview>('/api/overview')
}

export async function generateScenario(
  scenarioType: 'safe' | 'injection'
): Promise<{ userIntent: string; transaction: TransactionInput }> {
  return request('/api/generate-scenario', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ scenarioType }),
  })
}
