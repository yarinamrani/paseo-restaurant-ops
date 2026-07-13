import { useEffect, useState } from 'react'
import { format } from 'date-fns'
import { he } from 'date-fns/locale'
import { Send, Trash2, History, MessageCircle, Clock } from 'lucide-react'
import {
  supabase, ITEM_STATUSES, statusLabel, statusCls,
  type ItemComment, type ItemActivity,
} from '../lib/supabase'
import { useOrg } from '../lib/org'
import { Modal, BranchBadge, AreaBadge } from '../pages/Faults'

type ItemLike = {
  id: string
  title: string
  description: string | null
  status: string
  branch: string
  business_id: string | null
  area_id: string | null
  assignee_name: string | null
  created_at: string
}

const fieldLabels: Record<string, string> = {
  title: 'כותרת',
  description: 'תיאור',
  status: 'סטטוס',
  assignee_name: 'אחראי',
  priority: 'דחיפות',
  branch: 'עסק',
  due_date: 'דד-ליין',
  deadline: 'דד-ליין',
  cost: 'עלות',
  resolution_notes: 'סיכום',
  warranty_until: 'אחריות עד',
  area_id: 'אזור',
  vendor_id: 'איש מקצוע',
}

const priorityLabels: Record<string, string> = { high: 'דחוף', medium: 'רגיל', low: 'נמוך' }

function fmtValue(field: string | null, v: string | null): string {
  if (v === null || v === '') return '—'
  if (field === 'status') return statusLabel(v)
  if (field === 'priority') return priorityLabels[v] ?? v
  if (field === 'area_id' || field === 'vendor_id') return ''
  if (field === 'due_date' || field === 'deadline') {
    const d = new Date(v)
    return isNaN(d.getTime()) ? v : format(d, 'd.M.yyyy')
  }
  return v.length > 60 ? v.slice(0, 60) + '…' : v
}

export default function ItemDetail({
  kind, item, onClose, onChanged,
}: {
  kind: 'fault' | 'task'
  item: ItemLike
  onClose: () => void
  onChanged: () => void
}) {
  const { bizName, areaName, people } = useOrg()
  const table = kind === 'fault' ? 'tasks' : 'admin_tasks'
  const [comments, setComments] = useState<ItemComment[]>([])
  const [activity, setActivity] = useState<ItemActivity[]>([])
  const [newComment, setNewComment] = useState('')
  const [status, setStatus] = useState(item.status)
  const [busy, setBusy] = useState(false)

  async function load() {
    const [c, a] = await Promise.all([
      supabase.from('item_comments').select('*').eq('item_kind', kind).eq('item_id', item.id).order('created_at'),
      supabase.from('item_activity').select('*').eq('item_kind', kind).eq('item_id', item.id).order('created_at', { ascending: false }).limit(40),
    ])
    setComments((c.data as ItemComment[]) ?? [])
    setActivity((a.data as ItemActivity[]) ?? [])
  }

  useEffect(() => {
    load()
  }, [])

  async function changeStatus(next: string) {
    setStatus(next)
    const patch: Record<string, unknown> = { status: next }
    if (next === 'done') patch.completed_at = new Date().toISOString()
    await supabase.from(table).update(patch).eq('id', item.id)
    load()
    onChanged()
  }

  async function sendComment(e: React.FormEvent) {
    e.preventDefault()
    const body = newComment.trim()
    if (!body) return
    setBusy(true)
    const { data: userData } = await supabase.auth.getUser()
    const uid = userData.user?.id ?? null
    const name = people.find((p) => p.user_id === uid)?.full_name ?? null
    await supabase.from('item_comments').insert({ item_kind: kind, item_id: item.id, user_id: uid, user_name: name, body })
    setNewComment('')
    setBusy(false)
    load()
  }

  async function softDelete() {
    if (!confirm(`להעביר את "${item.title}" לסל המחזור? מנהל מערכת יוכל לשחזר.`)) return
    const { data: userData } = await supabase.auth.getUser()
    await supabase.from(table).update({ deleted_at: new Date().toISOString(), deleted_by: userData.user?.id ?? null }).eq('id', item.id)
    onChanged()
    onClose()
  }

  function activityLine(a: ItemActivity): string {
    const who = a.user_name || 'מערכת'
    switch (a.action) {
      case 'created': return `${who} פתח את הפריט`
      case 'comment': return `${who} הגיב: "${(a.new_value ?? '').slice(0, 60)}"`
      case 'deleted': return `${who} העביר לסל המחזור`
      case 'restored': return `${who} שחזר מהסל`
      case 'updated': {
        const f = fieldLabels[a.field ?? ''] ?? a.field ?? ''
        const oldV = fmtValue(a.field, a.old_value)
        const newV = fmtValue(a.field, a.new_value)
        if (a.field === 'area_id' || a.field === 'vendor_id') return `${who} עדכן ${f}`
        return `${who} שינה ${f}: ${oldV} ← ${newV}`
      }
      default: return `${who} · ${a.action}`
    }
  }

  return (
    <Modal title={item.title} onClose={onClose}>
      <div className="space-y-4">
        <div className="flex flex-wrap items-center gap-2">
          <BranchBadge name={bizName(item.business_id, item.branch)} />
          <AreaBadge name={areaName(item.area_id)} />
          <span className={`rounded-full px-2 py-0.5 text-xs font-medium ${statusCls(status)}`}>{statusLabel(status)}</span>
          {item.assignee_name && <span className="text-xs text-slate-500">באחריות {item.assignee_name}</span>}
        </div>

        {item.description && <p className="text-sm text-slate-600">{item.description}</p>}

        <label className="block text-sm">
          <span className="mb-1 block text-slate-600">סטטוס</span>
          <select
            value={status}
            onChange={(e) => changeStatus(e.target.value)}
            className="w-full rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm focus:border-emerald-500 focus:outline-none"
          >
            {ITEM_STATUSES.filter((s) => !(kind === 'fault' && s.value === 'done')).map((s) => (
              <option key={s.value} value={s.value}>{s.label}</option>
            ))}
            {kind === 'fault' && status === 'done' && <option value="done">הושלם</option>}
          </select>
          {kind === 'fault' && status !== 'done' && (
            <span className="mt-1 block text-[11px] text-slate-400">סגירה סופית של תקלה (עם עלות ואחריות) — דרך "סגור קריאה" בכרטיס</span>
          )}
        </label>

        {/* comments */}
        <section>
          <h4 className="mb-2 flex items-center gap-1.5 text-sm font-bold text-slate-500">
            <MessageCircle size={14} />
            תגובות ({comments.length})
          </h4>
          <div className="max-h-44 space-y-2 overflow-y-auto">
            {comments.length === 0 && <p className="text-xs text-slate-400">אין תגובות עדיין</p>}
            {comments.map((c) => (
              <div key={c.id} className="rounded-xl bg-slate-50 px-3 py-2">
                <p className="text-sm text-slate-700">{c.body}</p>
                <p className="mt-0.5 text-[11px] text-slate-400">
                  {c.user_name || '—'} · {format(new Date(c.created_at), 'd.M HH:mm')}
                </p>
              </div>
            ))}
          </div>
          <form onSubmit={sendComment} className="mt-2 flex gap-2">
            <input
              value={newComment}
              onChange={(e) => setNewComment(e.target.value)}
              placeholder="כתוב תגובה או עדכון..."
              className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm focus:border-emerald-500 focus:outline-none"
            />
            <button
              disabled={busy || !newComment.trim()}
              className="shrink-0 rounded-lg bg-emerald-600 px-3 py-2 text-white hover:bg-emerald-700 disabled:opacity-40"
            >
              <Send size={15} className="rtl:-scale-x-100" />
            </button>
          </form>
        </section>

        {/* timeline */}
        <section>
          <h4 className="mb-2 flex items-center gap-1.5 text-sm font-bold text-slate-500">
            <History size={14} />
            יומן פעילות
          </h4>
          <div className="max-h-44 space-y-1.5 overflow-y-auto border-s-2 border-slate-100 ps-3">
            {activity.map((a) => (
              <div key={a.id} className="text-xs text-slate-500">
                <span className="me-1.5 inline-flex items-center gap-1 text-slate-400">
                  <Clock size={10} />
                  {format(new Date(a.created_at), 'd.M HH:mm', { locale: he })}
                </span>
                {activityLine(a)}
              </div>
            ))}
            {activity.length === 0 && <p className="text-xs text-slate-400">אין עדיין פעילות מתועדת</p>}
          </div>
        </section>

        <div className="flex justify-between border-t border-slate-100 pt-3">
          <button
            onClick={softDelete}
            className="flex items-center gap-1.5 rounded-lg px-3 py-1.5 text-sm text-red-500 hover:bg-red-50"
          >
            <Trash2 size={14} />
            העבר לסל מחזור
          </button>
          <button onClick={onClose} className="rounded-lg bg-slate-900 px-4 py-1.5 text-sm font-medium text-white hover:bg-slate-700">
            סגור
          </button>
        </div>
      </div>
    </Modal>
  )
}
