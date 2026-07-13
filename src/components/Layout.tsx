import { useState } from 'react'
import { NavLink, Outlet, useLocation, useNavigate } from 'react-router-dom'
import {
  Home, Wrench, ClipboardList, Plus, LayoutGrid, UtensilsCrossed, X,
  Users, BarChart3, ShieldCheck, Settings,
} from 'lucide-react'
import NotificationsBell from './NotificationsBell'

const mobileTabs = [
  { to: '/', label: 'בית', icon: Home },
  { to: '/faults', label: 'תקלות', icon: Wrench },
  { to: '/tasks', label: 'משימות', icon: ClipboardList },
  { to: '/more', label: 'עוד', icon: LayoutGrid },
]

export default function Layout({ isAdmin = false }: { isAdmin?: boolean }) {
  const location = useLocation()
  const navigate = useNavigate()
  const [createOpen, setCreateOpen] = useState(false)

  const desktopTabs = [
    { to: '/', label: 'בית', icon: Home },
    { to: '/faults', label: 'תקלות', icon: Wrench },
    { to: '/tasks', label: 'משימות', icon: ClipboardList },
    { to: '/vendors', label: 'אנשי מקצוע', icon: Users },
    ...(isAdmin
      ? [
          { to: '/stats', label: 'דשבורד', icon: BarChart3 },
          { to: '/team', label: 'צוות', icon: ShieldCheck },
          { to: '/settings', label: 'הגדרות', icon: Settings },
        ]
      : []),
  ]

  function quickCreate(path: string) {
    setCreateOpen(false)
    navigate(path)
  }

  return (
    <div className="flex min-h-screen flex-col">
      <header className="sticky top-0 z-20 border-b border-white/10 bg-slate-950/85 backdrop-blur-xl">
        <div className="mx-auto flex max-w-4xl items-center justify-between px-4 py-2.5">
          <div className="flex items-center gap-2.5">
            <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-gradient-to-br from-emerald-400 to-cyan-500 text-slate-950 shadow-lg shadow-emerald-500/40">
              <UtensilsCrossed size={18} />
            </div>
            <h1 className="text-base font-bold text-slate-100">Paseo Ops</h1>
          </div>
          <div className="flex items-center gap-1">
            <NotificationsBell />
          </div>
        </div>
        {/* desktop navigation */}
        <nav className="mx-auto hidden max-w-4xl gap-1.5 overflow-x-auto px-4 pb-2.5 sm:flex">
          {desktopTabs.map(({ to, label, icon: Icon }) => (
            <NavLink
              key={to}
              to={to}
              end={to === '/'}
              className={({ isActive }) =>
                `flex shrink-0 items-center gap-1.5 whitespace-nowrap rounded-full px-4 py-1.5 text-sm font-medium transition-colors ${
                  isActive
                    ? 'bg-emerald-400 text-emerald-950 shadow-md shadow-emerald-400/30'
                    : 'text-slate-300 hover:bg-white/10'
                }`
              }
            >
              <Icon size={15} />
              {label}
            </NavLink>
          ))}
        </nav>
      </header>

      <main key={location.pathname} className="animate-page-in mx-auto w-full max-w-4xl flex-1 px-4 pb-28 pt-6 sm:pb-8">
        <Outlet />
      </main>

      <footer className="hidden py-4 text-center text-[10px] text-slate-600 sm:block">
        גרסה <span className="ltr-num">{__BUILD_ID__}</span>
      </footer>

      {/* mobile bottom tab bar */}
      <nav className="fixed inset-x-0 bottom-0 z-30 border-t border-white/10 bg-slate-950/90 pb-[env(safe-area-inset-bottom)] backdrop-blur-xl sm:hidden">
        <div className="mx-auto grid max-w-md grid-cols-5 items-end px-2">
          {mobileTabs.slice(0, 2).map((t) => (
            <TabButton key={t.to} {...t} />
          ))}
          <div className="flex justify-center">
            <button
              onClick={() => setCreateOpen(true)}
              className="animate-fab-glow -mt-5 mb-1.5 flex h-14 w-14 items-center justify-center rounded-full bg-gradient-to-br from-emerald-400 to-cyan-500 text-slate-950 transition-transform active:scale-90"
              title="יצירה מהירה"
            >
              <Plus size={26} strokeWidth={2.5} />
            </button>
          </div>
          {mobileTabs.slice(2).map((t) => (
            <TabButton key={t.to} {...t} />
          ))}
        </div>
      </nav>

      {/* quick create sheet */}
      {createOpen && (
        <div className="fixed inset-0 z-40 flex items-end bg-black/70 backdrop-blur-sm sm:items-center sm:justify-center" onClick={() => setCreateOpen(false)}>
          <div
            className="animate-sheet-up w-full rounded-t-3xl border-t border-white/10 bg-slate-900 p-5 pb-[calc(env(safe-area-inset-bottom)+20px)] sm:max-w-sm sm:rounded-3xl sm:border"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="mx-auto mb-4 h-1 w-10 rounded-full bg-white/20 sm:hidden" />
            <div className="mb-4 flex items-center justify-between">
              <h3 className="font-bold text-slate-100">מה פותחים?</h3>
              <button onClick={() => setCreateOpen(false)} className="rounded-lg p-1 text-slate-400 hover:bg-white/10">
                <X size={18} />
              </button>
            </div>
            <div className="grid grid-cols-2 gap-3">
              <button
                onClick={() => quickCreate('/faults?new=1')}
                className="flex flex-col items-center gap-2 rounded-2xl border border-amber-400/30 bg-amber-500/10 py-5 text-amber-300 transition-transform active:scale-95"
              >
                <Wrench size={26} />
                <span className="text-sm font-semibold">דיווח תקלה</span>
              </button>
              <button
                onClick={() => quickCreate('/tasks?new=1')}
                className="flex flex-col items-center gap-2 rounded-2xl border border-emerald-400/30 bg-emerald-500/10 py-5 text-emerald-300 transition-transform active:scale-95"
              >
                <ClipboardList size={26} />
                <span className="text-sm font-semibold">משימה חדשה</span>
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}

function TabButton({ to, label, icon: Icon }: { to: string; label: string; icon: React.ComponentType<{ size?: number }> }) {
  return (
    <NavLink
      to={to}
      end={to === '/'}
      className={({ isActive }) =>
        `flex flex-col items-center gap-0.5 py-2 text-[10px] font-medium transition-colors ${
          isActive ? 'text-emerald-300' : 'text-slate-500'
        }`
      }
    >
      {({ isActive }) => (
        <>
          <span className={`rounded-xl px-3 py-0.5 transition-colors ${isActive ? 'bg-emerald-400/15' : ''}`}>
            <Icon size={20} />
          </span>
          {label}
        </>
      )}
    </NavLink>
  )
}
