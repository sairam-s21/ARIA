interface SecurityPipelineProps {
  analyzed?: boolean
}

function SecurityPipeline({ analyzed = false }: SecurityPipelineProps) {
  const steps = [
    { number: '01', title: 'Observe', description: 'Capture agent action' },
    { number: '02', title: 'Intent', description: 'Understand objective' },
    { number: '03', title: 'Authority', description: 'Verify identity & role' },
    { number: '04', title: 'Context', description: 'History & counterparties' },
    { number: '05', title: 'Risk', description: 'Score manipulation & drift' },
    { number: '06', title: 'Policy', description: 'Enforce financial controls' },
    { number: '07', title: 'Decide', description: 'Allow / constrain / block' },
    { number: '08', title: 'Monitor', description: 'Watch after execution' },
  ]

  return (
    <div className="border border-slate-800 bg-slate-900/50 rounded-xl p-6">
      <div className="mb-6">
        <p className="text-xs text-slate-500 uppercase tracking-widest">
          Security Pipeline
        </p>

        <h2 className="text-lg font-semibold mt-1">
          Transaction Verification Flow
        </h2>

        <p className="text-xs text-slate-500 mt-1">
          Each proposed agent action passes through multiple security checks.
        </p>
      </div>

      <div className="grid grid-cols-8 gap-2">
        {steps.map((step, index) => (
          <div key={step.number} className="relative">
            
            {/* Connector */}
            {index < steps.length - 1 && (
              <div className="absolute top-5 left-[calc(50%+18px)] w-[calc(100%-12px)] h-px bg-slate-700" />
            )}

            {/* Step */}
            <div className="relative flex flex-col items-center text-center">
              <div
                className={`w-10 h-10 rounded-full border flex items-center justify-center text-xs font-semibold ${
                  analyzed
                    ? 'border-emerald-500 bg-emerald-500/10 text-emerald-400'
                    : 'border-slate-700 bg-slate-950 text-slate-400'
                }`}
              >
                {step.number}
              </div>

              <p className="text-xs font-medium mt-3 text-slate-200">
                {step.title}
              </p>

              <p className="text-[10px] text-slate-500 mt-1 leading-tight">
                {step.description}
              </p>
            </div>
          </div>
        ))}
      </div>

      {/* Status */}
      <div className="mt-6 pt-4 border-t border-slate-800 flex items-center justify-between">
        <div className="flex items-center gap-2">
          <span
            className={`w-2 h-2 rounded-full ${
              analyzed ? 'bg-emerald-400' : 'bg-slate-600'
            }`}
          />

          <span className="text-xs text-slate-400">
            {analyzed
              ? 'Security analysis completed'
              : 'Waiting for transaction analysis'}
          </span>
        </div>

        <span className="text-[10px] uppercase tracking-wider text-slate-500">
          ARIA
        </span>
      </div>
    </div>
  )
}

export default SecurityPipeline