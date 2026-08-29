interface DecisionPanelProps {
  decision?: string
  riskLevel?: string
  riskScore?: number
  reason?: string
  violations?: string[]
}

function DecisionPanel({
  decision = 'BLOCKED',
  riskLevel = 'HIGH',
  riskScore = 94,
  reason = 'The proposed transaction does not match the authorised financial intent.',
  violations = [
    'INTENT MISMATCH',
    'UNLIMITED APPROVAL',
    'UNKNOWN CONTRACT',
  ],
}: DecisionPanelProps) {
  const isBlocked = decision.toUpperCase() === 'BLOCK'
    || decision.toUpperCase() === 'BLOCKED'

  const isFlagged = decision.toUpperCase() === 'FLAG'
    || decision.toUpperCase() === 'FLAGGED'
    || decision.toUpperCase() === 'CONSTRAIN'

  const decisionText = isBlocked
    ? 'BLOCKED'
    : isFlagged
      ? decision.toUpperCase() === 'CONSTRAIN' ? 'CONSTRAINED' : 'FLAGGED'
      : 'ALLOWED'


  return (
    <div
      className={`mt-6 border rounded-xl p-8 text-center ${
        isBlocked
          ? 'border-red-900 bg-red-950/20'
          : isFlagged
            ? 'border-amber-900 bg-amber-950/20'
            : 'border-emerald-900 bg-emerald-950/20'
      }`}
    >

      {/* Heading */}

      <p
        className={`text-xs uppercase tracking-widest ${
          isBlocked
            ? 'text-red-400'
            : isFlagged
              ? 'text-amber-400'
              : 'text-emerald-400'
        }`}
      >
        Intent Consistency Decision
      </p>

      {/* Decision */}

      <h2
        className={`text-4xl font-bold mt-4 ${
          isBlocked
            ? 'text-red-400'
            : isFlagged
              ? 'text-amber-400'
              : 'text-emerald-400'
        }`}
      >
        {decisionText}
      </h2>

      {/* Reason */}

      <p className="text-sm text-slate-400 mt-4 max-w-2xl mx-auto">
        {reason}
      </p>

      {/* Risk */}

      <div className="mt-7">

        <p className="text-xs text-slate-500 uppercase tracking-widest">
          Risk Score
        </p>

        <p className="text-3xl font-semibold mt-2">
          {riskScore}
          <span className="text-sm text-slate-500 ml-1">
            /100
          </span>
        </p>

        <p className="text-xs text-slate-500 mt-1">
          Risk Level: {riskLevel}
        </p>

      </div>

      {/* Violations */}

      {violations.length > 0 && (
        <div className="flex flex-wrap justify-center gap-2 mt-6">

          {violations.map((violation) => (
            <span
              key={violation}
              className={`px-3 py-1.5 rounded-full text-xs border ${
                isBlocked
                  ? 'bg-red-950 border-red-800 text-red-400'
                  : isFlagged
                    ? 'bg-amber-950 border-amber-800 text-amber-400'
                    : 'bg-emerald-950 border-emerald-800 text-emerald-400'
              }`}
            >
              {violation}
            </span>
          ))}

        </div>
      )}

    </div>
  )
}

export default DecisionPanel