import { useEffect, useState } from 'react'
import { fetchOverview, type Overview } from '../services/api'

function displayDecision(decision?: string) {
  if (decision === 'ALLOW') return 'ALLOWED'
  if (decision === 'BLOCK') return 'BLOCKED'
  if (decision === 'CONSTRAIN') return 'CONSTRAINED'
  return decision || 'UNKNOWN'
}

function Dashboard() {
  const [overview, setOverview] = useState<Overview | null>(null)
  const [error, setError] = useState('')

  useEffect(() => {
    fetchOverview()
      .then(setOverview)
      .catch((err: Error) => setError(err.message))
  }, [])

  const titleFor = (item: Overview['recent'][number]) => {
    if (item.policyViolations?.includes('PROMPT_INJECTION')) return 'Prompt injection blocked'
    if (item.policyViolations?.includes('UNLIMITED_APPROVAL')) return 'Unlimited token approval'
    if (!item.consistency && item.decision === 'BLOCK') return 'High-risk action blocked'
    return item.userIntent || item.transaction?.type || 'Agent action'
  }

  return (
    <div>
      <div className="mb-8">
        <p className="text-xs text-slate-500 uppercase tracking-widest mb-2">
          Overview
        </p>
        <h1 className="text-3xl font-semibold tracking-tight">
          Security Overview
        </h1>
        <p className="mt-2 text-sm text-slate-400">
          Live ARIA decisions across identity, intent, policy, and post-execution monitoring.
        </p>
      </div>

      {error && (
        <p className="text-sm text-amber-400 mb-4">
          Could not reach the security API ({error}). Start the backend on port 5000.
        </p>
      )}

      <div className="grid grid-cols-4 gap-4 mb-8">
        <Metric title="Transactions" value={String(overview?.total ?? 0)} description="Analyzed by ARIA" />
        <Metric title="Allowed" value={String(overview?.allowed ?? 0)} description="Autonomous execution" />
        <Metric title="Constrained" value={String(overview?.constrained ?? 0)} description="Delayed / extra verification" />
        <Metric title="Blocked" value={String(overview?.blocked ?? 0)} description="Prevented before execution" />
      </div>

      <div className="border border-slate-800 bg-slate-900/50 rounded-xl">
        <div className="px-6 py-5 border-b border-slate-800">
          <h2 className="text-sm font-medium">Recent Security Activity</h2>
          <p className="text-xs text-slate-500 mt-1">Latest autonomous agent actions</p>
        </div>

        {(overview?.recent || []).length === 0 && (
          <div className="px-6 py-12 text-sm text-slate-500">
            No evaluations yet. Run an analysis to populate this feed.
          </div>
        )}

        {(overview?.recent || []).map((item, index) => (
          <Activity
            key={`${item.id}-${item.timestamp}-${index}`}
            title={titleFor(item)}
            description={`Agent: ${item.agentId}`}
            status={displayDecision(item.decision)}
            last={index === (overview?.recent.length || 1) - 1}
          />
        ))}
      </div>
    </div>
  )
}

function Metric({
  title,
  value,
  description,
}: {
  title: string
  value: string
  description: string
}) {
  return (
    <div className="border border-slate-800 bg-slate-900/50 rounded-xl p-5">
      <p className="text-xs text-slate-500 uppercase tracking-wide">{title}</p>
      <p className="text-3xl font-semibold mt-3">{value}</p>
      <p className="text-xs text-slate-500 mt-2">{description}</p>
    </div>
  )
}

function Activity({
  title,
  description,
  status,
  last = false,
}: {
  title: string
  description: string
  status: string
  last?: boolean
}) {
  const statusStyle =
    status === 'ALLOWED'
      ? 'text-emerald-400'
      : status === 'BLOCKED'
        ? 'text-red-400'
        : 'text-amber-400'

  return (
    <div className={`px-6 py-4 flex items-center justify-between ${!last ? 'border-b border-slate-800' : ''}`}>
      <div>
        <p className="text-sm font-medium">{title}</p>
        <p className="text-xs text-slate-500 mt-1">{description}</p>
      </div>
      <span className={`text-xs font-medium ${statusStyle}`}>{status}</span>
    </div>
  )
}

export default Dashboard
