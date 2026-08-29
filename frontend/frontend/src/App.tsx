import { useState } from 'react'

import Sidebar from './components/Sidebar'
import Header from './components/Header'

import Dashboard from './pages/Dashboard'
import Agents from './pages/Agents'
import Analyze from './pages/Analyze'
import Transactions from './pages/Transactions'
import SecurityLog from './pages/SecurityLog'
import Policies from './pages/Policies'

function App() {
  const [page, setPage] = useState('dashboard')
  const [analyzed, setAnalyzed] = useState(false)

  return (
    <div className="min-h-screen bg-slate-950 text-slate-100 flex">

      {/* ================= SIDEBAR ================= */}

      <Sidebar
        page={page}
        setPage={setPage}
      />

      {/* ================= MAIN AREA ================= */}

      <main className="flex-1 min-w-0">

        {/* ================= HEADER ================= */}

        <Header />

        {/* ================= PAGE CONTENT ================= */}

        <section className="p-8">

          <div className="max-w-7xl mx-auto">

            {/* Dashboard */}

            {page === 'dashboard' && (
              <Dashboard />
            )}

            {/* Agents */}

            {page === 'agents' && (
              <Agents />
            )}

            {/* Analyze */}

            {page === 'analyze' && (
              <Analyze
                analyzed={analyzed}
                setAnalyzed={setAnalyzed}
              />
            )}

            {/* Transactions */}

            {page === 'transactions' && (
              <Transactions />
            )}

            {/* Security Log */}

            {page === 'security' && (
              <SecurityLog />
            )}

            {/* Policies */}

            {page === 'policies' && (
              <Policies />
            )}

          </div>

        </section>

      </main>

    </div>
  )
}

export default App