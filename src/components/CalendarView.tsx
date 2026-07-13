import { useState } from 'react'
import { format, startOfMonth, addMonths, isSameDay } from 'date-fns'
import { he } from 'date-fns/locale'
import { ChevronRight, ChevronLeft } from 'lucide-react'
import { isOpenStatus, type AdminTask } from '../lib/supabase'

const DAY_NAMES = ['א', 'ב', 'ג', 'ד', 'ה', 'ו', 'ש']

export default function CalendarView({
  tasks, onOpen,
}: { tasks: AdminTask[]; onOpen: (t: AdminTask) => void }) {
  const [month, setMonth] = useState(() => startOfMonth(new Date()))
  const today = new Date()

  const first = startOfMonth(month)
  const offset = first.getDay() // 0 = Sunday, week starts Sunday in IL
  const cells: (Date | null)[] = []
  for (let i = 0; i < offset; i++) cells.push(null)
  const daysInMonth = new Date(month.getFullYear(), month.getMonth() + 1, 0).getDate()
  for (let d = 1; d <= daysInMonth; d++) cells.push(new Date(month.getFullYear(), month.getMonth(), d))

  const withDeadline = tasks.filter((t) => t.deadline)
  const itemsOn = (day: Date) => withDeadline.filter((t) => isSameDay(new Date(t.deadline!), day))
  const noDeadline = tasks.filter((t) => !t.deadline && isOpenStatus(t.status)).length

  return (
    <div className="rounded-2xl border border-white/10 bg-slate-900/60 p-3">
      <div className="mb-3 flex items-center justify-between">
        <button onClick={() => setMonth(addMonths(month, -1))} className="rounded-lg p-1.5 text-slate-500 hover:bg-white/10">
          <ChevronRight size={18} />
        </button>
        <span className="font-bold text-slate-200">{format(month, 'MMMM yyyy', { locale: he })}</span>
        <button onClick={() => setMonth(addMonths(month, 1))} className="rounded-lg p-1.5 text-slate-500 hover:bg-white/10">
          <ChevronLeft size={18} />
        </button>
      </div>

      <div className="grid grid-cols-7 gap-1 text-center text-xs font-medium text-slate-400">
        {DAY_NAMES.map((d) => (
          <div key={d} className="py-1">{d}</div>
        ))}
      </div>
      <div className="grid grid-cols-7 gap-1">
        {cells.map((day, i) => (
          <div
            key={i}
            className={`min-h-16 rounded-lg border p-1 ${
              day && isSameDay(day, today) ? 'border-emerald-400 bg-emerald-500/10' : 'border-white/5'
            } ${day ? '' : 'border-transparent'}`}
          >
            {day && (
              <>
                <div className="text-end text-[11px] text-slate-400 ltr-num">{day.getDate()}</div>
                <div className="space-y-0.5">
                  {itemsOn(day).slice(0, 3).map((t) => {
                    const late = isOpenStatus(t.status) && new Date(t.deadline!) < today
                    return (
                      <button
                        key={t.id}
                        onClick={() => onOpen(t)}
                        className={`block w-full truncate rounded px-1 py-0.5 text-start text-[10px] leading-tight ${
                          t.status === 'done'
                            ? 'bg-white/10 text-slate-400 line-through'
                            : late
                              ? 'bg-red-500/15 text-red-300'
                              : 'bg-emerald-500/15 text-emerald-300'
                        }`}
                        title={t.title}
                      >
                        {t.title}
                      </button>
                    )
                  })}
                  {itemsOn(day).length > 3 && (
                    <span className="block px-1 text-[10px] text-slate-400">+{itemsOn(day).length - 3} נוספות</span>
                  )}
                </div>
              </>
            )}
          </div>
        ))}
      </div>
      {noDeadline > 0 && (
        <p className="mt-2 text-center text-[11px] text-slate-400">
          {noDeadline} משימות פתוחות ללא דד-ליין לא מוצגות בלוח
        </p>
      )}
    </div>
  )
}
