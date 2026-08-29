interface HeaderProps {
  title?: string
  subtitle?: string
}

function Header({
  title = 'Security Control Center',
  subtitle = 'Autonomous financial agent monitoring',
}: HeaderProps) {
  return (
    <header className="h-16 border-b border-slate-800 px-8 flex items-center justify-between">

      {/* Left: Title */}

      <div>
        <h2 className="text-sm font-medium text-slate-100">
          {title}
        </h2>

        <p className="text-xs text-slate-500">
          {subtitle}
        </p>
      </div>

      {/* Right: System Status */}

      <div className="flex items-center gap-4">

        <div className="flex items-center gap-2 px-3 py-1.5 border border-slate-800 rounded-full">

          <span className="w-2 h-2 rounded-full bg-emerald-400"></span>

          <span className="text-xs text-slate-400">
            All systems operational
          </span>

        </div>

        {/* User */}

        <div className="w-8 h-8 rounded-full bg-slate-800 flex items-center justify-center text-xs font-medium text-slate-200">
          IG
        </div>

      </div>

    </header>
  )
}

export default Header