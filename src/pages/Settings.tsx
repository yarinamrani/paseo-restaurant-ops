import { useState } from 'react'
import { Plus, Check, Pencil, Eye, EyeOff, Building2, MapPin } from 'lucide-react'
import { supabase } from '../lib/supabase'
import { useOrg } from '../lib/org'
import { inputCls } from './Faults'

export default function SettingsPage() {
  const { businesses, areas, reload } = useOrg()
  const [toast, setToast] = useState<string | null>(null)

  function notify(msg: string) {
    setToast(msg)
    setTimeout(() => setToast(null), 2500)
  }

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-xl font-bold text-slate-900">הגדרות</h2>
        <p className="text-sm text-slate-500">ניהול עסקים ואזורים — זמין למנהלי מערכת בלבד</p>
      </div>

      <ManagedList
        icon={<Building2 size={15} />}
        title="עסקים"
        hint="עסק מוסתר לא יופיע בטפסים ובסינון, אבל הנתונים שלו נשמרים"
        items={businesses.map((b) => ({ id: b.id, name: b.name, active: b.active }))}
        placeholder="שם עסק חדש (למשל: סניף חדש...)"
        table="businesses"
        nextSort={businesses.length + 1}
        onChanged={(msg) => { notify(msg); reload() }}
      />

      <ManagedList
        icon={<MapPin size={15} />}
        title="אזורים"
        hint="אזורים כלליים שזמינים בכל העסקים (מטבח, בר, מחסן...)"
        items={areas.filter((a) => !a.business_id).map((a) => ({ id: a.id, name: a.name, active: a.active }))}
        placeholder="שם אזור חדש..."
        table="areas"
        nextSort={areas.length + 1}
        onChanged={(msg) => { notify(msg); reload() }}
      />

      {toast && (
        <div className="fixed bottom-6 start-1/2 z-50 -translate-x-1/2 rtl:translate-x-1/2 rounded-full bg-slate-900 px-5 py-2.5 text-sm text-white shadow-lg">
          {toast}
        </div>
      )}
    </div>
  )
}

type Item = { id: string; name: string; active: boolean }

function ManagedList({
  icon, title, hint, items, placeholder, table, nextSort, onChanged,
}: {
  icon: React.ReactNode
  title: string
  hint: string
  items: Item[]
  placeholder: string
  table: 'businesses' | 'areas'
  nextSort: number
  onChanged: (msg: string) => void
}) {
  const [newName, setNewName] = useState('')
  const [editingId, setEditingId] = useState<string | null>(null)
  const [editName, setEditName] = useState('')
  const [busy, setBusy] = useState(false)

  async function add(e: React.FormEvent) {
    e.preventDefault()
    const name = newName.trim()
    if (!name) return
    setBusy(true)
    const { error } = await supabase.from(table).insert({ name, sort_order: nextSort })
    setBusy(false)
    if (error) {
      onChanged(error.code === '23505' ? 'השם כבר קיים' : 'אין הרשאה או שגיאה בשמירה')
      return
    }
    setNewName('')
    onChanged(`"${name}" נוסף בהצלחה`)
  }

  async function rename(item: Item) {
    const name = editName.trim()
    if (!name || name === item.name) {
      setEditingId(null)
      return
    }
    const { error } = await supabase.from(table).update({ name }).eq('id', item.id)
    if (!error && table === 'businesses') {
      // legacy text column follows the rename so old rows stay consistent
      await supabase.from('tasks').update({ branch: name }).eq('business_id', item.id)
      await supabase.from('admin_tasks').update({ branch: name }).eq('business_id', item.id)
      await supabase.from('recurring_tasks').update({ branch: name }).eq('business_id', item.id)
    }
    setEditingId(null)
    onChanged(error ? 'שגיאה בעדכון' : 'השם עודכן')
  }

  async function toggle(item: Item) {
    const { error } = await supabase.from(table).update({ active: !item.active }).eq('id', item.id)
    onChanged(error ? 'שגיאה בעדכון' : item.active ? `"${item.name}" הוסתר` : `"${item.name}" הופעל`)
  }

  return (
    <section className="rounded-2xl border border-slate-200 bg-white p-4">
      <h3 className="mb-1 flex items-center gap-1.5 text-sm font-bold text-slate-600">
        {icon}
        {title}
      </h3>
      <p className="mb-3 text-xs text-slate-400">{hint}</p>

      <div className="mb-3 space-y-1.5">
        {items.map((item) => (
          <div
            key={item.id}
            className={`flex items-center justify-between gap-2 rounded-xl border border-slate-100 px-3 py-2 ${item.active ? '' : 'opacity-50'}`}
          >
            {editingId === item.id ? (
              <input
                autoFocus
                value={editName}
                onChange={(e) => setEditName(e.target.value)}
                onKeyDown={(e) => e.key === 'Enter' && rename(item)}
                className={inputCls}
              />
            ) : (
              <span className="text-sm font-medium text-slate-800">
                {item.name}
                {!item.active && <span className="ms-2 text-xs text-slate-400">(מוסתר)</span>}
              </span>
            )}
            <div className="flex shrink-0 gap-1">
              {editingId === item.id ? (
                <button onClick={() => rename(item)} title="שמור" className="rounded-lg p-1.5 text-emerald-600 hover:bg-emerald-50">
                  <Check size={15} />
                </button>
              ) : (
                <button
                  onClick={() => { setEditingId(item.id); setEditName(item.name) }}
                  title="שנה שם"
                  className="rounded-lg p-1.5 text-slate-400 hover:bg-slate-100 hover:text-slate-700"
                >
                  <Pencil size={15} />
                </button>
              )}
              <button
                onClick={() => toggle(item)}
                title={item.active ? 'הסתר' : 'הפעל'}
                className="rounded-lg p-1.5 text-slate-400 hover:bg-slate-100 hover:text-slate-700"
              >
                {item.active ? <Eye size={15} /> : <EyeOff size={15} />}
              </button>
            </div>
          </div>
        ))}
      </div>

      <form onSubmit={add} className="flex gap-2">
        <input value={newName} onChange={(e) => setNewName(e.target.value)} placeholder={placeholder} className={inputCls} />
        <button
          disabled={busy || !newName.trim()}
          className="flex shrink-0 items-center gap-1 whitespace-nowrap rounded-lg bg-emerald-600 px-3 py-2 text-sm font-semibold text-white hover:bg-emerald-700 disabled:opacity-40"
        >
          <Plus size={15} />
          הוסף
        </button>
      </form>
    </section>
  )
}
