interface RiskScoreProps {
  score: number
  level: 'LOW' | 'MEDIUM' | 'HIGH'
}

function RiskScore({ score, level }: RiskScoreProps) {
  const getColor = () => {
    if (level === 'HIGH') return 'text-red-400'
    if (level === 'MEDIUM') return 'text-amber-400'
    return 'text-emerald-400'
  }

  const getBarColor = () => {
    if (level === 'HIGH') return 'bg-red-500'
    if (level === 'MEDIUM') return 'bg-amber-500'
    return 'bg-emerald-500'
  }

  return (
    <div className="border border-slate-800 bg-slate-900/40 rounded-xl p-6">

      <div className="flex items-center justify-between">

        <div>
          <p className="text-xs text-slate-500 uppercase tracking-widest">
            Risk Assessment
          </p>

          <h2 className="text-lg font-medium mt-2">
            Transaction Risk Score
          </h2>
        </div>

        <span
          className={`text-xs font-medium px-3 py-1 rounded-full border ${
            level === 'HIGH'
              ? 'text-red-400 bg-red-950 border-red-900'
              : level === 'MEDIUM'
                ? 'text-amber-400 bg-amber-950 border-amber-900'
                : 'text-emerald-400 bg-emerald-950 border-emerald-900'
          }`}
        >
          {level}
        </span>

      </div>


      {/* Score */}

      <div className="mt-8 flex items-end gap-2">

        <span className={`text-5xl font-semibold ${getColor()}`}>
          {score}
        </span>

        <span className="text-sm text-slate-500 mb-2">
          / 100
        </span>

      </div>


      {/* Progress Bar */}

      <div className="mt-5">

        <div className="h-2 bg-slate-800 rounded-full overflow-hidden">

          <div
            className={`h-full ${getBarColor()} rounded-full transition-all duration-500`}
            style={{
              width: `${Math.min(Math.max(score, 0), 100)}%`,
            }}
          />

        </div>

      </div>


      <p className="text-xs text-slate-500 mt-4">
        Risk calculated from authority, policy compliance,
        transaction intent and simulated state changes.
      </p>

    </div>
  )
}

export default RiskScore    