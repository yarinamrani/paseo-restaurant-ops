import { NavLink, Outlet } from 'react-router-dom'
import { Wrench, ClipboardList, Users, LogOut, UtensilsCrossed, ShieldCheck, BarChart3, Settings } from 'lucide-react'
import { supabase } from '../lib/supabase'
import NotificationsBell from './NotificationsBell'

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
    <div className="flex min-h-screen flex-col">
      <header className="sticky top-0 z-20 bg-gradient-to-l from-teal-800 via-emerald-700 to-emerald-600 shadow-lg shadow-emerald-900/20">
        <div className="mx-auto flex max-w-4xl items-center justify-between px-4 pb-2 pt-3">
          <div className="flex items-center gap-2.5">
            <div className="flex h-10 w-10 items-center justify-center rounded-2xl bg-white/15 text-white ring-1 ring-white/25">
              <UtensilsCrossed size={20} />
            </div>
            <div>
              <h1 className="text-lg font-bold leading-tight text-white">Paseo Ops</h1>
              <p className="text-xs text-emerald-100/80">ניהול תפעול המסעדות</p>
            </div>
          </div>
          <div className="flex items-center gap-1">
            <NotificationsBell />
            <button
              onClick={() => supabase.auth.signOut()}
              className="flex items-center gap-1.5 rounded-lg px-3 py-1.5 text-sm text-emerald-50/90 hover:bg-white/10"
            >
              <LogOut size={16} className="rtl:-scale-x-100" />
              יציאה
            </button>
          </div>
        </div>
        <nav className="mx-auto flex max-w-4xl gap-1.5 overflow-x-auto px-4 pb-2.5">
          {navTabs.map(({ to, label, icon: Icon }) => (
            <NavLink
              key={to}
              to={to}
              end={to === '/'}
              className={({ isActive }) =>
                `flex shrink-0 items-center gap-1.5 whitespace-nowrap rounded-full px-4 py-1.5 text-sm font-medium transition-colors ${
                  isActive
                    ? 'bg-white text-emerald-800 shadow-sm'
                    : 'text-emerald-50/90 hover:bg-white/10'
                }`
              }
            >
              <Icon size={15} />
              {label}
            </NavLink>
          ))}
        </nav>
      </header>
      <main className="mx-auto w-full max-w-4xl flex-1 px-4 py-6">
        <Outlet />
      </main>
      <footer className="py-4 text-center text-[10px] text-slate-300">
        גרסה <span className="ltr-num">{__BUILD_ID__}</span>
      </footer>
    </div>
  )
}
