import { useEffect, useRef, useState } from 'react'
import { format } from 'date-fns'
import { he } from 'date-fns/locale'
import { Send, Trash2, History, MessageCircle, Clock, Paperclip, FileText, X } from 'lucide-react'
import {
  supabase, ITEM_STATUSES, statusLabel, statusCls,
  type ItemComment, type ItemActivity, type ItemAttachment,
} from '../lib/supabase'
import { useOrg } from '../lib/org'
import { prepareImage } from '../lib/images'
import { Modal, BranchBadge, AreaBadge } from '../pages/Faults'

const MAX_FILE_MB = 50

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
  const [attachments, setAttachments] = useState<ItemAttachment[]>([])
  const [newComment, setNewComment] = useState('')
  const [status, setStatus] = useState(item.status)
  const [busy, setBusy] = useState(false)
  const [uploading, setUploading] = useState(false)
  const [uploadError, setUploadError] = useState<string | null>(null)
  const fileRef = useRef<HTMLInputElement>(null)

  async function load() {
    const [c, a, f] = await Promise.all([
      supabase.from('item_comments').select('*').eq('item_kind', kind).eq('item_id', item.id).order('created_at'),
      supabase.from('item_activity').select('*').eq('item_kind', kind).eq('item_id', item.id).order('created_at', { ascending: false }).limit(40),
      supabase.from('item_attachments').select('*').eq('item_kind', kind).eq('item_id', item.id).order('created_at'),
    ])
    setComments((c.data as ItemComment[]) ?? [])
    setActivity((a.data as ItemActivity[]) ?? [])
    setAttachments((f.data as ItemAttachment[]) ?? [])
  }

  async function uploadFiles(files: FileList | null) {
    if (!files || files.length === 0) return
    setUploading(true)
    setUploadError(null)
    const { data: userData } = await supabase.auth.getUser()
    const uid = userData.user?.id ?? null
    const uname = people.find((p) => p.user_id === uid)?.full_name ?? null
    for (const raw of Array.from(files)) {
      let file = raw
      try {
        if (raw.type.startsWith('image/') || /\.hei[cf]$/i.test(raw.name)) file = await prepareImage(raw)
      } catch { /* keep original */ }
      if (file.size > MAX_FILE_MB * 1024 * 1024) {
        setUploadError(`"${file.name}" גדול מדי (מקסימום ${MAX_FILE_MB}MB)`)
        continue
      }
      const path = `${kind}/${item.id}/${crypto.randomUUID()}-${file.name}`
      const { error } = await supabase.storage.from('task-images').upload(path, file)
      if (error) {
        setUploadError(`העלאת "${file.name}" נכשלה — נסה שוב`)
        continue
      }
      const url = supabase.storage.from('task-images').getPublicUrl(path).data.publicUrl
      await supabase.from('item_attachments').insert({
        item_kind: kind, item_id: item.id, file_name: file.name,
        mime_type: file.type || null, size_bytes: file.size,
        url, storage_path: path, uploaded_by: uid, uploaded_by_name: uname,
      })
    }
    setUploading(false)
    if (fileRef.current) fileRef.current.value = ''
    load()
  }

  async function removeAttachment(att: ItemAttachment) {
    if (!confirm(`להסיר את "${att.file_name}"?`)) return
    const { error } = await supabase.from('item_attachments').delete().eq('id', att.id)
    if (error) {
      setUploadError('אין הרשאה להסיר קובץ של מישהו אחר')
      return
    }
    await supabase.storage.from('task-images').remove([att.storage_path])
    load()
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

        {item.description && <p className="text-sm text-slate-400">{item.description}</p>}

        <label className="block text-sm">
          <span className="mb-1 block text-slate-400">סטטוס</span>
          <select
            value={status}
            onChange={(e) => changeStatus(e.target.value)}
            className="w-full rounded-lg border border-white/15 bg-slate-900/60 px-3 py-2 text-sm focus:border-emerald-500 focus:outline-none"
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

        {/* attachments */}
        <section>
          <h4 className="mb-2 flex items-center gap-1.5 text-sm font-bold text-slate-500">
            <Paperclip size={14} />
            קבצים ({attachments.length})
          </h4>
          {attachments.length > 0 && (
            <div className="mb-2 flex flex-wrap gap-2">
              {attachments.map((att) =>
                att.mime_type?.startsWith('image/') ? (
                  <div key={att.id} className="group relative">
                    <a href={att.url} target="_blank" rel="noreferrer">
                      <img src={att.url} alt={att.file_name} className="h-16 w-16 rounded-lg border border-white/10 object-cover" />
                    </a>
                    <button
                      onClick={() => removeAttachment(att)}
                      className="absolute -top-1.5 -end-1.5 hidden rounded-full bg-slate-700 p-0.5 text-white group-hover:block"
                    >
                      <X size={11} />
                    </button>
                  </div>
                ) : (
                  <div key={att.id} className="group relative flex items-center gap-1.5 rounded-lg border border-white/10 bg-white/5 px-2.5 py-2">
                    <FileText size={14} className="text-slate-400" />
                    <a href={att.url} target="_blank" rel="noreferrer" className="max-w-32 truncate text-xs text-slate-300 hover:underline">
                      {att.file_name}
                    </a>
                    <button
                      onClick={() => removeAttachment(att)}
                      className="absolute -top-1.5 -end-1.5 hidden rounded-full bg-slate-700 p-0.5 text-white group-hover:block"
                    >
                      <X size={11} />
                    </button>
                  </div>
                )
              )}
            </div>
          )}
          <input
            ref={fileRef}
            type="file"
            multiple
            accept="image/*,.heic,.heif,video/mp4,video/quicktime,.mov,.pdf,.doc,.docx,.xls,.xlsx,.csv,.txt"
            hidden
            onChange={(e) => uploadFiles(e.target.files)}
          />
          <button
            type="button"
            onClick={() => fileRef.current?.click()}
            disabled={uploading}
            className="flex items-center gap-1.5 rounded-lg border border-dashed border-white/15 px-3 py-2 text-sm text-slate-400 hover:bg-white/5 disabled:opacity-50"
          >
            <Paperclip size={14} />
            {uploading ? 'מעלה...' : 'צרף קבצים (תמונות, וידאו, מסמכים)'}
          </button>
          {uploadError && <p className="mt-1 text-xs text-red-400">{uploadError}</p>}
        </section>

        {/* comments */}
        <section>
          <h4 className="mb-2 flex items-center gap-1.5 text-sm font-bold text-slate-500">
            <MessageCircle size={14} />
            תגובות ({comments.length})
          </h4>
          <div className="max-h-44 space-y-2 overflow-y-auto">
            {comments.length === 0 && <p className="text-xs text-slate-400">אין תגובות עדיין</p>}
            {comments.map((c) => (
              <div key={c.id} className="rounded-xl bg-white/5 px-3 py-2">
                <p className="text-sm text-slate-300">{c.body}</p>
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
              className="w-full rounded-lg border border-white/15 px-3 py-2 text-sm focus:border-emerald-500 focus:outline-none"
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
          <div className="max-h-44 space-y-1.5 overflow-y-auto border-s-2 border-white/5 ps-3">
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

        <div className="flex justify-between border-t border-white/5 pt-3">
          <button
            onClick={softDelete}
            className="flex items-center gap-1.5 rounded-lg px-3 py-1.5 text-sm text-red-400 hover:bg-red-500/10"
          >
            <Trash2 size={14} />
            העבר לסל מחזור
          </button>
          <button onClick={onClose} className="rounded-lg bg-emerald-400 px-4 py-1.5 text-sm font-semibold text-emerald-950 hover:bg-emerald-300">
            סגור
          </button>
        </div>
      </div>
    </Modal>
  )
}
