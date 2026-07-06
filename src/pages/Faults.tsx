import { useEffect, useRef, useState } from 'react'
import { format } from 'date-fns'
import { he } from 'date-fns/locale'
import {
  Plus, Phone, CheckCircle2, Clock, AlertTriangle, ImagePlus, X, History, ShieldCheck, Pencil,
} from 'lucide-react'
import { supabase, BRANCHES, branchColors, type Task, type Vendor } from '../lib/supabase'

const priorityLabels: Record<string, { label: string; cls: string }> = {
  high: { label: 'דחוף', cls: 'bg-red-100 text-red-700' },
  medium: { label: 'רגיל', cls: 'bg-amber-100 text-amber-700' },
  low: { label: 'נמוך', cls: 'bg-slate-100 text-slate-600' },
}

export default function FaultsPage() {
  const [tasks, setTasks] = useState<Task[]>([])
  const [vendors, setVendors] = useState<Vendor[]>([])
  const [branchFilter, setBranchFilter] = useState<string>('הכל')
  const [showDone, setShowDone] = useState(false)
  const [reportOpen, setReportOpen] = useState(false)
  const [editing, setEditing] = useState<Task | null>(null)
  const [closing, setClosing] = useState<Task | null>(null)
  const [toast, setToast] = useState<string | null>(null)

  function notify(msg: string) {
    setToast(msg)
    setTimeout(() => setToast(null), 2500)
  }

  async function load() {
    const [t, v] = await Promise.all([
      supabase.from('tasks').select('*').order('created_at', { ascending: false }),
      supabase.from('vendors').select('*').order('profession'),
    ])
    setTasks((t.data as Task[]) ?? [])
    setVendors((v.data as Vendor[]) ?? [])
  }

  useEffect(() => {
    load()
  }, [])

  const filtered = branchFilter === 'הכל' ? tasks : tasks.filter((t) => t.branch === branchFilter)
  const open = filtered.filter((t) => t.status === 'open')
  const done = filtered.filter((t) => t.status === 'done')
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

      <BranchFilter value={branchFilter} onChange={setBranchFilter} counts={tasks.filter((t) => t.status === 'open')} />

      {open.length === 0 ? (
        <div className="rounded-2xl border border-dashed border-slate-300 bg-white py-12 text-center text-slate-500">
          אין תקלות פתוחות 🎉
        </div>
      ) : (
        <div className="space-y-3">
          {open.map((t) => (
            <FaultCard key={t.id} task={t} vendors={vendors} onClose={() => setClosing(t)} onEdit={() => setEditing(t)} />
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
                    <BranchBadge branch={t.branch} />
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
  task, vendors, onClose, onEdit,
}: { task: Task; vendors: Vendor[]; onClose: () => void; onEdit: () => void }) {
  const vendor = vendors.find((v) => v.id === task.vendor_id)
  const overdue = task.due_date && new Date(task.due_date) < new Date()
  const pr = priorityLabels[task.priority] ?? priorityLabels.medium

  return (
    <div className="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm">
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0">
          <div className="flex flex-wrap items-center gap-2">
            <h3 className="font-semibold text-slate-900">{task.title}</h3>
            <BranchBadge branch={task.branch} />
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
  const [title, setTitle] = useState(task?.title ?? '')
  const [description, setDescription] = useState(task?.description ?? '')
  const [branch, setBranch] = useState(task?.branch ?? 'פסאו')
  const [priority, setPriority] = useState<string>(task?.priority ?? 'medium')
  const [dueDate, setDueDate] = useState(task?.due_date ? task.due_date.slice(0, 10) : '')
  const [vendorId, setVendorId] = useState(task?.vendor_id ?? '')
  const [assignee, setAssignee] = useState(task?.assignee_name ?? '')
  const [file, setFile] = useState<File | null>(null)
  const [busy, setBusy] = useState(false)
  const fileRef = useRef<HTMLInputElement>(null)

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
      branch,
      due_date: dueDate ? new Date(dueDate).toISOString() : null,
      vendor_id: vendorId || null,
      assignee_name: assignee.trim() || null,
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
        <BranchSelect value={branch} onChange={setBranch} />
        <input
          required autoFocus value={title} onChange={(e) => setTitle(e.target.value)}
          placeholder="מה התקלה?" className={inputCls}
        />
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
          <label className="block text-sm">
            <span className="mb-1 block text-slate-600">אחראי על ביצוע</span>
            <input value={assignee} onChange={(e) => setAssignee(e.target.value)} className={inputCls} />
          </label>
        </div>
        <div>
          <input ref={fileRef} type="file" accept="image/*" hidden onChange={(e) => setFile(e.target.files?.[0] ?? null)} />
          <button
            type="button" onClick={() => fileRef.current?.click()}
            className="flex items-center gap-1.5 rounded-lg border border-dashed border-slate-300 px-3 py-2 text-sm text-slate-600 hover:bg-slate-50"
          >
            <ImagePlus size={15} />
            {file ? file.name : task?.issue_image_url ? 'החלף את תמונת התקלה' : 'צרף תמונה של התקלה'}
          </button>
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

export function BranchBadge({ branch }: { branch: string }) {
  return (
    <span className={`rounded-full px-2 py-0.5 text-xs font-medium ${branchColors[branch] ?? 'bg-slate-100 text-slate-600'}`}>
      {branch}
    </span>
  )
}

export function BranchFilter({
  value, onChange, counts,
}: { value: string; onChange: (b: string) => void; counts: { branch: string }[] }) {
  return (
    <div className="flex flex-wrap gap-1.5">
      {['הכל', ...BRANCHES].map((b) => {
        const n = b === 'הכל' ? counts.length : counts.filter((t) => t.branch === b).length
        const active = value === b
        return (
          <button
            key={b}
            onClick={() => onChange(b)}
            className={`rounded-full px-3.5 py-1.5 text-sm font-medium transition-colors ${
              active
                ? 'bg-slate-900 text-white'
                : 'border border-slate-200 bg-white text-slate-600 hover:bg-slate-50'
            }`}
          >
            {b}
            {n > 0 && <span className="ms-1.5 text-xs opacity-70 ltr-num">{n}</span>}
          </button>
        )
      })}
    </div>
  )
}

export function BranchSelect({ value, onChange }: { value: string; onChange: (b: string) => void }) {
  return (
    <label className="block text-sm">
      <span className="mb-1 block text-slate-600">סניף</span>
      <div className="grid grid-cols-3 gap-2">
        {BRANCHES.map((b) => (
          <button
            key={b}
            type="button"
            onClick={() => onChange(b)}
            className={`rounded-lg border py-2 text-sm font-medium transition-colors ${
              value === b
                ? 'border-emerald-600 bg-emerald-50 text-emerald-700'
                : 'border-slate-200 bg-white text-slate-600 hover:bg-slate-50'
            }`}
          >
            {b}
          </button>
        ))}
      </div>
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
