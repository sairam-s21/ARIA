import { useEffect, useState } from 'react'
import { fetchPolicies, type PolicyRecord } from '../services/api'

function Policies() {
  const [policies, setPolicies] = useState<PolicyRecord[]>([])

  useEffect(() => {
    fetchPolicies()
      .then(setPolicies)
      .catch(() => {
        setPolicies([
          {
            name: 'Spending Limit',
            description: 'Caps each agent to its assigned maximum transaction amount.',
            rule: 'Per-agent max_transaction_amount',
            status: 'ACTIVE',
            severity: 'HIGH',
          },
        ])
      })
  }, [])

  return (
    <div>
      <div className="mb-8">
        <p className="text-xs text-slate-500 uppercase tracking-widest mb-2">Security Configuration</p>
        <h1 className="text-3xl font-semibold tracking-tight">Security Policies</h1>
        <p className="mt-2 text-sm text-slate-400">
          Financial boundaries enforced before an autonomous action reaches wallets or protocols.
        </p>
      </div>

      <div className="grid grid-cols-3 gap-4 mb-8">
        <div className="border border-slate-800 bg-slate-900/50 rounded-xl p-5">
          <p className="text-xs text-slate-500 uppercase tracking-wide">Active Policies</p>
          <p className="text-3xl font-semibold mt-3">{policies.length}</p>
        </div>
        <div className="border border-slate-800 bg-slate-900/50 rounded-xl p-5">
          <p className="text-xs text-slate-500 uppercase tracking-wide">Critical Rules</p>
          <p className="text-3xl font-semibold mt-3 text-red-400">
            {policies.filter((p) => p.severity === 'CRITICAL').length}
          </p>
        </div>
        <div className="border border-slate-800 bg-slate-900/50 rounded-xl p-5">
          <p className="text-xs text-slate-500 uppercase tracking-wide">Enforcement</p>
          <p className="text-3xl font-semibold mt-3 text-emerald-400">ON</p>
        </div>
      </div>

      <div className="border border-slate-800 bg-slate-900/50 rounded-xl overflow-hidden">
        <div className="px-6 py-5 border-b border-slate-800">
          <h2 className="text-sm font-medium">Enforced Policies</h2>
        </div>

        {policies.map((policy, index) => (
          <div
            key={policy.name}
            className={`px-6 py-5 ${index !== policies.length - 1 ? 'border-b border-slate-800' : ''}`}
          >
            <div className="flex items-start justify-between">
              <div>
                <p className="text-sm font-medium">{policy.name}</p>
                <p className="text-xs text-slate-500 mt-1 max-w-2xl">{policy.description}</p>
                <p className="text-sm text-slate-300 mt-3">{policy.rule}</p>
              </div>
              <div className="flex items-center gap-3 ml-6">
                <span
                  className={`text-[10px] font-medium px-2.5 py-1 rounded-full border ${
                    policy.severity === 'CRITICAL'
                      ? 'text-red-400 border-red-900 bg-red-950/30'
                      : 'text-amber-400 border-amber-900 bg-amber-950/30'
                  }`}
                >
                  {policy.severity}
                </span>
                <span className="text-xs font-medium text-emerald-400">{policy.status}</span>
              </div>
            </div>
          </div>
        ))}
      </div>
    </div>
  )
}

export default Policies
