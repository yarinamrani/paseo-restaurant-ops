import { useEffect, useRef, useState } from 'react'
import { format } from 'date-fns'
import { he } from 'date-fns/locale'
import { Plus, CheckCircle2, Circle, Clock, Pencil, Repeat, Trash2, Pause, Play, ImagePlus } from 'lucide-react'
import { supabase, type AdminTask, type RecurringTask } from '../lib/supabase'
import { prepareImage } from '../lib/images'
import { Modal, DialogButtons, inputCls, BranchBadge, AreaBadge, BranchFilter, BranchSelect, AreaSelect, AssigneeSelect, resolveAssignee } from './Faults'
import { useOrg } from '../lib/org'

export default function TasksPage() {
  const { bizName, areaName, people } = useOrg()
  const [tasks, setTasks] = useState<AdminTask[]>([])
  const [branchFilter, setBranchFilter] = useState<string>('הכל')
  const [assigneeFilter, setAssigneeFilter] = useState<string>('כולם')
  const [addOpen, setAddOpen] = useState(false)
  const [editing, setEditing] = useState<AdminTask | null>(null)
  const [recurringOpen, setRecurringOpen] = useState(false)
  const [myId, setMyId] = useState<string | null>(null)

  useEffect(() => {
    supabase.auth.getUser().then(({ data }) => setMyId(data.user?.id ?? null))
  }, [])

  async function load() {
    const { data } = await supabase.from('admin_tasks').select('*').order('deadline', { ascending: true })
    setTasks((data as AdminTask[]) ?? [])
  }

  useEffect(() => {
    load()
  }, [])

  async function toggle(t: AdminTask) {
    const done = t.status === 'done'
    await supabase
      .from('admin_tasks')
      .update({
        status: done ? 'open' : 'done',
        completed_at: done ? null : new Date().toISOString(),
      })
      .eq('id', t.id)
    load()
  }

  // names that mean "me" — full name and first name — are covered by the "שלי" chip
  const myFullName = people.find((p) => p.user_id === myId)?.full_name?.trim() ?? ''
  const myNames = new Set([myFullName, myFullName.split(' ')[0]].filter(Boolean))
  const isMine = (t: AdminTask) =>
    (myId && t.assignee_user_id === myId) || (!!t.assignee_name && myNames.has(t.assignee_name.trim()))

  const assignees = [
    ...new Set(tasks.map((t) => t.assignee_name?.trim()).filter((n): n is string => !!n && !myNames.has(n))),
  ]
  const byBranch = branchFilter === 'הכל' ? tasks : tasks.filter((t) => t.business_id === branchFilter)
  const filtered =
    assigneeFilter === 'כולם'
      ? byBranch
      : assigneeFilter === '__mine'
        ? byBranch.filter(isMine)
        : byBranch.filter((t) => t.assignee_name?.trim() === assigneeFilter)
  const open = filtered.filter((t) => t.status === 'open')
  const done = filtered.filter((t) => t.status === 'done')

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-xl font-bold text-slate-900">משימות</h2>
          <p className="text-sm text-slate-500">{open.length} פתוחות · {done.length} הושלמו</p>
        </div>
        <div className="flex shrink-0 gap-2">
          <button
            onClick={() => setRecurringOpen(true)}
            title="משימות חוזרות"
            className="flex items-center gap-1.5 whitespace-nowrap rounded-lg border border-slate-200 bg-white px-3 py-2 text-sm font-medium text-slate-600 hover:bg-slate-50"
          >
            <Repeat size={15} />
            חוזרות
          </button>
          <button
            onClick={() => setAddOpen(true)}
            className="flex items-center gap-1.5 whitespace-nowrap rounded-lg bg-emerald-600 px-4 py-2 text-sm font-semibold text-white hover:bg-emerald-700"
          >
            <Plus size={16} />
            משימה חדשה
          </button>
        </div>
      </div>

      <BranchFilter value={branchFilter} onChange={setBranchFilter} counts={tasks.filter((t) => t.status === 'open')} />

      {(assignees.length > 0 || myId) && (
        <div className="flex flex-wrap items-center gap-1.5">
          <span className="text-xs text-slate-400">באחריות:</span>
          {[
            { key: 'כולם', label: 'כולם' },
            ...(myId ? [{ key: '__mine', label: 'שלי 👤' }] : []),
            ...assignees.map((a) => ({ key: a, label: a })),
          ].map(({ key, label }) => (
            <button
              key={key}
              onClick={() => setAssigneeFilter(key)}
              className={`rounded-full px-3 py-1 text-xs font-medium transition-colors ${
                assigneeFilter === key
                  ? 'bg-emerald-600 text-white'
                  : 'border border-slate-200 bg-white text-slate-600 hover:bg-slate-50'
              }`}
            >
              {label}
            </button>
          ))}
        </div>
      )}

      {filtered.length === 0 ? (
        <div className="rounded-2xl border border-dashed border-slate-300 bg-white py-12 text-center text-slate-500">
          אין משימות עדיין
          <div className="mt-2">
            <button onClick={() => setAddOpen(true)} className="text-sm font-medium text-emerald-700 hover:underline">
              הוסף משימה ראשונה
            </button>
          </div>
        </div>
      ) : (
        <div className="space-y-2">
          {[...open, ...done].map((t) => {
            const overdue = t.status === 'open' && t.deadline && new Date(t.deadline) < new Date()
            return (
              <div
                key={t.id}
                className={`flex items-start gap-3 rounded-xl border border-slate-200 bg-white p-4 ${t.status === 'done' ? 'opacity-60' : ''}`}
              >
                <button onClick={() => toggle(t)} className="mt-0.5 text-emerald-600">
                  {t.status === 'done' ? <CheckCircle2 size={20} /> : <Circle size={20} className="text-slate-300 hover:text-emerald-500" />}
                </button>
                <div className="min-w-0 flex-1">
                  <div className="flex flex-wrap items-center gap-2">
                    <span className={`font-medium text-slate-900 ${t.status === 'done' ? 'line-through' : ''}`}>{t.title}</span>
                    <BranchBadge name={bizName(t.business_id, t.branch)} />
                    <AreaBadge name={areaName(t.area_id)} />
                    {t.priority === 'high' && t.status === 'open' && (
                      <span className="rounded-full bg-red-100 px-2 py-0.5 text-xs font-medium text-red-700">דחוף</span>
                    )}
                    {overdue && (
                      <span className="rounded-full bg-red-100 px-2 py-0.5 text-xs font-medium text-red-700">באיחור</span>
                    )}
                  </div>
                  {t.description && <p className="mt-0.5 text-sm text-slate-600">{t.description}</p>}
                  <div className="mt-1 flex flex-wrap gap-x-4 gap-y-0.5 text-xs text-slate-500">
                    {t.deadline && (
                      <span className="flex items-center gap-1">
                        <Clock size={12} />
                        {format(new Date(t.deadline), 'EEEE, d בMMMM', { locale: he })}
                      </span>
                    )}
                    {t.assignee_name && <span>באחריות {t.assignee_name}</span>}
                  </div>
                </div>
                {t.image_url && (
                  <a href={t.image_url} target="_blank" rel="noreferrer" className="shrink-0">
                    <img src={t.image_url} alt="" className="h-14 w-14 rounded-lg object-cover" />
                  </a>
                )}
                <button
                  onClick={() => setEditing(t)}
                  className="mt-0.5 shrink-0 rounded-lg p-1.5 text-slate-400 hover:bg-slate-100 hover:text-slate-700"
                  title="ערוך משימה"
                >
                  <Pencil size={15} />
                </button>
              </div>
            )
          })}
        </div>
      )}

      {(addOpen || editing) && (
        <TaskDialog
          task={editing}
          onClose={() => { setAddOpen(false); setEditing(null) }}
          onSaved={() => { setAddOpen(false); setEditing(null); load() }}
        />
      )}

      {recurringOpen && <RecurringModal onClose={() => { setRecurringOpen(false); load() }} />}
    </div>
  )
}

function TaskDialog({
  task, onClose, onSaved,
}: { task: AdminTask | null; onClose: () => void; onSaved: () => void }) {
  const { businesses, bizName, people } = useOrg()
  const defaultBiz = businesses.find((b) => b.name === 'פסאו')?.id ?? businesses.find((b) => b.active)?.id ?? ''
  const [title, setTitle] = useState(task?.title ?? '')
  const [description, setDescription] = useState(task?.description ?? '')
  const [bizId, setBizId] = useState(task?.business_id ?? defaultBiz)
  const [areaId, setAreaId] = useState(task?.area_id ?? '')
  const [assigneeId, setAssigneeId] = useState<string>(
    task?.assignee_user_id ?? (task?.assignee_name ? '__legacy' : '')
  )
  const [deadline, setDeadline] = useState(task?.deadline ? task.deadline.slice(0, 10) : '')
  const [priority, setPriority] = useState<string>(task?.priority ?? 'medium')
  const [file, setFile] = useState<File | null>(null)
  const [processing, setProcessing] = useState(false)
  const [busy, setBusy] = useState(false)
  const fileRef = useRef<HTMLInputElement>(null)

  async function pickFile(raw: File | null) {
    if (!raw) return
    setProcessing(true)
    setFile(null)
    try {
      setFile(await prepareImage(raw))
    } catch {
      setFile(raw)
    }
    setProcessing(false)
  }

  async function save(e: React.FormEvent) {
    e.preventDefault()
    setBusy(true)
    let imageUrl: string | null = task?.image_url ?? null
    if (file) {
      const path = `${crypto.randomUUID()}-${file.name}`
      const { error } = await supabase.storage.from('task-images').upload(path, file)
      if (!error) {
        imageUrl = supabase.storage.from('task-images').getPublicUrl(path).data.publicUrl
      }
    }
    const payload = {
      title: title.trim(),
      description: description.trim() || null,
      branch: bizName(bizId, 'פסאו'),
      business_id: bizId || null,
      area_id: areaId || null,
      ...resolveAssignee(assigneeId, people, task),
      deadline: deadline ? new Date(deadline).toISOString() : null,
      priority,
      image_url: imageUrl,
    }
    if (task) {
      await supabase.from('admin_tasks').update(payload).eq('id', task.id)
      setBusy(false)
      onSaved()
      return
    }
    const { data: userData } = await supabase.auth.getUser()
    await supabase.from('admin_tasks').insert({
      ...payload,
      created_by: userData.user?.id ?? null,
    })
    setBusy(false)
    onSaved()
  }

  return (
    <Modal title={task ? `עריכת משימה — ${task.title}` : 'משימה חדשה'} onClose={onClose}>
      <form onSubmit={save} className="space-y-3">
        <BranchSelect value={bizId} onChange={(id) => { setBizId(id); setAreaId('') }} />
        <input required autoFocus value={title} onChange={(e) => setTitle(e.target.value)} placeholder="מה צריך לעשות?" className={inputCls} />
        <AreaSelect businessId={bizId} value={areaId} onChange={setAreaId} />
        <textarea value={description} onChange={(e) => setDescription(e.target.value)} placeholder="הוסף פרטים נוספים..." rows={2} className={inputCls} />
        <div className="grid grid-cols-2 gap-3">
          <AssigneeSelect value={assigneeId} legacyName={task?.assignee_name} onChange={setAssigneeId} />
          <label className="block text-sm">
            <span className="mb-1 block text-slate-600">דד-ליין</span>
            <input type="date" value={deadline} onChange={(e) => setDeadline(e.target.value)} className={inputCls} />
          </label>
        </div>
        <label className="block text-sm">
          <span className="mb-1 block text-slate-600">דחיפות</span>
          <select value={priority} onChange={(e) => setPriority(e.target.value)} className={inputCls}>
            <option value="high">דחוף</option>
            <option value="medium">רגיל</option>
            <option value="low">נמוך</option>
          </select>
        </label>
        <div className="flex items-center gap-3">
          <input ref={fileRef} type="file" accept="image/*,.heic,.heif" hidden onChange={(e) => pickFile(e.target.files?.[0] ?? null)} />
          <button
            type="button" onClick={() => fileRef.current?.click()}
            className="flex items-center gap-1.5 rounded-lg border border-dashed border-slate-300 px-3 py-2 text-sm text-slate-600 hover:bg-slate-50"
          >
            <ImagePlus size={15} />
            {processing ? 'מעבד תמונה...' : file || task?.image_url ? 'החלף את התמונה' : 'צרף תמונה'}
          </button>
          {(file || task?.image_url) && !processing && (
            <img
              src={file ? URL.createObjectURL(file) : task!.image_url!}
              alt="תצוגה מקדימה"
              className="h-16 w-16 rounded-lg border border-slate-200 object-cover"
            />
          )}
        </div>
        <DialogButtons busy={busy} onCancel={onClose} submitLabel={task ? 'שמור שינויים' : 'צור משימה'} />
      </form>
    </Modal>
  )
}

const FREQUENCIES: { days: number; label: string }[] = [
  { days: 7, label: 'כל שבוע' },
  { days: 14, label: 'כל שבועיים' },
  { days: 30, label: 'כל חודש' },
  { days: 90, label: 'כל 3 חודשים' },
  { days: 180, label: 'כל חצי שנה' },
  { days: 365, label: 'כל שנה' },
]

const freqLabel = (days: number) =>
  FREQUENCIES.find((f) => f.days === days)?.label ?? `כל ${days} ימים`

function RecurringModal({ onClose }: { onClose: () => void }) {
  const { businesses, bizName, people } = useOrg()
  const defaultBiz = businesses.find((b) => b.name === 'פסאו')?.id ?? businesses.find((b) => b.active)?.id ?? ''
  const [items, setItems] = useState<RecurringTask[]>([])
  const [adding, setAdding] = useState(false)
  const [title, setTitle] = useState('')
  const [bizId, setBizId] = useState(defaultBiz)
  const [assigneeId, setAssigneeId] = useState('')
  const [intervalDays, setIntervalDays] = useState(30)
  const [firstDue, setFirstDue] = useState('')
  const [busy, setBusy] = useState(false)

  async function load() {
    const { data } = await supabase.from('recurring_tasks').select('*').order('next_due')
    setItems((data as RecurringTask[]) ?? [])
  }

  useEffect(() => {
    load()
  }, [])

  async function add(e: React.FormEvent) {
    e.preventDefault()
    setBusy(true)
    await supabase.from('recurring_tasks').insert({
      title: title.trim(),
      branch: bizName(bizId, 'פסאו'),
      business_id: bizId || null,
      ...resolveAssignee(assigneeId, people, null),
      interval_days: intervalDays,
      next_due: firstDue,
    })
    setBusy(false)
    setAdding(false)
    setTitle('')
    setAssigneeId('')
    setFirstDue('')
    load()
  }

  async function toggleActive(r: RecurringTask) {
    await supabase.from('recurring_tasks').update({ active: !r.active }).eq('id', r.id)
    load()
  }

  async function remove(r: RecurringTask) {
    if (!confirm(`למחוק את המשימה החוזרת "${r.title}"?`)) return
    await supabase.from('recurring_tasks').delete().eq('id', r.id)
    load()
  }

  return (
    <Modal title="משימות חוזרות 🔁" onClose={onClose}>
      <p className="mb-3 text-xs text-slate-500">
        משימות שנוצרות אוטומטית כל תקופה — למשל ניקוי מנדפים חודשי. המשימה נכנסת לרשימה בבוקר של יום היעד.
      </p>

      {items.length === 0 && !adding && (
        <p className="mb-3 rounded-xl border border-dashed border-slate-300 py-6 text-center text-sm text-slate-400">
          אין משימות חוזרות עדיין
        </p>
      )}

      <div className="mb-3 space-y-2">
        {items.map((r) => (
          <div key={r.id} className={`rounded-xl border border-slate-200 p-3 ${r.active ? 'bg-white' : 'bg-slate-50 opacity-70'}`}>
            <div className="flex items-start justify-between gap-2">
              <div className="min-w-0">
                <div className="flex flex-wrap items-center gap-1.5">
                  <span className="text-sm font-medium text-slate-900">{r.title}</span>
                  <BranchBadge name={bizName(r.business_id, r.branch)} />
                </div>
                <p className="mt-0.5 text-xs text-slate-500">
                  {freqLabel(r.interval_days)} · {r.active ? `הבאה: ${new Date(r.next_due).toLocaleDateString('he-IL')}` : 'מושהית'}
                  {r.assignee_name && ` · באחריות ${r.assignee_name}`}
                </p>
              </div>
              <div className="flex shrink-0 gap-1">
                <button onClick={() => toggleActive(r)} title={r.active ? 'השהה' : 'הפעל'} className="rounded-lg p-1.5 text-slate-400 hover:bg-slate-100 hover:text-slate-700">
                  {r.active ? <Pause size={14} /> : <Play size={14} />}
                </button>
                <button onClick={() => remove(r)} title="מחק" className="rounded-lg p-1.5 text-slate-400 hover:bg-red-50 hover:text-red-600">
                  <Trash2 size={14} />
                </button>
              </div>
            </div>
          </div>
        ))}
      </div>

      {adding ? (
        <form onSubmit={add} className="space-y-3 rounded-xl border border-emerald-200 bg-emerald-50/40 p-3">
          <input required autoFocus value={title} onChange={(e) => setTitle(e.target.value)} placeholder="מה המשימה? (ניקוי מנדפים...)" className={inputCls} />
          <BranchSelect value={bizId} onChange={setBizId} />
          <div className="grid grid-cols-2 gap-3">
            <label className="block text-sm">
              <span className="mb-1 block text-slate-600">תדירות</span>
              <select value={intervalDays} onChange={(e) => setIntervalDays(Number(e.target.value))} className={inputCls}>
                {FREQUENCIES.map((f) => (
                  <option key={f.days} value={f.days}>{f.label}</option>
                ))}
              </select>
            </label>
            <label className="block text-sm">
              <span className="mb-1 block text-slate-600">תאריך ראשון</span>
              <input type="date" required value={firstDue} onChange={(e) => setFirstDue(e.target.value)} className={inputCls} />
            </label>
          </div>
          <AssigneeSelect value={assigneeId} onChange={setAssigneeId} />
          <DialogButtons busy={busy} onCancel={() => setAdding(false)} submitLabel="הוסף" />
        </form>
      ) : (
        <button
          onClick={() => setAdding(true)}
          className="flex w-full items-center justify-center gap-1.5 rounded-lg border border-dashed border-emerald-300 py-2 text-sm font-medium text-emerald-700 hover:bg-emerald-50"
        >
          <Plus size={15} />
          הוסף משימה חוזרת
        </button>
      )}
    </Modal>
  )
}
