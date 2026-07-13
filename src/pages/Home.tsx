import { useEffect, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { format } from 'date-fns'
import { he } from 'date-fns/locale'
import { Wrench, ClipboardList, AlertTriangle, BadgeCheck, Plus, Activity } from 'lucide-react'
import { supabase, isOpenStatus, type Task, type AdminTask, type ItemActivity } from '../lib/supabase'
import { useOrg } from '../lib/org'

export default function HomePage() {
  const { people } = useOrg()
  const navigate = useNavigate()
  const [myId, setMyId] = useState<string | null>(null)
  const [faults, setFaults] = useState<Task[]>([])
  const [tasks, setTasks] = useState<AdminTask[]>([])
  const [activity, setActivity] = useState<ItemActivity[]>([])

  useEffect(() => {
    supabase.auth.getUser().then(({ data }) => setMyId(data.user?.id ?? null))
    Promise.all([
      supabase.from('tasks').select('*').is('deleted_at', null),
      supabase.from('admin_tasks').select('*').is('deleted_at', null),
      supabase.from('item_activity').select('*').order('created_at', { ascending: false }).limit(12),
    ]).then(([f, t, a]) => {
      setFaults((f.data as Task[]) ?? [])
      setTasks((t.data as AdminTask[]) ?? [])
      setActivity((a.data as ItemActivity[]) ?? [])
    })
  }, [])

  const hour = new Date().getHours()
  const greeting = hour < 5 ? 'לילה טוב' : hour < 12 ? 'בוקר טוב' : hour < 17 ? 'צהריים טובים' : hour < 21 ? 'ערב טוב' : 'לילה טוב'
  const firstName = (people.find((p) => p.user_id === myId)?.full_name ?? '').split(' ')[0]

  const nowTs = Date.now()
  const myFullName = people.find((p) => p.user_id === myId)?.full_name?.trim() ?? ''
  const myNames = new Set([myFullName, myFullName.split(' ')[0]].filter(Boolean))
  const isMine = (t: { assignee_user_id: string | null; assignee_name: string | null }) =>
    (myId && t.assignee_user_id === myId) || (!!t.assignee_name && myNames.has(t.assignee_name.trim()))

  const openFaults = faults.filter((t) => isOpenStatus(t.status))
  const openTasks = tasks.filter((t) => isOpenStatus(t.status))
  const myOpen = [...openFaults, ...openTasks].filter(isMine).length
  const overdue =
    openFaults.filter((t) => t.due_date && new Date(t.due_date).getTime() < nowTs).length +
    openTasks.filter((t) => t.deadline && new Date(t.deadline).getTime() < nowTs).length
  const waitingApproval = [...openFaults, ...openTasks].filter((t) => t.status === 'waiting_approval').length

  const titleOf = (a: ItemActivity) => {
    const list: { id: string; title: string }[] = a.item_kind === 'fault' ? faults : tasks
    return list.find((x) => x.id === a.item_id)?.title ?? null
  }

  function feedLine(a: ItemActivity): string | null {
    const who = (a.user_name || 'מערכת').split(' ')[0]
    const title = titleOf(a)
    if (!title) return null
    switch (a.action) {
      case 'created': return `${who} פתח את "${title}"`
      case 'comment': return `${who} הגיב על "${title}"`
      case 'attachment': return `${who} צירף קובץ ל"${title}"`
      case 'updated':
        if (a.field === 'status') return `${who} עדכן סטטוס ב"${title}"`
        return `${who} עדכן את "${title}"`
      default: return null
    }
  }

  const feed = activity.map((a) => ({ a, line: feedLine(a) })).filter((x) => x.line).slice(0, 8)

  const cards = [
    { label: 'המשימות שלי', value: myOpen, icon: BadgeCheck, glow: 'from-orange-400/20', text: 'text-orange-300', to: '/tasks' },
    { label: 'באיחור', value: overdue, icon: AlertTriangle, glow: 'from-red-400/20', text: overdue > 0 ? 'text-red-300' : 'text-slate-300', to: '/tasks' },
    { label: 'תקלות פתוחות', value: openFaults.length, icon: Wrench, glow: 'from-amber-400/20', text: 'text-amber-300', to: '/faults' },
    { label: 'משימות פתוחות', value: openTasks.length, icon: ClipboardList, glow: 'from-orange-400/20', text: 'text-orange-200', to: '/tasks' },
  ]

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-2xl font-bold text-slate-100">
          {greeting}{firstName ? `, ${firstName}` : ''} 👋
        </h2>
        <p className="text-sm text-slate-400">{format(new Date(), 'EEEE, d בMMMM', { locale: he })}</p>
      </div>

      {/* status cards */}
      <div className="grid grid-cols-2 gap-3">
        {cards.map(({ label, value, icon: Icon, glow, text, to }) => (
          <button
            key={label}
            onClick={() => navigate(to)}
            className={`relative overflow-hidden rounded-2xl border border-white/10 bg-slate-900/60 p-4 text-start transition-transform active:scale-95`}
          >
            <div className={`pointer-events-none absolute -top-8 -end-8 h-24 w-24 rounded-full bg-gradient-to-br ${glow} to-transparent blur-xl`} />
            <Icon size={18} className={text} />
            <p className={`mt-2 text-3xl font-bold ltr-num ${text}`}>{value}</p>
            <p className="text-xs text-slate-400">{label}</p>
          </button>
        ))}
      </div>

      {/* quick actions */}
      <div className="grid grid-cols-2 gap-3">
        <button
          onClick={() => navigate('/faults?new=1')}
          className="flex items-center justify-center gap-2 rounded-2xl border border-amber-400/30 bg-amber-500/10 py-3.5 text-sm font-semibold text-amber-300 transition-transform active:scale-95"
        >
          <Wrench size={16} />
          דיווח תקלה
        </button>
        <button
          onClick={() => navigate('/tasks?new=1')}
          className="flex items-center justify-center gap-2 rounded-2xl border border-orange-400/30 bg-orange-500/10 py-3.5 text-sm font-semibold text-orange-300 transition-transform active:scale-95"
        >
          <Plus size={16} />
          משימה חדשה
        </button>
      </div>

      {/* activity feed */}
      <section className="rounded-2xl border border-white/10 bg-slate-900/60 p-4">
        <h3 className="mb-3 flex items-center gap-1.5 text-sm font-bold text-slate-300">
          <Activity size={15} className="text-orange-400" />
          מה קורה עכשיו
        </h3>
        {feed.length === 0 ? (
          <p className="text-sm text-slate-500">שקט תעשייתי — אין פעילות אחרונה</p>
        ) : (
          <div className="space-y-2.5">
            {feed.map(({ a, line }) => (
              <div key={a.id} className="flex items-start gap-2 text-sm">
                <span className="mt-1.5 h-1.5 w-1.5 shrink-0 rounded-full bg-orange-400/70" />
                <div className="min-w-0">
                  <p className="text-slate-300">{line}</p>
                  <p className="text-[11px] text-slate-500">{format(new Date(a.created_at), 'd.M · HH:mm')}</p>
                </div>
              </div>
            ))}
          </div>
        )}
      </section>
    </div>
  )
}
