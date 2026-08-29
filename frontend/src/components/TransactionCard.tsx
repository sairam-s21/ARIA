interface TransactionCardProps {
  id: string
  time: string
  agent: string
  action: string
  type: string
  amount: string
  status: string
  risk: number
}

function TransactionCard({
  id,
  time,
  agent,
  action,
  type,
  amount,
  status,
  risk,
}: TransactionCardProps) {
  const statusStyle: Record<string, string> = {
    ALLOWED: 'text-emerald-400',
    BLOCKED: 'text-red-400',
    FLAGGED: 'text-amber-400',
    CONSTRAIN: 'text-amber-400',
  }

  const statusColor = statusStyle[status.toUpperCase()] || 'text-slate-300'

  return (
    <div className="border border-slate-800 bg-slate-900/50 rounded-xl p-5 flex items-center justify-between gap-4">

      <div className="min-w-0">

        <div className="flex items-center gap-3">
          <span className="text-xs font-mono text-slate-500">{id}</span>
          <span className="text-xs font-mono text-slate-500">{time}</span>
        </div>

        <p className="text-sm font-medium mt-2">{action}</p>

        <p className="text-xs text-slate-500 mt-1">{agent}</p>

      </div>

      <div className="flex items-center gap-6 shrink-0">

        <span className="text-[10px] text-slate-400 border border-slate-700 rounded-md px-2 py-1">
          {type}
        </span>

        <span
          className={`text-sm ${
            amount.toUpperCase() === 'UNLIMITED' ? 'text-red-400' : 'text-slate-300'
          }`}
        >
          {amount}
        </span>

        <div className="text-right">
          <p className="text-xs text-slate-500">Risk</p>
          <p className="text-sm font-medium">{risk}</p>
        </div>

        <span className={`text-xs font-medium ${statusColor}`}>{status}</span>

      </div>

    </div>
  )
}

export default TransactionCard
