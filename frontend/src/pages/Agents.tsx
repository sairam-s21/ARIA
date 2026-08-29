import { useEffect, useState } from 'react'
import { fetchAgents, type AgentRecord } from '../services/api'

function Agents() {
  const [agents, setAgents] = useState<AgentRecord[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')

  useEffect(() => {
    fetchAgents()
      .then(setAgents)
      .catch((err: Error) => setError(err.message))
      .finally(() => setLoading(false))
  }, [])

  if (loading) {
    return <p className="text-slate-400">Loading agents...</p>
  }

  if (error) {
    return (
      <div className="border border-red-900 bg-red-950/30 rounded-xl p-5">
        <p className="text-red-400">Failed to load agents</p>
        <p className="text-sm text-slate-500 mt-2">{error}</p>
      </div>
    )
  }

  return (
    <div>
      <div className="mb-8">
        <p className="text-xs text-slate-500 uppercase tracking-widest mb-2">
          Agent Registry
        </p>
        <h1 className="text-3xl font-semibold">Autonomous Agents</h1>
        <p className="mt-2 text-sm text-slate-400">
          Registered agents and their authorised financial capabilities.
        </p>
      </div>

      <div className="grid gap-4">
        {agents.map((agent) => (
          <div key={agent.agent_id} className="border border-slate-800 bg-slate-900/50 rounded-xl p-6">
            <div className="flex justify-between items-start">
              <div>
                <p className="text-lg font-medium">{agent.role}</p>
                <p className="text-xs text-slate-500 mt-1 font-mono">{agent.agent_id}</p>
              </div>
              <span className="text-xs text-emerald-400 border border-emerald-900 rounded-full px-3 py-1">
                ACTIVE
              </span>
            </div>

            <div className="grid grid-cols-2 gap-4 mt-6">
              <Info label="Allowed Assets" value={agent.allowed_assets?.join(', ')} />
              <Info label="Maximum Transaction" value={`$${agent.max_transaction_amount}`} />
              <Info label="Approved Contracts" value={agent.approved_contracts?.join(', ')} />
              <Info label="Allowed Actions" value={agent.allowed_actions?.join(', ')} />
            </div>
          </div>
        ))}
      </div>
    </div>
  )
}

function Info({ label, value }: { label: string; value: string }) {
  return (
    <div className="bg-slate-950 border border-slate-800 rounded-lg p-4">
      <p className="text-xs text-slate-500">{label}</p>
      <p className="text-sm mt-2">{value}</p>
    </div>
  )
}

export default Agents
