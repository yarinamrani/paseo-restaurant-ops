import { useEffect, useState } from 'react'
import { format } from 'date-fns'
import { he } from 'date-fns/locale'
import { TrendingUp, Wrench, ShieldCheck } from 'lucide-react'
import { supabase, BRANCHES, branchColors, type Task, type Vendor } from '../lib/supabase'

const branchBarColors: Record<string, string> = {
  'טאלה': 'bg-violet-500',
  'פסאו': 'bg-emerald-500',
  'אומינו': 'bg-sky-500',
}

export default function StatsPage() {
  const [tasks, setTasks] = useState<Task[]>([])
  const [vendors, setVendors] = useState<Vendor[]>([])

  useEffect(() => {
    Promise.all([
      supabase.from('tasks').select('*'),
      supabase.from('vendors').select('*'),
    ]).then(([t, v]) => {
      setTasks((t.data as Task[]) ?? [])
      setVendors((v.data as Vendor[]) ?? [])
    })
  }, [])

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
    for (const b of BRANCHES) byBranch[b] = costOf(inMonth.filter((t) => t.branch === b))
    months.push({ key, label: format(d, 'MMM', { locale: he }), byBranch, total: costOf(inMonth) })
  }
  const maxMonth = Math.max(...months.map((m) => m.total), 1)

  // Cost per vendor (all time)
  const vendorCosts = vendors
    .map((v) => ({ v, total: costOf(done.filter((t) => t.vendor_id === v.id)) }))
    .filter((x) => x.total > 0)
    .sort((a, b) => b.total - a.total)
    .slice(0, 5)

  const openByBranch = BRANCHES.map((b) => ({
    branch: b,
    count: tasks.filter((t) => t.status === 'open' && t.branch === b).length,
  }))

  const activeWarranties = done.filter(
    (t) => t.warranty_until && new Date(t.warranty_until) >= new Date(new Date().toDateString())
  )

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-xl font-bold text-slate-900">דשבורד עלויות</h2>
        <p className="text-sm text-slate-500">תיקונים ותחזוקה לפי סניף</p>
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
          {BRANCHES.map((b) => (
            <div key={b} className="rounded-2xl border border-slate-200 bg-white p-4">
              <span className={`rounded-full px-2 py-0.5 text-xs font-medium ${branchColors[b]}`}>{b}</span>
              <p className="mt-1.5 text-xl font-bold text-slate-900 ltr-num">
                ₪{costOf(monthDone.filter((t) => t.branch === b)).toLocaleString()}
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
                {BRANCHES.map((b) =>
                  m.byBranch[b] > 0 ? (
                    <div
                      key={b}
                      className={branchBarColors[b]}
                      style={{ height: `${(m.byBranch[b] / m.total) * 100}%` }}
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
          {BRANCHES.map((b) => (
            <span key={b} className="flex items-center gap-1.5 text-xs text-slate-500">
              <span className={`h-2.5 w-2.5 rounded-full ${branchBarColors[b]}`} />
              {b}
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
            {openByBranch.map(({ branch, count }) => (
              <div key={branch} className="flex items-center justify-between">
                <span className={`rounded-full px-2 py-0.5 text-xs font-medium ${branchColors[branch]}`}>{branch}</span>
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
