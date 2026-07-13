import { useEffect, useState } from 'react'
import { UserCheck, ShieldCheck, UserMinus, Clock } from 'lucide-react'
import { supabase } from '../lib/supabase'
import { useOrg } from '../lib/org'

type Member = {
  user_id: string
  full_name: string | null
  email: string | null
  role: 'admin' | 'staff' | 'pending'
}

const roleLabels: Record<string, { label: string; cls: string }> = {
  admin: { label: 'מנהל', cls: 'bg-emerald-100 text-emerald-700' },
  staff: { label: 'עובד', cls: 'bg-slate-100 text-slate-600' },
  pending: { label: 'ממתין לאישור', cls: 'bg-amber-100 text-amber-700' },
}

export default function TeamPage() {
  const { businesses } = useOrg()
  const activeBiz = businesses.filter((b) => b.active)
  const [members, setMembers] = useState<Member[]>([])
  const [memberships, setMemberships] = useState<{ user_id: string; business_id: string }[]>([])
  const [me, setMe] = useState<string | null>(null)
  const [toast, setToast] = useState<string | null>(null)

  function notify(msg: string) {
    setToast(msg)
    setTimeout(() => setToast(null), 2500)
  }

  async function load() {
    const [{ data: profiles }, { data: roles }, { data: userData }, { data: mships }] = await Promise.all([
      supabase.from('profiles').select('user_id, full_name, email'),
      supabase.from('user_roles').select('user_id, role'),
      supabase.auth.getUser(),
      supabase.from('business_memberships').select('user_id, business_id'),
    ])
    setMemberships((mships as { user_id: string; business_id: string }[]) ?? [])
    setMe(userData.user?.id ?? null)
    const roleMap = new Map((roles ?? []).map((r) => [r.user_id, r.role]))
    setMembers(
      (profiles ?? []).map((p) => ({
        ...p,
        role: (roleMap.get(p.user_id) ?? 'pending') as Member['role'],
      }))
    )
  }

  useEffect(() => {
    load()
  }, [])

  async function setRole(m: Member, role: Member['role'], msg: string) {
    const { error } = await supabase.from('user_roles').update({ role }).eq('user_id', m.user_id)
    if (error) {
      notify('אין לך הרשאה לבצע פעולה זו')
      return
    }
    // approving a pending user grants access to all active businesses (adjustable below)
    if (m.role === 'pending' && role === 'staff' && activeBiz.length > 0) {
      await supabase.from('business_memberships').upsert(
        activeBiz.map((b) => ({ user_id: m.user_id, business_id: b.id, role: 'employee' })),
        { onConflict: 'user_id,business_id', ignoreDuplicates: true }
      )
    }
    notify(msg)
    load()
  }

  async function toggleBiz(m: Member, businessId: string, has: boolean) {
    if (has) {
      await supabase.from('business_memberships').delete().eq('user_id', m.user_id).eq('business_id', businessId)
    } else {
      await supabase.from('business_memberships').insert({ user_id: m.user_id, business_id: businessId, role: 'employee' })
    }
    load()
  }

  const pending = members.filter((m) => m.role === 'pending')
  const active = members.filter((m) => m.role !== 'pending')

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-xl font-bold text-slate-900">צוות</h2>
        <p className="text-sm text-slate-500">
          {active.length} חברי צוות{pending.length > 0 && ` · ${pending.length} ממתינים לאישור`}
        </p>
      </div>

      {pending.length > 0 && (
        <section>
          <h3 className="mb-2 flex items-center gap-1.5 text-sm font-bold text-amber-600">
            <Clock size={15} />
            ממתינים לאישור
          </h3>
          <div className="space-y-2">
            {pending.map((m) => (
              <div key={m.user_id} className="flex items-center justify-between gap-3 rounded-xl border border-amber-200 bg-amber-50/50 p-4">
                <div className="min-w-0">
                  <p className="font-medium text-slate-900">{m.full_name || 'ללא שם'}</p>
                  <p className="truncate text-sm text-slate-500" dir="ltr">{m.email}</p>
                </div>
                <button
                  onClick={() => setRole(m, 'staff', `${m.full_name || m.email} אושר והצטרף לצוות!`)}
                  className="flex shrink-0 items-center gap-1.5 whitespace-nowrap rounded-lg bg-emerald-600 px-4 py-2 text-sm font-semibold text-white hover:bg-emerald-700"
                >
                  <UserCheck size={15} />
                  אשר
                </button>
              </div>
            ))}
          </div>
        </section>
      )}

      <section>
        <h3 className="mb-2 text-sm font-bold text-slate-400">חברי צוות</h3>
        <div className="space-y-2">
          {active.map((m) => {
            const rl = roleLabels[m.role]
            const isSelf = m.user_id === me
            return (
              <div key={m.user_id} className="flex items-center justify-between gap-3 rounded-xl border border-slate-200 bg-white p-4">
                <div className="min-w-0">
                  <div className="flex items-center gap-2">
                    <p className="font-medium text-slate-900">{m.full_name || 'ללא שם'}</p>
                    <span className={`rounded-full px-2 py-0.5 text-xs font-medium ${rl.cls}`}>{rl.label}</span>
                    {isSelf && <span className="text-xs text-slate-400">(אתה)</span>}
                  </div>
                  <p className="truncate text-sm text-slate-500" dir="ltr">{m.email}</p>
                  {m.role === 'admin' ? (
                    <p className="mt-1.5 text-xs text-emerald-700">גישה לכל העסקים (מנהל מערכת)</p>
                  ) : (
                    <div className="mt-1.5 flex flex-wrap items-center gap-1">
                      <span className="text-[11px] text-slate-400">עסקים:</span>
                      {activeBiz.map((b) => {
                        const has = memberships.some((x) => x.user_id === m.user_id && x.business_id === b.id)
                        return (
                          <button
                            key={b.id}
                            onClick={() => toggleBiz(m, b.id, has)}
                            title={has ? 'הסר גישה' : 'תן גישה'}
                            className={`rounded-full px-2 py-0.5 text-[11px] font-medium transition-colors ${
                              has
                                ? 'bg-emerald-100 text-emerald-700'
                                : 'border border-dashed border-slate-300 text-slate-400 hover:bg-slate-50'
                            }`}
                          >
                            {b.name}
                          </button>
                        )
                      })}
                    </div>
                  )}
                </div>
                {!isSelf && (
                  <div className="flex shrink-0 gap-1.5">
                    {m.role === 'staff' ? (
                      <button
                        onClick={() => setRole(m, 'admin', `${m.full_name || m.email} הפך למנהל`)}
                        title="הפוך למנהל"
                        className="flex items-center gap-1 rounded-lg border border-slate-200 px-2.5 py-1.5 text-xs text-slate-600 hover:bg-slate-50"
                      >
                        <ShieldCheck size={14} />
                        הפוך למנהל
                      </button>
                    ) : (
                      <button
                        onClick={() => setRole(m, 'staff', `${m.full_name || m.email} הורד לעובד`)}
                        title="הורד לעובד"
                        className="flex items-center gap-1 rounded-lg border border-slate-200 px-2.5 py-1.5 text-xs text-slate-600 hover:bg-slate-50"
                      >
                        הורד לעובד
                      </button>
                    )}
                    <button
                      onClick={() => setRole(m, 'pending', `הגישה של ${m.full_name || m.email} הושהתה`)}
                      title="השהה גישה"
                      className="flex items-center gap-1 rounded-lg border border-red-200 px-2.5 py-1.5 text-xs text-red-600 hover:bg-red-50"
                    >
                      <UserMinus size={14} />
                      השהה
                    </button>
                  </div>
                )}
              </div>
            )
          })}
        </div>
      </section>

      {toast && (
        <div className="fixed bottom-6 start-1/2 z-50 -translate-x-1/2 rtl:translate-x-1/2 rounded-full bg-slate-900 px-5 py-2.5 text-sm text-white shadow-lg">
          {toast}
        </div>
      )}
    </div>
  )
}
