import { useEffect, useState } from 'react'
import { fetchTransactionLog, type TransactionLog } from '../services/api'

function displayDecision(decision?: string) {
  if (decision === 'ALLOW') return 'ALLOWED'
  if (decision === 'BLOCK') return 'BLOCKED'
  if (decision === 'CONSTRAIN') return 'CONSTRAINED'
  return decision || 'PENDING'
}

function SecurityLog() {
  const [logs, setLogs] = useState<TransactionLog[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')

  useEffect(() => {
    fetchTransactionLog()
      .then(setLogs)
      .catch((err: Error) => setError(err.message))
      .finally(() => setLoading(false))
  }, [])

  const allowed = logs.filter((log) => log.decision === 'ALLOW').length
  const blocked = logs.filter((log) => log.decision === 'BLOCK').length
  const flagged = logs.filter((log) => log.decision === 'CONSTRAIN').length

  if (loading) {
    return <p className="text-slate-400">Loading security logs...</p>
  }

  if (error) {
    return (
      <div className="border border-red-900 bg-red-950/30 rounded-xl p-6">
        <p className="text-red-400 font-medium">Failed to load security logs</p>
        <p className="text-sm text-slate-500 mt-2">{error}</p>
      </div>
    )
  }

  return (
    <div>
      <div className="mb-8">
        <p className="text-xs text-slate-500 uppercase tracking-widest mb-2">Security Monitoring</p>
        <h1 className="text-3xl font-semibold tracking-tight">Security Log</h1>
        <p className="mt-2 text-sm text-slate-400">
          Audit trail of autonomous agent decisions, policy hits, and behavioural alerts.
        </p>
      </div>

      <div className="grid grid-cols-4 gap-4 mb-8">
        <Stat title="Total Events" value={logs.length} />
        <Stat title="Allowed" value={allowed} color="text-emerald-400" />
        <Stat title="Constrained" value={flagged} color="text-amber-400" />
        <Stat title="Blocked" value={blocked} color="text-red-400" />
      </div>

      <div className="border border-slate-800 bg-slate-900/50 rounded-xl overflow-hidden">
        <div className="px-6 py-5 border-b border-slate-800">
          <h2 className="text-sm font-medium">Event History</h2>
          <p className="text-xs text-slate-500 mt-1">Decisions recorded by the intent security layer</p>
        </div>

        <div className="grid grid-cols-[1.2fr_1.5fr_80px_120px_1.4fr] gap-4 px-6 py-3 bg-slate-950/50 border-b border-slate-800">
          <p className="text-[10px] text-slate-500 uppercase tracking-wider">Agent</p>
          <p className="text-[10px] text-slate-500 uppercase tracking-wider">Intent</p>
          <p className="text-[10px] text-slate-500 uppercase tracking-wider">Risk</p>
          <p className="text-[10px] text-slate-500 uppercase tracking-wider">Decision</p>
          <p className="text-[10px] text-slate-500 uppercase tracking-wider">Violations</p>
        </div>

        {logs.map((log, index) => (
          <div
            key={`${log.id}-${log.timestamp}-${index}`}
            className={`grid grid-cols-[1.2fr_1.5fr_80px_120px_1.4fr] gap-4 px-6 py-5 items-center ${
              index !== logs.length - 1 ? 'border-b border-slate-800' : ''
            }`}
          >
            <p className="text-xs text-slate-400">{log.agentId}</p>
            <p className="text-sm line-clamp-2">{log.userIntent}</p>
            <span
              className={`text-xs font-medium ${
                (log.riskScore || 0) >= 75 ? 'text-red-400' : (log.riskScore || 0) >= 30 ? 'text-amber-400' : 'text-emerald-400'
              }`}
            >
              {log.riskScore ?? '--'}
            </span>
            <span
              className={`text-xs font-medium ${
                log.decision === 'ALLOW'
                  ? 'text-emerald-400'
                  : log.decision === 'BLOCK'
                    ? 'text-red-400'
                    : 'text-amber-400'
              }`}
            >
              {displayDecision(log.decision)}
            </span>
            <p className="text-xs text-slate-400">
              {[...(log.policyViolations || []), ...(log.behaviorFlags || [])].join(', ') || 'None'}
            </p>
          </div>
        ))}

        {logs.length === 0 && (
          <div className="px-6 py-16 text-center">
            <p className="text-sm text-slate-400">No security events recorded yet.</p>
          </div>
        )}
      </div>
    </div>
  )
}

function Stat({ title, value, color = 'text-slate-100' }: { title: string; value: number; color?: string }) {
  return (
    <div className="border border-slate-800 bg-slate-900/50 rounded-xl p-5">
      <p className="text-xs text-slate-500 uppercase tracking-wide">{title}</p>
      <p className={`text-3xl font-semibold mt-3 ${color}`}>{value}</p>
    </div>
  )
}

export default SecurityLog
