import { useState } from 'react'
import DecisionPanel from '../components/DecisionPanel'
import RiskScore from '../components/RiskScore'
import IntentCard from '../components/IntentCard'
import SecurityPipeline from '../components/SecurityPipeline'
import {
  analyzeTransaction as apiAnalyzeTransaction,
  generateScenario as apiGenerateScenario,
  type AnalysisResult,
  type TransactionInput,
} from '../services/api'

interface AnalyzeProps {
  analyzed: boolean
  setAnalyzed: (value: boolean) => void
}

const DEFAULT_TRANSACTION: TransactionInput = {
  type: 'swap',
  from: 'USDC',
  to: 'ETH',
  amount: '500',
}

// A transaction object containing only the fields relevant to `type`, so
// switching type (or loading a generated scenario) never leaves a stale
// field from a previous type hanging around to confuse a display fallback.
function blankTransactionForType(type: TransactionInput['type'], amount: string): TransactionInput {
  switch (type) {
    case 'swap':
      return { type, from: 'USDC', to: 'ETH', amount }
    case 'approve':
      return { type, token: 'USDC', spender: 'Uniswap', amount }
    case 'transfer':
      return { type, token: 'USDC', to: 'Treasury', amount }
    case 'stake':
      return { type, token: 'ETH', protocol: 'Aave', amount }
    default:
      return { type, amount }
  }
}

// Offline heuristic used only when the backend is unreachable, so the UI
// still responds to what's actually in the two fields instead of showing a
// fixed canned result. Deliberately simple — the real analysis happens
// server-side.
function buildOfflineMock(userIntent: string, transaction: TransactionInput): AnalysisResult {
  const text = userIntent.toLowerCase()
  const amountStr = String(transaction.amount).toLowerCase()
  const suspicious =
    /unlimited|anonymous|untrusted|unverified|unknown|hacker|drain|exfiltrate|scam|override|ignore previous/.test(text) ||
    amountStr === 'unlimited' ||
    /unknown|anonymous|untrusted/i.test(transaction.spender || transaction.to || '')

  if (suspicious) {
    return {
      decision: 'BLOCK',
      riskLevel: 'HIGH',
      riskScore: 94,
      intent: { type: 'UNKNOWN', expectedAction: 'UNKNOWN', description: 'Backend unreachable — offline heuristic used.' },
      transaction,
      transactionSource: 'provided',
      consistency: { matched: false, reason: 'The proposed transaction does not match the authorised financial intent.' },
      policyViolations: ['UNLIMITED_APPROVAL', 'UNKNOWN_CONTRACT'],
      simulation: { notes: ['Unexpected spending authority detected.'] },
    }
  }

  return {
    decision: 'ALLOW',
    riskLevel: 'LOW',
    riskScore: 12,
    intent: { type: 'SWAP', expectedAction: 'SWAP', description: 'Backend unreachable — offline heuristic used.' },
    transaction,
    transactionSource: 'provided',
    consistency: { matched: true, reason: 'The proposed transaction is consistent with the authorised intent.' },
    policyViolations: [],
    simulation: { notes: ['Portfolio rebalance simulated successfully.'] },
  }
}

function Analyze({ analyzed, setAnalyzed }: AnalyzeProps) {
  const [agentId, setAgentId] = useState('Portfolio-Rebalancer-01')

  const [userIntent, setUserIntent] = useState(
    'Rebalance my portfolio using 500 USDC'
  )

  const [transaction, setTransaction] = useState<TransactionInput>(DEFAULT_TRANSACTION)

  const [loading, setLoading] = useState(false)
  const [generating, setGenerating] = useState<'safe' | 'injection' | null>(null)

  const [result, setResult] = useState<AnalysisResult | null>(null)

  const updateTx = (field: keyof TransactionInput, value: string) => {
    setTransaction((prev) => ({ ...prev, [field]: value }))
    setAnalyzed(false)
  }

  // Switching type wipes fields from the previous type instead of just
  // adding to them — otherwise a stale field (e.g. a leftover "to" from a
  // swap) can outrank the new type's real field in a fallback display
  // chain, showing the wrong value even though the right one was set.
  const changeTxType = (type: TransactionInput['type']) => {
    setTransaction((prev) => blankTransactionForType(type, prev.amount))
    setAnalyzed(false)
  }

  const generateScenario = async (scenarioType: 'safe' | 'injection') => {
    setGenerating(scenarioType)
    setAnalyzed(false)
    setResult(null)

    try {
      const data = await apiGenerateScenario(scenarioType)
      setUserIntent(data.userIntent)
      setTransaction({
        ...blankTransactionForType(data.transaction.type, '0'),
        ...data.transaction,
        amount: String(data.transaction.amount),
      })
    } catch (error) {
      console.error('Scenario generation failed:', error)
    } finally {
      setGenerating(null)
    }
  }

  const analyzeTransaction = async () => {
    setLoading(true)
    setAnalyzed(false)
    setResult(null)

    try {
      // Intent and transaction are sent as two independent fields — the
      // stated objective and the actual on-chain call — so a divergence
      // between what the agent says and what it does is exactly what gets
      // caught, rather than one string parsed into both.
      const data = await apiAnalyzeTransaction({
        agentId,
        userIntent,
        transaction,
      })

      console.log('Backend analysis:', data)

      setResult(data)
      setAnalyzed(true)
    } catch (error) {
      console.error('Backend connection failed:', error)

      /*
       * Offline fallback so the UI still responds when the backend is
       * unavailable during frontend development.
       */
      setResult(buildOfflineMock(userIntent, transaction))

      setAnalyzed(true)
    } finally {
      setLoading(false)
    }
  }

  const isBlocked = result?.decision?.toUpperCase() === 'BLOCK'
    || result?.decision?.toUpperCase() === 'BLOCKED'

  const isFlagged = result?.decision?.toUpperCase() === 'FLAG'
    || result?.decision?.toUpperCase() === 'FLAGGED'
    || result?.decision?.toUpperCase() === 'CONSTRAIN'

  const resultTransaction = result?.transaction

  return (
    <>
      {/* ================= PAGE HEADING ================= */}

      <div className="mb-8">

        <p className="text-xs text-slate-500 uppercase tracking-widest mb-2">
          Security Analysis
        </p>

        <h1 className="text-3xl font-semibold tracking-tight">
          Analyze Agent Action
        </h1>

        <p className="mt-2 text-sm text-slate-400">
          Set what the agent was told to do, and what it's actually about to
          submit as a transaction — independently. ARIA checks the second
          against the first, plus authority and policy.
        </p>

      </div>


      {/* ================= INPUT SECTION ================= */}

      <div className="border border-slate-800 bg-slate-900/50 rounded-xl p-6 mb-6">

        <div>

          <label className="text-xs text-slate-500 uppercase tracking-wider">
            Agent
          </label>

          <select
            value={agentId}
            onChange={(e) => {
              setAgentId(e.target.value)
              setAnalyzed(false)
            }}
            className="mt-3 w-full bg-slate-950 border border-slate-800 rounded-lg px-4 py-3 text-sm text-slate-200 outline-none focus:border-slate-600"
          >
            <option value="Portfolio-Rebalancer-01">
              Portfolio-Rebalancer-01
            </option>

            <option value="Treasury-Manager-01">
              Treasury-Manager-01
            </option>

            <option value="Yield-Optimizer-01">
              Yield-Optimizer-01
            </option>
          </select>

          <p className="text-xs text-slate-500 mt-2">
            Autonomous financial agent
          </p>

        </div>


        {/* Generate sample pair */}

        <div className="mt-6 flex items-center justify-between">

          <p className="text-xs text-slate-500 uppercase tracking-wider">
            Sample Scenarios
          </p>

          <div className="flex gap-2">

            <button
              type="button"
              onClick={() => generateScenario('safe')}
              disabled={generating !== null}
              className="px-3 py-1.5 rounded-lg text-xs font-medium border bg-slate-950 border-emerald-900 text-emerald-400 hover:border-emerald-600 transition disabled:opacity-50"
            >
              {generating === 'safe' ? 'Generating…' : '🎲 New Safe Example'}
            </button>

            <button
              type="button"
              onClick={() => generateScenario('injection')}
              disabled={generating !== null}
              className="px-3 py-1.5 rounded-lg text-xs font-medium border bg-slate-950 border-red-900 text-red-400 hover:border-red-600 transition disabled:opacity-50"
            >
              {generating === 'injection' ? 'Generating…' : '🎲 New Injection Example'}
            </button>

          </div>

        </div>

        <p className="text-xs text-slate-500 mt-2">
          Fills in both fields below as a matched (safe) or deliberately
          mismatched (injection) pair — or edit either one yourself.
        </p>


        {/* Intent */}

        <div className="mt-6">

          <label className="text-xs text-slate-500 uppercase tracking-wider">
            Stated Intent — what the agent was told to do
          </label>

          <textarea
            value={userIntent}
            onChange={(e) => {
              setUserIntent(e.target.value)
              setAnalyzed(false)
            }}
            rows={3}
            className="mt-3 w-full bg-slate-950 border border-slate-800 rounded-lg px-4 py-3 text-sm text-slate-300 outline-none focus:border-slate-600 resize-none"
            placeholder="Describe the agent's authorised objective..."
          />

        </div>


        {/* Actual Transaction */}

        <div className="mt-6">

          <label className="text-xs text-slate-500 uppercase tracking-wider">
            Actual Transaction — what the agent is about to submit
          </label>

          <div className="mt-3 grid grid-cols-4 gap-3">

            <select
              value={transaction.type}
              onChange={(e) => changeTxType(e.target.value as TransactionInput['type'])}
              className="bg-slate-950 border border-slate-800 rounded-lg px-3 py-2.5 text-sm text-slate-200 outline-none focus:border-slate-600"
            >
              <option value="swap">Swap</option>
              <option value="approve">Approve</option>
              <option value="transfer">Transfer</option>
              <option value="stake">Stake</option>
            </select>

            {transaction.type === 'swap' && (
              <>
                <input
                  value={transaction.from || ''}
                  onChange={(e) => updateTx('from', e.target.value)}
                  placeholder="From token"
                  className="bg-slate-950 border border-slate-800 rounded-lg px-3 py-2.5 text-sm text-slate-200 outline-none focus:border-slate-600"
                />
                <input
                  value={transaction.to || ''}
                  onChange={(e) => updateTx('to', e.target.value)}
                  placeholder="To token"
                  className="bg-slate-950 border border-slate-800 rounded-lg px-3 py-2.5 text-sm text-slate-200 outline-none focus:border-slate-600"
                />
              </>
            )}

            {transaction.type === 'approve' && (
              <>
                <input
                  value={transaction.token || ''}
                  onChange={(e) => updateTx('token', e.target.value)}
                  placeholder="Token"
                  className="bg-slate-950 border border-slate-800 rounded-lg px-3 py-2.5 text-sm text-slate-200 outline-none focus:border-slate-600"
                />
                <input
                  value={transaction.spender || ''}
                  onChange={(e) => updateTx('spender', e.target.value)}
                  placeholder="Spender / contract"
                  className="bg-slate-950 border border-slate-800 rounded-lg px-3 py-2.5 text-sm text-slate-200 outline-none focus:border-slate-600"
                />
              </>
            )}

            {transaction.type === 'transfer' && (
              <>
                <input
                  value={transaction.token || ''}
                  onChange={(e) => updateTx('token', e.target.value)}
                  placeholder="Token"
                  className="bg-slate-950 border border-slate-800 rounded-lg px-3 py-2.5 text-sm text-slate-200 outline-none focus:border-slate-600"
                />
                <input
                  value={transaction.to || ''}
                  onChange={(e) => updateTx('to', e.target.value)}
                  placeholder="Recipient"
                  className="bg-slate-950 border border-slate-800 rounded-lg px-3 py-2.5 text-sm text-slate-200 outline-none focus:border-slate-600"
                />
              </>
            )}

            {transaction.type === 'stake' && (
              <>
                <input
                  value={transaction.token || ''}
                  onChange={(e) => updateTx('token', e.target.value)}
                  placeholder="Token"
                  className="bg-slate-950 border border-slate-800 rounded-lg px-3 py-2.5 text-sm text-slate-200 outline-none focus:border-slate-600"
                />
                <input
                  value={transaction.protocol || ''}
                  onChange={(e) => updateTx('protocol', e.target.value)}
                  placeholder="Protocol"
                  className="bg-slate-950 border border-slate-800 rounded-lg px-3 py-2.5 text-sm text-slate-200 outline-none focus:border-slate-600"
                />
              </>
            )}

            <input
              value={transaction.amount}
              onChange={(e) => updateTx('amount', e.target.value)}
              placeholder="Amount (or 'unlimited')"
              className="bg-slate-950 border border-slate-800 rounded-lg px-3 py-2.5 text-sm text-slate-200 outline-none focus:border-slate-600"
            />

          </div>

          <p className="text-xs text-slate-500 mt-2">
            This is what actually executes — it does not have to match the
            stated intent above. That gap is what ARIA is built to catch.
          </p>

        </div>


        {/* Analyze Button */}

        <button
          onClick={analyzeTransaction}
          disabled={loading}
          className="mt-6 px-5 py-2.5 rounded-lg bg-white text-slate-950 text-sm font-medium hover:bg-slate-200 transition disabled:opacity-50 disabled:cursor-not-allowed"
        >
          {loading ? 'Analyzing...' : 'Analyze Action'}
        </button>

      </div>


      {/* ================= SECURITY PIPELINE ================= */}

      <div className="mb-6">
        <SecurityPipeline analyzed={analyzed} />
      </div>


      {/* ================= RESULT ================= */}

      {analyzed && result && (

        <div className="space-y-5">

          {/* ================= RESULT HEADER ================= */}

          <div className="border border-slate-800 bg-slate-900/50 rounded-xl p-6">

            <div className="flex items-center justify-between">

              <div>

                <p className="text-xs text-slate-500 uppercase tracking-widest">
                  Analysis Result
                </p>

                <h2 className="text-xl font-semibold mt-2">
                  Security Decision
                </h2>

              </div>

              <div
                className={`px-4 py-2 rounded-full text-xs font-semibold border ${
                  isBlocked
                    ? 'bg-red-950 border-red-900 text-red-400'
                    : isFlagged
                      ? 'bg-amber-950 border-amber-900 text-amber-400'
                      : 'bg-emerald-950 border-emerald-900 text-emerald-400'
                }`}
              >
                {result.decision}
              </div>

            </div>

          </div>
          <IntentCard
            intent={userIntent}
            agent={agentId}
            expectedAction={result.intent?.expectedAction || result.intent?.type || 'Unknown'}
            amount={
              resultTransaction?.amount
                ? `${resultTransaction.amount} ${resultTransaction.token || resultTransaction.from || ''}`.trim()
                : 'N/A'
            }
          />


          {/* ================= INTENT VS TRANSACTION ================= */}

          <div className="grid grid-cols-2 gap-5">

            {/* Stated Intent */}

            <div className="border border-slate-800 bg-slate-900/50 rounded-xl p-6">

              <p className="text-xs text-slate-500 uppercase tracking-wider">
                Stated Intent (as classified by ARIA)
              </p>

              <h3 className="text-lg font-medium mt-3">
                {result.intent?.type || 'UNKNOWN'}
              </h3>

              <div className="mt-5 space-y-3 text-sm">

                <Row
                  label="Agent"
                  value={agentId}
                />

                <Row
                  label="Expected action"
                  value={result.intent?.expectedAction || 'UNKNOWN'}
                />

              </div>

              {result.intent?.description && (
                <p className="text-xs text-slate-500 mt-4 leading-relaxed">
                  {result.intent.description}
                </p>
              )}

            </div>


            {/* Proposed Transaction */}

            <div className="border border-slate-800 bg-slate-900/50 rounded-xl p-6">

              <p className="text-xs text-slate-500 uppercase tracking-wider">
                Actual Transaction
              </p>

              <h3 className="text-lg font-medium mt-3 uppercase">
                {resultTransaction?.type || 'UNKNOWN'}
              </h3>

              <div className="mt-5 space-y-3 text-sm">

                <Row
                  label="Token"
                  value={resultTransaction?.token || resultTransaction?.from || 'N/A'}
                />

                <Row
                  label={resultTransaction?.type === 'stake' ? 'Protocol' : 'Spender / Target'}
                  value={targetFieldForTransaction(resultTransaction)}
                  danger={isBlocked}
                />

                <Row
                  label="Amount"
                  value={String(resultTransaction?.amount ?? 'N/A')}
                  danger={resultTransaction?.amount === 'unlimited'}
                />

              </div>

            </div>

          </div>


          {/* ================= STATE CHANGE ================= */}

          <div className="border border-slate-800 bg-slate-900/50 rounded-xl p-6">

            <p className="text-xs text-slate-500 uppercase tracking-wider mb-5">
              Simulated Outcome
            </p>

            <div className="space-y-3">

              <StateRow
                label="USDC"
                value={formatBalanceChange(
                  result.simulation?.stateBefore?.usdcBalance,
                  result.simulation?.stateAfter?.usdcBalance
                )}
              />

              <StateRow
                label="ETH"
                value={formatBalanceChange(
                  result.simulation?.stateBefore?.ethBalance,
                  result.simulation?.stateAfter?.ethBalance
                )}
              />

              {result.mlFraudScore && (
                <StateRow
                  label="ML fraud model"
                  value={`${result.mlFraudScore.isFraud ? 'Flagged' : 'Clear'} — ${(result.mlFraudScore.fraudProbability * 100).toFixed(1)}% probability`}
                />
              )}

              <div
                className={`p-3 rounded-lg bg-slate-950 border ${
                  isBlocked ? 'border-red-900/50' : 'border-slate-800'
                }`}
              >

                <p className="text-xs text-slate-500">
                  Result
                </p>

                <p
                  className={`text-sm mt-1 ${
                    isBlocked ? 'text-red-400' : 'text-slate-200'
                  }`}
                >
                  {result.simulation?.notes?.[0] ||
                    'Transaction simulated successfully.'}
                </p>

              </div>

            </div>

          </div>


          {/* ================= RISK SCORE ================= */}

          <RiskScore
            score={result.riskScore}
            level={result.riskLevel}
          />


          {/* ================= FINAL DECISION ================= */}

          <DecisionPanel
            decision={result.decision}
            riskLevel={result.riskLevel}
            riskScore={result.riskScore}
            reason={
              result.summary ||
              result.consistency?.reason ||
              'Security analysis completed.'
            }
            violations={[
              ...(result.policyViolations || []),
              ...(result.behaviorFlags || []),
            ]}
          />

          <div className="grid grid-cols-2 gap-5">
            <div className="border border-slate-800 bg-slate-900/50 rounded-xl p-6">
              <p className="text-xs text-slate-500 uppercase tracking-wider">Graduated autonomy</p>
              <h3 className="text-lg font-medium mt-3 capitalize">
                {(result.autonomy || 'autonomous').replace(/_/g, ' ')}
              </h3>
              <p className="text-sm text-slate-400 mt-3">
                {result.decision === 'ALLOW' && 'Low risk — execute without human approval.'}
                {result.decision === 'CONSTRAIN' && `Moderate risk — delay ${result.delaySeconds || 15}s and require additional verification.`}
                {result.decision === 'BLOCK' && 'High risk — block and escalate. The action never reaches financial infrastructure.'}
              </p>
            </div>

            <div className="border border-slate-800 bg-slate-900/50 rounded-xl p-6">
              <p className="text-xs text-slate-500 uppercase tracking-wider">Post-execution monitor</p>
              <h3 className="text-lg font-medium mt-3 capitalize">
                {(result.postExecution?.status || 'not executed').replace(/_/g, ' ')}
              </h3>
              <p className="text-sm text-slate-400 mt-3">
                {(result.postExecution?.alerts || []).length
                  ? result.postExecution?.alerts?.join(', ')
                  : 'No cascading or emerging-threat pattern detected after this decision.'}
              </p>
            </div>
          </div>

        </div>
      )}
    </>
  )
}


/* ================= SMALL COMPONENTS ================= */

function Row({
  label,
  value,
  danger = false,
}: {
  label: string
  value: string
  danger?: boolean
}) {
  return (
    <div className="flex justify-between gap-4">

      <span className="text-slate-500">
        {label}
      </span>

      <span
        className={`text-right ${
          danger
            ? 'text-red-400'
            : 'text-slate-200'
        }`}
      >
        {value}
      </span>

    </div>
  )
}


function StateRow({
  label,
  value,
}: {
  label: string
  value: string
}) {
  return (
    <div className="flex justify-between p-3 rounded-lg bg-slate-950 border border-slate-800">

      <span className="text-sm text-slate-400">
        {label}
      </span>

      <span className="text-sm text-slate-200">
        {value}
      </span>

    </div>
  )
}

function targetFieldForTransaction(tx: AnalysisResult['transaction']): string {
  if (!tx) return 'N/A'
  if (tx.type === 'stake') return tx.protocol || 'N/A'
  if (tx.type === 'transfer') return tx.to || 'N/A'
  if (tx.type === 'approve') return tx.spender || 'N/A'
  if (tx.type === 'swap') return tx.to || 'N/A'
  return tx.spender || tx.to || tx.protocol || 'N/A'
}

function formatBalanceChange(before: unknown, after: unknown): string {
  if (typeof before !== 'number' || typeof after !== 'number') {
    return 'No change'
  }
  if (before === after) {
    return 'No change'
  }
  const round = (n: number) => Math.round(n * 10000) / 10000
  return `${round(before)} → ${round(after)}`
}

export default Analyze
