import { useEffect, useState } from 'react'
import { format } from 'date-fns'
import { he } from 'date-fns/locale'
import { Plus, CheckCircle2, Circle, Clock, Pencil } from 'lucide-react'
import { supabase, type AdminTask } from '../lib/supabase'
import { Modal, DialogButtons, inputCls, BranchBadge, BranchFilter, BranchSelect } from './Faults'

export default function TasksPage() {
  const [tasks, setTasks] = useState<AdminTask[]>([])
  const [branchFilter, setBranchFilter] = useState<string>('הכל')
  const [addOpen, setAddOpen] = useState(false)
  const [editing, setEditing] = useState<AdminTask | null>(null)

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

  const filtered = branchFilter === 'הכל' ? tasks : tasks.filter((t) => t.branch === branchFilter)
  const open = filtered.filter((t) => t.status === 'open')
  const done = filtered.filter((t) => t.status === 'done')

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-xl font-bold text-slate-900">משימות</h2>
          <p className="text-sm text-slate-500">{open.length} פתוחות · {done.length} הושלמו</p>
        </div>
        <button
          onClick={() => setAddOpen(true)}
          className="flex shrink-0 items-center gap-1.5 whitespace-nowrap rounded-lg bg-emerald-600 px-4 py-2 text-sm font-semibold text-white hover:bg-emerald-700"
        >
          <Plus size={16} />
          משימה חדשה
        </button>
      </div>

      <BranchFilter value={branchFilter} onChange={setBranchFilter} counts={tasks.filter((t) => t.status === 'open')} />

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
                    <BranchBadge branch={t.branch} />
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
    </div>
  )
}

function TaskDialog({
  task, onClose, onSaved,
}: { task: AdminTask | null; onClose: () => void; onSaved: () => void }) {
  const [title, setTitle] = useState(task?.title ?? '')
  const [description, setDescription] = useState(task?.description ?? '')
  const [branch, setBranch] = useState(task?.branch ?? 'פסאו')
  const [assignee, setAssignee] = useState(task?.assignee_name ?? '')
  const [deadline, setDeadline] = useState(task?.deadline ? task.deadline.slice(0, 10) : '')
  const [priority, setPriority] = useState<string>(task?.priority ?? 'medium')
  const [busy, setBusy] = useState(false)

  async function save(e: React.FormEvent) {
    e.preventDefault()
    setBusy(true)
    const payload = {
      title: title.trim(),
      description: description.trim() || null,
      branch,
      assignee_name: assignee.trim() || null,
      deadline: deadline ? new Date(deadline).toISOString() : null,
      priority,
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
        <BranchSelect value={branch} onChange={setBranch} />
        <input required autoFocus value={title} onChange={(e) => setTitle(e.target.value)} placeholder="מה צריך לעשות?" className={inputCls} />
        <textarea value={description} onChange={(e) => setDescription(e.target.value)} placeholder="הוסף פרטים נוספים..." rows={2} className={inputCls} />
        <div className="grid grid-cols-2 gap-3">
          <label className="block text-sm">
            <span className="mb-1 block text-slate-600">באחריות</span>
            <input value={assignee} onChange={(e) => setAssignee(e.target.value)} className={inputCls} />
          </label>
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
        <DialogButtons busy={busy} onCancel={onClose} submitLabel={task ? 'שמור שינויים' : 'צור משימה'} />
      </form>
    </Modal>
  )
}
