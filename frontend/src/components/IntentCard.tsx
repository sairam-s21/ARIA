interface IntentCardProps {
  intent: string
  agent?: string
  expectedAction?: string
  amount?: string
}

function IntentCard({
  intent,
  agent = 'Portfolio-Rebalancer-01',
  expectedAction = 'Portfolio Rebalance',
  amount = '$500 USDC → ETH',
}: IntentCardProps) {
  return (
    <div className="border border-slate-800 bg-slate-900/50 rounded-xl p-6">

      {/* Header */}

      <div className="flex items-start justify-between">

        <div>
          <p className="text-xs text-slate-500 uppercase tracking-wider">
            Authorized Intent
          </p>

          <h2 className="text-lg font-medium mt-2">
            Agent Objective
          </h2>
        </div>

        <div className="px-2.5 py-1 rounded-full bg-slate-800 border border-slate-700">
          <span className="text-xs text-slate-400">
            VERIFIED
          </span>
        </div>

      </div>


      {/* Intent */}

      <div className="mt-6 p-4 rounded-lg bg-slate-950 border border-slate-800">

        <p className="text-xs text-slate-500 uppercase tracking-wide">
          Intent
        </p>

        <p className="text-sm text-slate-200 mt-2 leading-relaxed">
          {intent}
        </p>

      </div>


      {/* Details */}

      <div className="mt-5 space-y-3">

        <div className="flex justify-between">
          <span className="text-sm text-slate-500">
            Agent
          </span>

          <span className="text-sm text-slate-200">
            {agent}
          </span>
        </div>


        <div className="flex justify-between">
          <span className="text-sm text-slate-500">
            Expected Action
          </span>

          <span className="text-sm text-slate-200">
            {expectedAction}
          </span>
        </div>


        <div className="flex justify-between">
          <span className="text-sm text-slate-500">
            Expected Amount
          </span>

          <span className="text-sm text-slate-200">
            {amount}
          </span>
        </div>

      </div>


      {/* Security Meaning */}

      <div className="mt-5 pt-5 border-t border-slate-800">

        <p className="text-xs text-slate-500">
          Security interpretation
        </p>

        <p className="text-xs text-slate-400 mt-2 leading-relaxed">
          This intent is used as the reference point for
          transaction consistency analysis.
        </p>

      </div>

    </div>
  )
}

export default IntentCard