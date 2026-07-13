import { format } from 'date-fns'
import { Clock } from 'lucide-react'
import { ITEM_STATUSES, type AdminTask } from '../lib/supabase'
import { useOrg } from '../lib/org'
import { BranchBadge, priorityBar } from '../pages/Faults'

export default function KanbanView({
  tasks, onOpen, onStatusChange,
}: {
  tasks: AdminTask[]
  onOpen: (t: AdminTask) => void
  onStatusChange: (id: string, status: string) => void
}) {
  const { bizName } = useOrg()
  const cols = ITEM_STATUSES.filter((s) => s.value !== 'cancelled')

  return (
    <div className="-mx-4 flex gap-3 overflow-x-auto px-4 pb-3">
      {cols.map((col) => {
        const items = tasks.filter((t) => t.status === col.value)
        return (
          <div
            key={col.value}
            className="w-60 shrink-0 rounded-2xl bg-slate-100/80 p-2"
            onDragOver={(e) => e.preventDefault()}
            onDrop={(e) => {
              e.preventDefault()
              const id = e.dataTransfer.getData('text/plain')
              if (id) onStatusChange(id, col.value)
            }}
          >
            <div className="mb-2 flex items-center justify-between px-1">
              <span className={`rounded-full px-2 py-0.5 text-xs font-medium ${col.cls}`}>{col.label}</span>
              <span className="text-xs text-slate-400 ltr-num">{items.length}</span>
            </div>
            <div className="min-h-16 space-y-2">
              {items.map((t) => (
                <div
                  key={t.id}
                  draggable
                  onDragStart={(e) => e.dataTransfer.setData('text/plain', t.id)}
                  onClick={() => onOpen(t)}
                  className={`cursor-pointer rounded-xl border border-slate-200/80 border-s-4 ${t.status === 'done' ? 'border-s-emerald-300' : (priorityBar[t.priority] ?? priorityBar.medium)} bg-white p-3 shadow-sm transition-shadow hover:shadow-md`}
                >
                  <p className={`text-sm font-medium text-slate-900 ${t.status === 'done' ? 'line-through opacity-60' : ''}`}>
                    {t.title}
                  </p>
                  <div className="mt-1.5 flex flex-wrap items-center gap-1.5">
                    <BranchBadge name={bizName(t.business_id, t.branch)} />
                    {t.priority === 'high' && (
                      <span className="rounded-full bg-red-100 px-2 py-0.5 text-[11px] font-medium text-red-700">דחוף</span>
                    )}
                  </div>
                  <div className="mt-1.5 flex flex-wrap gap-x-3 text-[11px] text-slate-400">
                    {t.assignee_name && <span>{t.assignee_name}</span>}
                    {t.deadline && (
                      <span className="flex items-center gap-0.5">
                        <Clock size={10} />
                        {format(new Date(t.deadline), 'd.M')}
                      </span>
                    )}
                  </div>
                </div>
              ))}
            </div>
          </div>
        )
      })}
    </div>
  )
}
