import { useEffect, useState } from 'react'
import { format } from 'date-fns'
import { he } from 'date-fns/locale'
import { TrendingUp, Wrench, ShieldCheck, Download, AlertTriangle, Timer, Target, Users } from 'lucide-react'
import { supabase, badgeColorFor, BAR_PALETTE, isOpenStatus, statusLabel, type Task, type AdminTask, type Vendor } from '../lib/supabase'
import { useOrg } from '../lib/org'

export default function StatsPage() {
  const { businesses, bizName } = useOrg()
  const activeBiz = businesses.filter((b) => b.active)
  const barColor = (i: number) => BAR_PALETTE[i % BAR_PALETTE.length]
  const [tasks, setTasks] = useState<Task[]>([])
  const [adminTasks, setAdminTasks] = useState<AdminTask[]>([])
  const [vendors, setVendors] = useState<Vendor[]>([])

  useEffect(() => {
    Promise.all([
      supabase.from('tasks').select('*').is('deleted_at', null),
      supabase.from('admin_tasks').select('*').is('deleted_at', null),
      supabase.from('vendors').select('*'),
    ]).then(([t, a, v]) => {
      setTasks((t.data as Task[]) ?? [])
      setAdminTasks((a.data as AdminTask[]) ?? [])
      setVendors((v.data as Vendor[]) ?? [])
    })
  }, [])

  // --- KPIs ---
  const nowTs = Date.now()
  const overdueCount =
    tasks.filter((t) => isOpenStatus(t.status) && t.due_date && new Date(t.due_date).getTime() < nowTs).length +
    adminTasks.filter((t) => isOpenStatus(t.status) && t.deadline && new Date(t.deadline).getTime() < nowTs).length

  const resolvedFaults = tasks.filter((t) => t.status === 'done' && t.completed_at)
  const avgResolutionDays = resolvedFaults.length
    ? resolvedFaults.reduce((s, t) => s + (new Date(t.completed_at!).getTime() - new Date(t.created_at).getTime()), 0) /
      resolvedFaults.length / 86400000
    : null

  const doneWithDeadline = adminTasks.filter((t) => t.status === 'done' && t.completed_at && t.deadline)
  const onTimePct = doneWithDeadline.length
    ? Math.round((doneWithDeadline.filter((t) => new Date(t.completed_at!) <= new Date(new Date(t.deadline!).getTime() + 86399000)).length / doneWithDeadline.length) * 100)
    : null

  const openByAssignee = (() => {
    const map = new Map<string, number>()
    for (const t of [...tasks, ...adminTasks]) {
      if (!isOpenStatus(t.status)) continue
      const name = t.assignee_name?.trim() || 'ללא אחראי'
      map.set(name, (map.get(name) ?? 0) + 1)
    }
    return [...map.entries()].sort((a, b) => b[1] - a[1])
  })()

  function exportCsv() {
    const esc = (v: unknown) => '"' + String(v ?? '').replaceAll('"', '""') + '"'
    const fmtD = (v: string | null) => (v ? format(new Date(v), 'dd/MM/yyyy') : '')
    const header = ['סוג', 'כותרת', 'עסק', 'סטטוס', 'דחיפות', 'אחראי', 'דד-ליין', 'נוצר', 'הושלם', 'עלות']
    const rows = [
      ...tasks.map((t) => ['תקלה', t.title, bizName(t.business_id, t.branch), statusLabel(t.status), t.priority, t.assignee_name ?? '', fmtD(t.due_date), fmtD(t.created_at), fmtD(t.completed_at), t.cost ?? '']),
      ...adminTasks.map((t) => ['משימה', t.title, bizName(t.business_id, t.branch), statusLabel(t.status), t.priority, t.assignee_name ?? '', fmtD(t.deadline), fmtD(t.created_at), fmtD(t.completed_at), '']),
    ]
    const csv = '\ufeff' + [header, ...rows].map((r) => r.map(esc).join(',')).join('\n')
    const blob = new Blob([csv], { type: 'text/csv;charset=utf-8' })
    const a = document.createElement('a')
    a.href = URL.createObjectURL(blob)
    a.download = `paseo-ops-${format(new Date(), 'yyyy-MM-dd')}.csv`
    a.click()
    URL.revokeObjectURL(a.href)
  }

  const done = tasks.filter((t) => t.status === 'done' && t.completed_at)
  const now = new Date()

  // Current-month cost per branch
  const monthKey = (d: Date) => `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`
  const thisMonth = monthKey(now)
  const costOf = (list: Task[]) => list.reduce((s, t) => s + (t.cost ?? 0), 0)
  const monthDone = done.filter((t) => monthKey(new Date(t.completed_at!)) === thisMonth)

  // Last 6 months, stacked by branch
  const months: { key: string; label: string; byBranch: Record<string, number>; total: number }[] = []
  for (let i = 5; i >= 0; i--) {
    const d = new Date(now.getFullYear(), now.getMonth() - i, 1)
    const key = monthKey(d)
    const inMonth = done.filter((t) => monthKey(new Date(t.completed_at!)) === key)
    const byBranch: Record<string, number> = {}
    for (const b of activeBiz) byBranch[b.id] = costOf(inMonth.filter((t) => t.business_id === b.id))
    months.push({ key, label: format(d, 'MMM', { locale: he }), byBranch, total: costOf(inMonth) })
  }
  const maxMonth = Math.max(...months.map((m) => m.total), 1)

  // Cost per vendor (all time)
  const vendorCosts = vendors
    .map((v) => ({ v, total: costOf(done.filter((t) => t.vendor_id === v.id)) }))
    .filter((x) => x.total > 0)
    .sort((a, b) => b.total - a.total)
    .slice(0, 5)

  const openByBranch = activeBiz.map((b, i) => ({
    id: b.id,
    name: b.name,
    idx: i,
    count: tasks.filter((t) => isOpenStatus(t.status) && t.business_id === b.id).length,
  }))

  const activeWarranties = done.filter(
    (t) => t.warranty_until && new Date(t.warranty_until) >= new Date(new Date().toDateString())
  )

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-xl font-bold text-slate-900">דשבורד</h2>
          <p className="text-sm text-slate-500">תפעול, עלויות ועומסים</p>
        </div>
        <button
          onClick={exportCsv}
          className="flex shrink-0 items-center gap-1.5 whitespace-nowrap rounded-lg border border-slate-200 bg-white px-3 py-2 text-sm font-medium text-slate-600 hover:bg-slate-50"
        >
          <Download size={15} />
          ייצוא CSV
        </button>
      </div>

      {/* KPI row */}
      <div className="grid grid-cols-3 gap-3">
        <div className={`rounded-2xl border p-4 ${overdueCount > 0 ? 'border-red-200 bg-red-50' : 'border-slate-200 bg-white'}`}>
          <p className="flex items-center gap-1 text-xs text-slate-500"><AlertTriangle size={12} />באיחור</p>
          <p className={`mt-1 text-xl font-bold ltr-num ${overdueCount > 0 ? 'text-red-600' : 'text-slate-900'}`}>{overdueCount}</p>
        </div>
        <div className="rounded-2xl border border-slate-200 bg-white p-4">
          <p className="flex items-center gap-1 text-xs text-slate-500"><Timer size={12} />זמן טיפול ממוצע בתקלה</p>
          <p className="mt-1 text-xl font-bold text-slate-900 ltr-num">{avgResolutionDays === null ? '—' : avgResolutionDays < 1 ? '<1 יום' : Math.round(avgResolutionDays) + ' ימים'}</p>
        </div>
        <div className="rounded-2xl border border-slate-200 bg-white p-4">
          <p className="flex items-center gap-1 text-xs text-slate-500"><Target size={12} />עמידה בזמנים</p>
          <p className="mt-1 text-xl font-bold text-slate-900 ltr-num">{onTimePct === null ? '—' : onTimePct + '%'}</p>
        </div>
      </div>

      {/* This month cards */}
      <section>
        <h3 className="mb-2 text-sm font-bold text-slate-400">
          {format(now, 'MMMM yyyy', { locale: he })} — עלויות תיקון
        </h3>
        <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
          <div className="rounded-2xl border border-slate-200 bg-white p-4">
            <p className="text-xs text-slate-500">סה"כ החודש</p>
            <p className="mt-1 text-xl font-bold text-slate-900 ltr-num">₪{costOf(monthDone).toLocaleString()}</p>
          </div>
          {activeBiz.map((b, i) => (
            <div key={b.id} className="rounded-2xl border border-slate-200 bg-white p-4">
              <span className={`rounded-full px-2 py-0.5 text-xs font-medium ${badgeColorFor(b.name, i)}`}>{b.name}</span>
              <p className="mt-1.5 text-xl font-bold text-slate-900 ltr-num">
                ₪{costOf(monthDone.filter((t) => t.business_id === b.id)).toLocaleString()}
              </p>
            </div>
          ))}
        </div>
      </section>

      {/* 6-month chart */}
      <section className="rounded-2xl border border-slate-200 bg-white p-4">
        <h3 className="mb-4 flex items-center gap-1.5 text-sm font-bold text-slate-500">
          <TrendingUp size={15} />
          חצי שנה אחרונה
        </h3>
        <div className="flex h-40 items-end gap-3">
          {months.map((m) => (
            <div key={m.key} className="flex flex-1 flex-col items-center gap-1">
              <span className="text-[10px] text-slate-400 ltr-num">
                {m.total > 0 ? `₪${m.total.toLocaleString()}` : ''}
              </span>
              <div className="flex w-full max-w-10 flex-col-reverse overflow-hidden rounded-t-md" style={{ height: `${Math.max((m.total / maxMonth) * 120, m.total > 0 ? 6 : 2)}px` }}>
                {activeBiz.map((b, i) =>
                  m.byBranch[b.id] > 0 ? (
                    <div
                      key={b.id}
                      className={barColor(i)}
                      style={{ height: `${(m.byBranch[b.id] / m.total) * 100}%` }}
                    />
                  ) : null
                )}
                {m.total === 0 && <div className="h-full bg-slate-100" />}
              </div>
              <span className="text-xs text-slate-500">{m.label}</span>
            </div>
          ))}
        </div>
        <div className="mt-3 flex justify-center gap-4">
          {activeBiz.map((b, i) => (
            <span key={b.id} className="flex items-center gap-1.5 text-xs text-slate-500">
              <span className={`h-2.5 w-2.5 rounded-full ${barColor(i)}`} />
              {b.name}
            </span>
          ))}
        </div>
      </section>

      <div className="grid gap-3 sm:grid-cols-2">
        {/* Open faults per branch */}
        <section className="rounded-2xl border border-slate-200 bg-white p-4">
          <h3 className="mb-3 flex items-center gap-1.5 text-sm font-bold text-slate-500">
            <Wrench size={15} />
            תקלות פתוחות
          </h3>
          <div className="space-y-2">
            {openByBranch.map(({ id, name, idx, count }) => (
              <div key={id} className="flex items-center justify-between">
                <span className={`rounded-full px-2 py-0.5 text-xs font-medium ${badgeColorFor(name, idx)}`}>{name}</span>
                <span className="font-bold text-slate-900 ltr-num">{count}</span>
              </div>
            ))}
          </div>
        </section>

        {/* Top vendors by cost */}
        <section className="rounded-2xl border border-slate-200 bg-white p-4">
          <h3 className="mb-3 text-sm font-bold text-slate-500">אנשי מקצוע — סה"כ עלויות</h3>
          {vendorCosts.length === 0 ? (
            <p className="text-sm text-slate-400">אין עדיין תיקונים עם עלות ואיש מקצוע</p>
          ) : (
            <div className="space-y-2">
              {vendorCosts.map(({ v, total }) => (
                <div key={v.id} className="flex items-center justify-between text-sm">
                  <span className="text-slate-700">{v.name || v.profession}</span>
                  <span className="font-bold text-slate-900 ltr-num">₪{total.toLocaleString()}</span>
                </div>
              ))}
            </div>
          )}
        </section>
      </div>

      {/* Open load per assignee */}
      <section className="rounded-2xl border border-slate-200 bg-white p-4">
        <h3 className="mb-3 flex items-center gap-1.5 text-sm font-bold text-slate-500">
          <Users size={15} />
          עומס פתוח לפי אחראי
        </h3>
        {openByAssignee.length === 0 ? (
          <p className="text-sm text-slate-400">אין פריטים פתוחים 🎉</p>
        ) : (
          <div className="space-y-2">
            {openByAssignee.map(([name, count]) => (
              <div key={name} className="flex items-center gap-2">
                <span className="w-28 shrink-0 truncate text-sm text-slate-700">{name}</span>
                <div className="h-2.5 flex-1 overflow-hidden rounded-full bg-slate-100">
                  <div className="h-full rounded-full bg-emerald-500" style={{ width: `${(count / openByAssignee[0][1]) * 100}%` }} />
                </div>
                <span className="w-6 text-end text-sm font-bold text-slate-900 ltr-num">{count}</span>
              </div>
            ))}
          </div>
        )}
      </section>

      {/* Active warranties */}
      <section className="rounded-2xl border border-slate-200 bg-white p-4">
        <h3 className="mb-3 flex items-center gap-1.5 text-sm font-bold text-slate-500">
          <ShieldCheck size={15} className="text-emerald-600" />
          אחריות פעילה ({activeWarranties.length})
        </h3>
        {activeWarranties.length === 0 ? (
          <p className="text-sm text-slate-400">אין תיקונים עם אחריות בתוקף</p>
        ) : (
          <div className="space-y-2">
            {activeWarranties.map((t) => (
              <div key={t.id} className="flex items-center justify-between gap-2 text-sm">
                <span className="text-slate-700">{t.title}</span>
                <span className="shrink-0 text-emerald-700">
                  עד {format(new Date(t.warranty_until!), 'd.M.yyyy')}
                </span>
              </div>
            ))}
          </div>
        )}
      </section>
    </div>
  )
}
