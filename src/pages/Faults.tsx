import { useEffect, useRef, useState } from 'react'
import { format } from 'date-fns'
import { he } from 'date-fns/locale'
import {
  Plus, Phone, CheckCircle2, Clock, AlertTriangle, ImagePlus, X, History, ShieldCheck, Pencil,
} from 'lucide-react'
import { supabase, badgeColorFor, isOpenStatus, statusLabel, statusCls, type Task, type Vendor } from '../lib/supabase'
import ItemDetail from '../components/ItemDetail'
import { prepareImage } from '../lib/images'
import { useOrg } from '../lib/org'

const priorityLabels: Record<string, { label: string; cls: string }> = {
  high: { label: 'דחוף', cls: 'bg-red-100 text-red-700' },
  medium: { label: 'רגיל', cls: 'bg-amber-100 text-amber-700' },
  low: { label: 'נמוך', cls: 'bg-slate-100 text-slate-600' },
}

export default function FaultsPage() {
  const { bizName } = useOrg()
  const [tasks, setTasks] = useState<Task[]>([])
  const [vendors, setVendors] = useState<Vendor[]>([])
  const [branchFilter, setBranchFilter] = useState<string>('הכל')
  const [showDone, setShowDone] = useState(false)
  const [reportOpen, setReportOpen] = useState(false)
  const [editing, setEditing] = useState<Task | null>(null)
  const [closing, setClosing] = useState<Task | null>(null)
  const [detail, setDetail] = useState<Task | null>(null)
  const [toast, setToast] = useState<string | null>(null)

  function notify(msg: string) {
    setToast(msg)
    setTimeout(() => setToast(null), 2500)
  }

  async function load() {
    const [t, v] = await Promise.all([
      supabase.from('tasks').select('*').is('deleted_at', null).order('created_at', { ascending: false }),
      supabase.from('vendors').select('*').order('profession'),
    ])
    setTasks((t.data as Task[]) ?? [])
    setVendors((v.data as Vendor[]) ?? [])
  }

  useEffect(() => {
    load()
  }, [])

  const filtered = branchFilter === 'הכל' ? tasks : tasks.filter((t) => t.business_id === branchFilter)
  const open = filtered.filter((t) => isOpenStatus(t.status))
  const done = filtered.filter((t) => !isOpenStatus(t.status))
  const totalCost = done.reduce((s, t) => s + (t.cost ?? 0), 0)

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-xl font-bold text-slate-900">תקלות</h2>
          <p className="text-sm text-slate-500">
            {open.length} פתוחות · סה"כ עלויות תיקון: <span className="ltr-num">₪{totalCost.toLocaleString()}</span>
          </p>
        </div>
        <button
          onClick={() => setReportOpen(true)}
          className="flex shrink-0 items-center gap-1.5 whitespace-nowrap rounded-lg bg-emerald-600 px-4 py-2 text-sm font-semibold text-white hover:bg-emerald-700"
        >
          <Plus size={16} />
          דיווח על תקלה
        </button>
      </div>

      <BranchFilter value={branchFilter} onChange={setBranchFilter} counts={tasks.filter((t) => isOpenStatus(t.status))} />

      {open.length === 0 ? (
        <div className="rounded-2xl border border-dashed border-slate-300 bg-white py-12 text-center text-slate-500">
          אין תקלות פתוחות 🎉
        </div>
      ) : (
        <div className="space-y-3">
          {open.map((t) => (
            <FaultCard key={t.id} task={t} vendors={vendors} onClose={() => setClosing(t)} onEdit={() => setEditing(t)} onOpen={() => setDetail(t)} />
          ))}
        </div>
      )}

      <button
        onClick={() => setShowDone(!showDone)}
        className="flex items-center gap-1.5 text-sm font-medium text-slate-500 hover:text-slate-800"
      >
        <History size={15} />
        {showDone ? 'הסתר היסטוריית טיפולים' : `היסטוריית טיפולים (${done.length})`}
      </button>

      {showDone &&
        (done.length === 0 ? (
          <p className="text-sm text-slate-400">אין היסטוריית טיפולים עדיין</p>
        ) : (
          <div className="space-y-2 opacity-80">
            {done.map((t) => (
              <div key={t.id} className="rounded-xl border border-slate-200 bg-white p-4">
                <div className="flex items-center justify-between gap-2">
                  <div className="flex items-center gap-2">
                    <CheckCircle2 size={16} className="text-emerald-600" />
                    <span className="font-medium text-slate-700 line-through">{t.title}</span>
                    <BranchBadge name={bizName(t.business_id, t.branch)} />
                  </div>
                  <span className="text-sm text-slate-500 ltr-num">₪{(t.cost ?? 0).toLocaleString()}</span>
                </div>
                {t.warranty_until && (
                  new Date(t.warranty_until) >= new Date(new Date().toDateString()) ? (
                    <span className="mt-1 inline-flex items-center gap-1 rounded-full bg-emerald-50 px-2 py-0.5 text-xs font-medium text-emerald-700">
                      <ShieldCheck size={12} />
                      אחריות עד {format(new Date(t.warranty_until), 'd בMMMM yyyy', { locale: he })}
                    </span>
                  ) : (
                    <span className="mt-1 inline-flex items-center gap-1 rounded-full bg-slate-100 px-2 py-0.5 text-xs font-medium text-slate-500">
                      <ShieldCheck size={12} />
                      האחריות הסתיימה
                    </span>
                  )
                )}
                {t.resolution_notes && <p className="mt-1 text-sm text-slate-500">{t.resolution_notes}</p>}
                {t.completed_at && (
                  <p className="mt-1 text-xs text-slate-400">
                    נסגרה ב־{format(new Date(t.completed_at), 'd בMMMM yyyy', { locale: he })}
                  </p>
                )}
              </div>
            ))}
          </div>
        ))}

      {(reportOpen || editing) && (
        <ReportDialog
          task={editing}
          vendors={vendors}
          onClose={() => { setReportOpen(false); setEditing(null) }}
          onSaved={() => {
            const wasEdit = !!editing
            setReportOpen(false)
            setEditing(null)
            notify(wasEdit ? 'התקלה עודכנה בהצלחה!' : 'המשימה נוצרה בהצלחה!')
            load()
          }}
        />
      )}

      {detail && (
        <ItemDetail
          kind="fault"
          item={detail}
          onClose={() => setDetail(null)}
          onChanged={load}
        />
      )}

      {closing && (
        <CloseDialog
          task={closing}
          onClose={() => setClosing(null)}
          onSaved={() => {
            setClosing(null)
            notify('הקריאה נסגרה בהצלחה!')
            load()
          }}
        />
      )}

      {toast && (
        <div className="fixed bottom-6 start-1/2 z-50 -translate-x-1/2 rtl:translate-x-1/2 rounded-full bg-slate-900 px-5 py-2.5 text-sm text-white shadow-lg">
          {toast}
        </div>
      )}
    </div>
  )
}

function FaultCard({
  task, vendors, onClose, onEdit, onOpen,
}: { task: Task; vendors: Vendor[]; onClose: () => void; onEdit: () => void; onOpen: () => void }) {
  const { bizName, areaName } = useOrg()
  const vendor = vendors.find((v) => v.id === task.vendor_id)
  const overdue = task.due_date && new Date(task.due_date) < new Date()
  const pr = priorityLabels[task.priority] ?? priorityLabels.medium

  return (
    <div className="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm">
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0">
          <div className="flex flex-wrap items-center gap-2">
            <h3 onClick={onOpen} className="cursor-pointer font-semibold text-slate-900 hover:underline">{task.title}</h3>
            <BranchBadge name={bizName(task.business_id, task.branch)} />
            <AreaBadge name={areaName(task.area_id)} />
            {task.status !== 'open' && (
              <span className={`rounded-full px-2 py-0.5 text-xs font-medium ${statusCls(task.status)}`}>{statusLabel(task.status)}</span>
            )}
            <span className={`rounded-full px-2 py-0.5 text-xs font-medium ${pr.cls}`}>{pr.label}</span>
            {overdue && (
              <span className="flex items-center gap-1 rounded-full bg-red-100 px-2 py-0.5 text-xs font-medium text-red-700">
                <AlertTriangle size={12} />
                באיחור
              </span>
            )}
          </div>
          {task.description && <p className="mt-1 text-sm text-slate-600">{task.description}</p>}
          <div className="mt-2 flex flex-wrap items-center gap-x-4 gap-y-1 text-xs text-slate-500">
            {task.due_date && (
              <span className="flex items-center gap-1">
                <Clock size={12} />
                דד-ליין: {format(new Date(task.due_date), 'd בMMMM', { locale: he })}
              </span>
            )}
            {task.assignee_name && <span>אחראי על ביצוע: {task.assignee_name}</span>}
            {vendor && (
              <span className="flex items-center gap-1.5">
                {vendor.profession}
                {vendor.name ? ` — ${vendor.name}` : ''}
                {vendor.phone && (
                  <a
                    href={`tel:${vendor.phone}`}
                    className="flex items-center gap-1 rounded-full bg-emerald-50 px-2 py-0.5 font-medium text-emerald-700 hover:bg-emerald-100"
                  >
                    <Phone size={11} />
                    התקשר עכשיו
                  </a>
                )}
              </span>
            )}
          </div>
        </div>
        {task.issue_image_url && (
          <a href={task.issue_image_url} target="_blank" rel="noreferrer" className="shrink-0">
            <img src={task.issue_image_url} alt="" className="h-16 w-16 rounded-lg object-cover" />
          </a>
        )}
      </div>
      <div className="mt-3 flex items-center justify-between border-t border-slate-100 pt-3">
        <button
          onClick={onClose}
          className="flex items-center gap-1.5 rounded-lg bg-slate-900 px-3 py-1.5 text-sm font-medium text-white hover:bg-slate-700"
        >
          <CheckCircle2 size={15} />
          סגור קריאה
        </button>
        <button
          onClick={onEdit}
          className="flex items-center gap-1.5 rounded-lg px-3 py-1.5 text-sm text-slate-500 hover:bg-slate-100"
          title="ערוך תקלה"
        >
          <Pencil size={14} />
          ערוך
        </button>
      </div>
    </div>
  )
}

function ReportDialog({
  task, vendors, onClose, onSaved,
}: { task: Task | null; vendors: Vendor[]; onClose: () => void; onSaved: () => void }) {
  const { businesses, bizName, people } = useOrg()
  const defaultBiz = businesses.find((b) => b.name === 'פסאו')?.id ?? businesses.find((b) => b.active)?.id ?? ''
  const [title, setTitle] = useState(task?.title ?? '')
  const [description, setDescription] = useState(task?.description ?? '')
  const [bizId, setBizId] = useState(task?.business_id ?? defaultBiz)
  const [areaId, setAreaId] = useState(task?.area_id ?? '')
  const [priority, setPriority] = useState<string>(task?.priority ?? 'medium')
  const [dueDate, setDueDate] = useState(task?.due_date ? task.due_date.slice(0, 10) : '')
  const [vendorId, setVendorId] = useState(task?.vendor_id ?? '')
  const [assigneeId, setAssigneeId] = useState<string>(
    task?.assignee_user_id ?? (task?.assignee_name ? '__legacy' : '')
  )
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
    let imageUrl: string | null = task?.issue_image_url ?? null
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
      due_date: dueDate ? new Date(dueDate).toISOString() : null,
      vendor_id: vendorId || null,
      ...resolveAssignee(assigneeId, people, task),
      priority,
      issue_image_url: imageUrl,
    }
    if (task) {
      await supabase.from('tasks').update(payload).eq('id', task.id)
    } else {
      const { data: userData } = await supabase.auth.getUser()
      await supabase.from('tasks').insert({
        ...payload,
        status: 'open',
        created_by: userData.user?.id ?? null,
      })
    }
    setBusy(false)
    onSaved()
  }

  return (
    <Modal title={task ? `עריכת תקלה — ${task.title}` : 'דיווח על תקלה חדשה'} onClose={onClose}>
      <form onSubmit={save} className="space-y-3">
        <BranchSelect value={bizId} onChange={(id) => { setBizId(id); setAreaId('') }} />
        <input
          required autoFocus value={title} onChange={(e) => setTitle(e.target.value)}
          placeholder="מה התקלה?" className={inputCls}
        />
        <AreaSelect businessId={bizId} value={areaId} onChange={setAreaId} />
        <textarea
          value={description} onChange={(e) => setDescription(e.target.value)}
          placeholder="הוסף פרטים נוספים..." rows={2} className={inputCls}
        />
        <div className="grid grid-cols-2 gap-3">
          <label className="block text-sm">
            <span className="mb-1 block text-slate-600">דחיפות</span>
            <select value={priority} onChange={(e) => setPriority(e.target.value)} className={inputCls}>
              <option value="high">דחוף</option>
              <option value="medium">רגיל</option>
              <option value="low">נמוך</option>
            </select>
          </label>
          <label className="block text-sm">
            <span className="mb-1 block text-slate-600">דד-ליין לתיקון</span>
            <input type="date" value={dueDate} onChange={(e) => setDueDate(e.target.value)} className={inputCls} />
          </label>
        </div>
        <div className="grid grid-cols-2 gap-3">
          <label className="block text-sm">
            <span className="mb-1 block text-slate-600">איש מקצוע</span>
            <select value={vendorId} onChange={(e) => setVendorId(e.target.value)} className={inputCls}>
              <option value="">בחר איש מקצוע...</option>
              {vendors.map((v) => (
                <option key={v.id} value={v.id}>
                  {v.profession}
                  {v.name ? ` — ${v.name}` : ''}
                </option>
              ))}
            </select>
          </label>
          <AssigneeSelect value={assigneeId} legacyName={task?.assignee_name} onChange={setAssigneeId} />
        </div>
        <div className="flex items-center gap-3">
          <input ref={fileRef} type="file" accept="image/*,.heic,.heif" hidden onChange={(e) => pickFile(e.target.files?.[0] ?? null)} />
          <button
            type="button" onClick={() => fileRef.current?.click()}
            className="flex items-center gap-1.5 rounded-lg border border-dashed border-slate-300 px-3 py-2 text-sm text-slate-600 hover:bg-slate-50"
          >
            <ImagePlus size={15} />
            {processing ? 'מעבד תמונה...' : file || task?.issue_image_url ? 'החלף את התמונה' : 'צרף תמונה של התקלה'}
          </button>
          {(file || task?.issue_image_url) && !processing && (
            <img
              src={file ? URL.createObjectURL(file) : task!.issue_image_url!}
              alt="תצוגה מקדימה"
              className="h-16 w-16 rounded-lg border border-slate-200 object-cover"
            />
          )}
        </div>
        <DialogButtons busy={busy} onCancel={onClose} submitLabel={task ? 'שמור שינויים' : 'דווח'} />
      </form>
    </Modal>
  )
}

function CloseDialog({ task, onClose, onSaved }: { task: Task; onClose: () => void; onSaved: () => void }) {
  const [cost, setCost] = useState('')
  const [notes, setNotes] = useState('')
  const [hasWarranty, setHasWarranty] = useState(false)
  const [warrantyUntil, setWarrantyUntil] = useState('')
  const [busy, setBusy] = useState(false)

  async function save(e: React.FormEvent) {
    e.preventDefault()
    setBusy(true)
    const { data: userData } = await supabase.auth.getUser()
    const user = userData.user
    await supabase
      .from('tasks')
      .update({
        status: 'done',
        cost: parseFloat(cost) || 0,
        resolution_notes: notes.trim() || null,
        warranty_until: hasWarranty && warrantyUntil ? warrantyUntil : null,
        completed_at: new Date().toISOString(),
      })
      .eq('id', task.id)
    await supabase.from('task_history').insert({
      task_id: task.id,
      user_id: user?.id ?? null,
      user_name: (user?.user_metadata?.full_name as string) ?? user?.email ?? null,
      action: 'status_change',
      old_status: task.status,
      new_status: 'done',
    })
    setBusy(false)
    onSaved()
  }

  return (
    <Modal title={`סגירת קריאה — ${task.title}`} onClose={onClose}>
      <form onSubmit={save} className="space-y-3">
        <label className="block text-sm">
          <span className="mb-1 block text-slate-600">עלות תיקון (₪)</span>
          <input
            type="number" min="0" step="0.01" value={cost} onChange={(e) => setCost(e.target.value)}
            placeholder="הזן 0 אם ללא עלות" className={inputCls} dir="ltr"
          />
        </label>
        <label className="block text-sm">
          <span className="mb-1 block text-slate-600">הערות סיכום (רשות)</span>
          <textarea value={notes} onChange={(e) => setNotes(e.target.value)} rows={2} className={inputCls} />
        </label>
        <div className="rounded-xl border border-slate-200 bg-slate-50 p-3">
          <label className="flex cursor-pointer items-center gap-2 text-sm font-medium text-slate-700">
            <input
              type="checkbox"
              checked={hasWarranty}
              onChange={(e) => setHasWarranty(e.target.checked)}
              className="h-4 w-4 accent-emerald-600"
            />
            <ShieldCheck size={16} className="text-emerald-600" />
            קיבלתי אחריות על התיקון
          </label>
          {hasWarranty && (
            <label className="mt-2 block text-sm">
              <span className="mb-1 block text-slate-600">אחריות עד</span>
              <input
                type="date"
                required
                value={warrantyUntil}
                onChange={(e) => setWarrantyUntil(e.target.value)}
                className={inputCls}
              />
            </label>
          )}
        </div>
        <DialogButtons busy={busy} onCancel={onClose} submitLabel="סגור קריאה" />
      </form>
    </Modal>
  )
}

export function BranchBadge({ name, index = 0 }: { name: string; index?: number }) {
  if (!name) return null
  return (
    <span className={`rounded-full px-2 py-0.5 text-xs font-medium ${badgeColorFor(name, index)}`}>
      {name}
    </span>
  )
}

export function AreaBadge({ name }: { name: string }) {
  if (!name) return null
  return (
    <span className="rounded-full border border-slate-200 bg-white px-2 py-0.5 text-xs font-medium text-slate-500">
      {name}
    </span>
  )
}

export function BranchFilter({
  value, onChange, counts,
}: { value: string; onChange: (id: string) => void; counts: { business_id: string | null }[] }) {
  const { businesses } = useOrg()
  const options = businesses.filter((b) => b.active)
  return (
    <div className="flex flex-wrap gap-1.5">
      {[{ id: 'הכל', name: 'הכל' }, ...options].map((b) => {
        const n = b.id === 'הכל' ? counts.length : counts.filter((t) => t.business_id === b.id).length
        const active = value === b.id
        return (
          <button
            key={b.id}
            onClick={() => onChange(b.id)}
            className={`rounded-full px-3.5 py-1.5 text-sm font-medium transition-colors ${
              active
                ? 'bg-slate-900 text-white'
                : 'border border-slate-200 bg-white text-slate-600 hover:bg-slate-50'
            }`}
          >
            {b.name}
            {n > 0 && <span className="ms-1.5 text-xs opacity-70 ltr-num">{n}</span>}
          </button>
        )
      })}
    </div>
  )
}

export function BranchSelect({ value, onChange }: { value: string; onChange: (id: string) => void }) {
  const { businesses } = useOrg()
  const options = businesses.filter((b) => b.active)
  return (
    <label className="block text-sm">
      <span className="mb-1 block text-slate-600">עסק</span>
      <div className="flex flex-wrap gap-2">
        {options.map((b) => (
          <button
            key={b.id}
            type="button"
            onClick={() => onChange(b.id)}
            className={`min-w-[30%] flex-1 rounded-lg border py-2 text-sm font-medium transition-colors ${
              value === b.id
                ? 'border-emerald-600 bg-emerald-50 text-emerald-700'
                : 'border-slate-200 bg-white text-slate-600 hover:bg-slate-50'
            }`}
          >
            {b.name}
          </button>
        ))}
      </div>
    </label>
  )
}

// value: '' (none) | user_id | '__legacy' (keep the original free-text name)
export function AssigneeSelect({
  value, legacyName, onChange,
}: { value: string; legacyName?: string | null; onChange: (v: string) => void }) {
  const { people } = useOrg()
  return (
    <label className="block text-sm">
      <span className="mb-1 block text-slate-600">אחראי ראשי</span>
      <select value={value} onChange={(e) => onChange(e.target.value)} className={inputCls}>
        <option value="">ללא אחראי</option>
        {legacyName && !people.some((p) => p.full_name === legacyName) && (
          <option value="__legacy">{legacyName}</option>
        )}
        {people.map((p) => (
          <option key={p.user_id} value={p.user_id}>{p.full_name ?? '—'}</option>
        ))}
      </select>
    </label>
  )
}

export function resolveAssignee(
  value: string,
  people: { user_id: string; full_name: string | null }[],
  legacy?: { assignee_user_id: string | null; assignee_name: string | null } | null
) {
  if (value === '__legacy') {
    return { assignee_user_id: legacy?.assignee_user_id ?? null, assignee_name: legacy?.assignee_name ?? null }
  }
  if (!value) return { assignee_user_id: null, assignee_name: null }
  return { assignee_user_id: value, assignee_name: people.find((p) => p.user_id === value)?.full_name ?? null }
}

export function AreaSelect({
  businessId, value, onChange,
}: { businessId: string; value: string; onChange: (id: string) => void }) {
  const { areas } = useOrg()
  const options = areas.filter((a) => a.active && (!a.business_id || a.business_id === businessId))
  return (
    <label className="block text-sm">
      <span className="mb-1 block text-slate-600">אזור (רשות)</span>
      <select value={value} onChange={(e) => onChange(e.target.value)} className={inputCls}>
        <option value="">ללא אזור</option>
        {options.map((a) => (
          <option key={a.id} value={a.id}>{a.name}</option>
        ))}
      </select>
    </label>
  )
}

export function Modal({ title, onClose, children }: { title: string; onClose: () => void; children: React.ReactNode }) {
  return (
    <div className="fixed inset-0 z-40 flex items-center justify-center bg-slate-900/40 p-4" onClick={onClose}>
      <div
        className="max-h-[88vh] w-full max-w-md overflow-y-auto rounded-2xl bg-white p-5 shadow-xl"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="mb-4 flex items-center justify-between">
          <h3 className="font-bold text-slate-900">{title}</h3>
          <button onClick={onClose} className="rounded-lg p-1 text-slate-400 hover:bg-slate-100">
            <X size={18} />
          </button>
        </div>
        {children}
      </div>
    </div>
  )
}

export function DialogButtons({ busy, onCancel, submitLabel }: { busy: boolean; onCancel: () => void; submitLabel: string }) {
  return (
    <div className="flex justify-end gap-2 pt-2">
      <button type="button" onClick={onCancel} className="rounded-lg px-4 py-2 text-sm text-slate-600 hover:bg-slate-100">
        ביטול
      </button>
      <button
        disabled={busy}
        className="rounded-lg bg-emerald-600 px-4 py-2 text-sm font-semibold text-white hover:bg-emerald-700 disabled:opacity-50"
      >
        {busy ? 'שומר...' : submitLabel}
      </button>
    </div>
  )
}

export const inputCls =
  'w-full rounded-lg border border-slate-300 px-3 py-2 text-sm focus:border-emerald-500 focus:outline-none bg-white'
