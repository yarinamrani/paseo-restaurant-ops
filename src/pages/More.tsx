import { useNavigate } from 'react-router-dom'
import { Users, BarChart3, ShieldCheck, Settings, LogOut, ChevronLeft } from 'lucide-react'
import { supabase } from '../lib/supabase'

export default function MorePage({ isAdmin }: { isAdmin: boolean }) {
  const navigate = useNavigate()

  const entries = [
    { to: '/vendors', label: 'אנשי מקצוע', desc: 'ספקים, טכנאים ומספרי חיוג', icon: Users, show: true },
    { to: '/stats', label: 'דשבורד', desc: 'עלויות, עומסים ומדדים', icon: BarChart3, show: isAdmin },
    { to: '/team', label: 'צוות', desc: 'אישור משתמשים והרשאות', icon: ShieldCheck, show: isAdmin },
    { to: '/settings', label: 'הגדרות', desc: 'עסקים, אזורים וסל מחזור', icon: Settings, show: isAdmin },
  ].filter((e) => e.show)

  return (
    <div className="space-y-3">
      <h2 className="text-2xl font-bold text-slate-100">עוד</h2>
      {entries.map(({ to, label, desc, icon: Icon }) => (
        <button
          key={to}
          onClick={() => navigate(to)}
          className="flex w-full items-center gap-3 rounded-2xl border border-white/10 bg-slate-900/60 p-4 text-start transition-transform active:scale-[0.98]"
        >
          <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl bg-orange-500/15 text-orange-300">
            <Icon size={20} />
          </div>
          <div className="min-w-0 flex-1">
            <p className="font-semibold text-slate-100">{label}</p>
            <p className="text-xs text-slate-400">{desc}</p>
          </div>
          <ChevronLeft size={18} className="text-slate-500" />
        </button>
      ))}
      <button
        onClick={() => supabase.auth.signOut()}
        className="flex w-full items-center gap-3 rounded-2xl border border-white/10 bg-slate-900/60 p-4 text-start text-red-300 transition-transform active:scale-[0.98]"
      >
        <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl bg-red-500/15">
          <LogOut size={20} className="rtl:-scale-x-100" />
        </div>
        <p className="font-semibold">התנתקות</p>
      </button>
    </div>
  )
}
