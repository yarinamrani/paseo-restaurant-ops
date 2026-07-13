import { NavLink, Outlet } from 'react-router-dom'
import { Wrench, ClipboardList, Users, LogOut, UtensilsCrossed, ShieldCheck, BarChart3, Settings } from 'lucide-react'
import { supabase } from '../lib/supabase'

const tabs = [
  { to: '/', label: 'תקלות', icon: Wrench },
  { to: '/tasks', label: 'משימות', icon: ClipboardList },
  { to: '/vendors', label: 'אנשי מקצוע', icon: Users },
]

export default function Layout({ isAdmin = false }: { isAdmin?: boolean }) {
  const navTabs = isAdmin
    ? [
        ...tabs,
        { to: '/stats', label: 'דשבורד', icon: BarChart3 },
        { to: '/team', label: 'צוות', icon: ShieldCheck },
        { to: '/settings', label: 'הגדרות', icon: Settings },
      ]
    : tabs
  return (
    <div className="min-h-screen">
      <header className="sticky top-0 z-20 border-b border-slate-200 bg-white/90 backdrop-blur">
        <div className="mx-auto flex max-w-4xl items-center justify-between px-4 py-3">
          <div className="flex items-center gap-2">
            <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-emerald-600 text-white">
              <UtensilsCrossed size={18} />
            </div>
            <div>
              <h1 className="text-lg font-bold leading-tight text-slate-900">Paseo Ops</h1>
              <p className="text-xs text-slate-500">ניהול תפעול המסעדה</p>
            </div>
          </div>
          <button
            onClick={() => supabase.auth.signOut()}
            className="flex items-center gap-1.5 rounded-lg px-3 py-1.5 text-sm text-slate-500 hover:bg-slate-100"
          >
            <LogOut size={16} className="rtl:-scale-x-100" />
            יציאה
          </button>
        </div>
        <nav className="mx-auto flex max-w-4xl gap-1 overflow-x-auto px-4">
          {navTabs.map(({ to, label, icon: Icon }) => (
            <NavLink
              key={to}
              to={to}
              end={to === '/'}
              className={({ isActive }) =>
                `flex shrink-0 items-center gap-1.5 whitespace-nowrap border-b-2 px-4 py-2.5 text-sm font-medium transition-colors ${
                  isActive
                    ? 'border-emerald-600 text-emerald-700'
                    : 'border-transparent text-slate-500 hover:text-slate-800'
                }`
              }
            >
              <Icon size={16} />
              {label}
            </NavLink>
          ))}
        </nav>
      </header>
      <main className="mx-auto max-w-4xl px-4 py-6">
        <Outlet />
      </main>
      <footer className="py-4 text-center text-[10px] text-slate-300">
        גרסה <span className="ltr-num">{__BUILD_ID__}</span>
      </footer>
    </div>
  )
}
