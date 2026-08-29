import { useEffect, useState } from 'react'
import { fetchTransactionLog, type TransactionLog } from '../services/api'

function displayDecision(decision?: string) {
  if (decision === 'ALLOW') return 'ALLOWED'
  if (decision === 'BLOCK') return 'BLOCKED'
  if (decision === 'CONSTRAIN') return 'CONSTRAINED'
  return decision || 'PENDING'
}

function Transactions() {
  const [transactions, setTransactions] = useState<TransactionLog[]>([])
  const [error, setError] = useState('')

  useEffect(() => {
    fetchTransactionLog()
      .then(setTransactions)
      .catch((err: Error) => setError(err.message))
  }, [])

  const allowed = transactions.filter((tx) => tx.decision === 'ALLOW').length
  const flagged = transactions.filter((tx) => tx.decision === 'CONSTRAIN').length
  const blocked = transactions.filter((tx) => tx.decision === 'BLOCK').length

  return (
    <div>
      <div className="mb-8">
        <p className="text-xs text-slate-500 uppercase tracking-widest mb-2">
          Transaction Monitoring
        </p>
        <h1 className="text-3xl font-semibold tracking-tight">Transactions</h1>
        <p className="mt-2 text-sm text-slate-400">
          Financial actions proposed by autonomous agents, evaluated before execution.
        </p>
      </div>

      {error && (
        <p className="text-sm text-amber-400 mb-4">Could not load transactions: {error}</p>
      )}

      <div className="grid grid-cols-4 gap-4 mb-8">
        <Metric title="Total Transactions" value={transactions.length.toString()} description="Recent activity" />
        <Metric title="Allowed" value={allowed.toString()} description="Passed security checks" valueClass="text-emerald-400" />
        <Metric title="Constrained" value={flagged.toString()} description="Delayed / extra verification" valueClass="text-amber-400" />
        <Metric title="Blocked" value={blocked.toString()} description="Prevented before execution" valueClass="text-red-400" />
      </div>

      <div className="border border-slate-800 bg-slate-900/50 rounded-xl overflow-hidden">
        <div className="px-6 py-5 border-b border-slate-800">
          <h2 className="text-sm font-medium">Transaction History</h2>
          <p className="text-xs text-slate-500 mt-1">Security decisions applied to agent transactions</p>
        </div>

        <div className="grid grid-cols-[90px_1.4fr_1.4fr_100px_110px_110px] gap-4 px-6 py-3 bg-slate-950/50 border-b border-slate-800">
          <Column label="Time" />
          <Column label="Agent" />
          <Column label="Intent" />
          <Column label="Type" />
          <Column label="Amount" />
          <Column label="Decision" />
        </div>

        {transactions.map((tx, index) => (
          <div
            key={`${tx.id}-${tx.timestamp}-${index}`}
            className={`grid grid-cols-[90px_1.4fr_1.4fr_100px_110px_110px] gap-4 px-6 py-5 items-center ${
              index !== transactions.length - 1 ? 'border-b border-slate-800' : ''
            }`}
          >
            <span className="text-xs font-mono text-slate-500">
              {tx.timestamp ? new Date(tx.timestamp).toLocaleTimeString() : '--'}
            </span>
            <span className="text-xs text-slate-300">{tx.agentId}</span>
            <div>
              <p className="text-sm font-medium line-clamp-2">{tx.userIntent}</p>
              <p className="text-xs text-slate-500 mt-1">Risk score: {tx.riskScore ?? 'n/a'}</p>
            </div>
            <span className="text-[10px] text-slate-400 border border-slate-700 rounded-md px-2 py-1 w-fit uppercase">
              {tx.transaction?.type || 'n/a'}
            </span>
            <span className={`text-sm ${tx.transaction?.amount === 'unlimited' ? 'text-red-400' : 'text-slate-300'}`}>
              {tx.transaction?.amount ?? 'n/a'}
            </span>
            <span
              className={`text-xs font-medium ${
                tx.decision === 'ALLOW'
                  ? 'text-emerald-400'
                  : tx.decision === 'BLOCK'
                    ? 'text-red-400'
                    : 'text-amber-400'
              }`}
            >
              {displayDecision(tx.decision)}
            </span>
          </div>
        ))}

        {transactions.length === 0 && (
          <div className="px-6 py-16 text-center text-sm text-slate-500">
            No transactions recorded yet.
          </div>
        )}
      </div>
    </div>
  )
}

function Metric({
  title,
  value,
  description,
  valueClass = 'text-slate-100',
}: {
  title: string
  value: string
  description: string
  valueClass?: string
}) {
  return (
    <div className="border border-slate-800 bg-slate-900/50 rounded-xl p-5">
      <p className="text-xs text-slate-500 uppercase tracking-wide">{title}</p>
      <p className={`text-3xl font-semibold mt-3 ${valueClass}`}>{value}</p>
      <p className="text-xs text-slate-500 mt-2">{description}</p>
    </div>
  )
}

function Column({ label }: { label: string }) {
  return <p className="text-[10px] text-slate-500 uppercase tracking-wider">{label}</p>
}

export default Transactions
