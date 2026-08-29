interface SidebarProps {
  page: string
  setPage: (page: string) => void
}

function Sidebar({ page, setPage }: SidebarProps) {
  return (
    <aside className="w-64 border-r border-slate-800 bg-slate-950 flex flex-col">

      {/* Logo */}
      <div className="h-16 px-6 flex items-center border-b border-slate-800">
        <div className="flex items-center gap-3">

          <div className="w-8 h-8 rounded-lg bg-white text-slate-950 flex items-center justify-center font-bold">
            A
          </div>

          <div>
            <h1 className="font-semibold tracking-tight">
              ARIA
            </h1>
            <p className="text-[10px] text-slate-500 tracking-wider">
                Autonomous Risk & Intent Authorization
            </p>
            

          </div>

        </div>
      </div>


      {/* Navigation */}
      <nav className="flex-1 p-4 space-y-1">

        {/* Monitor */}
        <p className="px-3 pt-2 pb-3 text-[10px] font-semibold text-slate-500 uppercase tracking-widest">
          Monitor
        </p>


        {/* Dashboard */}
        <button
          onClick={() => setPage('dashboard')}
          className={`w-full flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm ${
            page === 'dashboard'
              ? 'bg-slate-800 text-white'
              : 'text-slate-400 hover:bg-slate-900 hover:text-white'
          }`}
        >
          <span>▦</span>
          Dashboard
        </button>


        {/* Agents */}
        <button
          onClick={() => setPage('agents')}
          className={`w-full flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm ${
            page === 'agents'
              ? 'bg-slate-800 text-white'
              : 'text-slate-400 hover:bg-slate-900 hover:text-white'
          }`}
        >
          <span>◉</span>
          Agents
        </button>


        {/* Analyze */}
        <button
          onClick={() => setPage('analyze')}
          className={`w-full flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm ${
            page === 'analyze'
              ? 'bg-slate-800 text-white'
              : 'text-slate-400 hover:bg-slate-900 hover:text-white'
          }`}
        >
          <span>⌕</span>
          Analyze
        </button>


        {/* Transactions */}
        <button
          onClick={() => setPage('transactions')}
          className={`w-full flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm ${
            page === 'transactions'
              ? 'bg-slate-800 text-white'
              : 'text-slate-400 hover:bg-slate-900 hover:text-white'
          }`}
        >
          <span>⇄</span>
          Transactions
        </button>


        {/* Security */}
        <p className="px-3 pt-7 pb-3 text-[10px] font-semibold text-slate-500 uppercase tracking-widest">
          Security
        </p>


        {/* Security Log */}
        <button
          onClick={() => setPage('security')}
          className={`w-full flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm ${
            page === 'security'
              ? 'bg-slate-800 text-white'
              : 'text-slate-400 hover:bg-slate-900 hover:text-white'
          }`}
        >
          <span>◌</span>
          Security Log
        </button>


        {/* Policies */}
        <button
          onClick={() => setPage('policies')}
          className={`w-full flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm ${
            page === 'policies'
              ? 'bg-slate-800 text-white'
              : 'text-slate-400 hover:bg-slate-900 hover:text-white'
          }`}
        >
          <span>⚙</span>
          Policies
        </button>

      </nav>


      {/* System Status */}
      <div className="p-4">

        <div className="border border-slate-800 rounded-xl p-4 bg-slate-900/50">

          <div className="flex items-center gap-2 mb-2">

            <span className="w-2 h-2 rounded-full bg-emerald-400"></span>

            <span className="text-xs font-medium text-slate-300">
              System Protected
            </span>

          </div>

          <p className="text-[11px] text-slate-500">
            Intent firewall is active
          </p>

        </div>

      </div>

    </aside>
  )
}

export default Sidebar