import { useEffect, useState } from 'react'
import { Plus, Phone, Copy, Star, Pencil, Trash2, UserPlus } from 'lucide-react'
import { supabase, type Vendor } from '../lib/supabase'
import { Modal, DialogButtons, inputCls } from './Faults'

export const CATEGORY_ORDER = [
  'מטבח וציוד',
  'תשתיות',
  'תחזוקה כללית',
  'חוץ וגג',
  'טכנולוגיה',
  'שירותים',
  'כללי',
]

export default function VendorsPage() {
  const [vendors, setVendors] = useState<Vendor[]>([])
  const [editing, setEditing] = useState<Vendor | null>(null)
  const [addOpen, setAddOpen] = useState(false)
  const [toast, setToast] = useState<string | null>(null)

  function notify(msg: string) {
    setToast(msg)
    setTimeout(() => setToast(null), 2500)
  }

  async function load() {
    const { data } = await supabase.from('vendors').select('*').order('profession')
    setVendors((data as Vendor[]) ?? [])
  }

  useEffect(() => {
    load()
  }, [])

  async function remove(v: Vendor) {
    if (!confirm(`האם אתה בטוח שברצונך למחוק את ${v.name || v.profession}?`)) return
    await supabase.from('vendors').delete().eq('id', v.id)
    notify('איש מקצוע נמחק בהצלחה!')
    load()
  }

  function copyPhone(phone: string) {
    navigator.clipboard.writeText(phone)
    notify('המספר הועתק!')
  }

  const withContact = vendors.filter((v) => v.phone).length
  const categories = CATEGORY_ORDER.filter((c) => vendors.some((v) => v.category === c))

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-xl font-bold text-slate-100">אנשי מקצוע</h2>
          <p className="text-sm text-slate-500">
            {vendors.length} מקצועות במאגר · {withContact} עם איש קשר
          </p>
        </div>
        <button
          onClick={() => setAddOpen(true)}
          className="flex shrink-0 items-center gap-1.5 whitespace-nowrap rounded-lg bg-gradient-to-l from-emerald-600 to-teal-600 px-4 py-2 text-sm font-semibold text-white shadow-md shadow-emerald-600/25 transition-all hover:from-emerald-500 hover:to-teal-500"
        >
          <Plus size={16} />
          הוסף מקצוע
        </button>
      </div>

      {vendors.length === 0 && (
        <div className="rounded-2xl border border-dashed border-white/15 bg-slate-900/60 py-12 text-center text-slate-500">
          אין אנשי מקצוע עדיין
        </div>
      )}

      {categories.map((cat) => (
        <section key={cat}>
          <h3 className="mb-2 text-sm font-bold text-slate-400">{cat}</h3>
          <div className="grid gap-3 sm:grid-cols-2">
            {vendors
              .filter((v) => v.category === cat)
              .map((v) => (
                <div key={v.id} className="rounded-2xl border border-white/10 bg-slate-900/60 p-4 shadow-sm">
                  <div className="flex items-start justify-between gap-2">
                    <div className="min-w-0">
                      <h4 className="font-semibold text-slate-100">{v.profession}</h4>
                      {v.name ? (
                        <p className="text-sm text-slate-400">{v.name}</p>
                      ) : (
                        <p className="text-sm text-slate-400">עדיין אין איש קשר</p>
                      )}
                    </div>
                    <div className="flex shrink-0 gap-1">
                      <button
                        onClick={() => setEditing(v)}
                        className="rounded-lg p-1.5 text-slate-400 hover:bg-white/10 hover:text-slate-300"
                      >
                        <Pencil size={15} />
                      </button>
                      <button
                        onClick={() => remove(v)}
                        className="rounded-lg p-1.5 text-slate-400 hover:bg-red-500/10 hover:text-red-400"
                      >
                        <Trash2 size={15} />
                      </button>
                    </div>
                  </div>

                  {v.name && (
                    <div className="mt-2 flex items-center gap-0.5">
                      {[1, 2, 3, 4, 5].map((n) => (
                        <Star
                          key={n}
                          size={15}
                          className={n <= v.rating ? 'fill-amber-400 text-amber-400' : 'text-slate-200'}
                        />
                      ))}
                    </div>
                  )}

                  <div className="mt-3">
                    {v.phone ? (
                      <div className="flex items-center gap-2">
                        <a
                          href={`tel:${v.phone}`}
                          className="flex flex-1 items-center justify-center gap-1.5 rounded-lg bg-emerald-600 py-2 text-sm font-semibold text-white hover:bg-emerald-700"
                        >
                          <Phone size={14} />
                          התקשר עכשיו
                        </a>
                        <button
                          onClick={() => copyPhone(v.phone!)}
                          title="העתק מספר"
                          className="flex items-center gap-1.5 rounded-lg border border-white/10 px-3 py-2 text-sm text-slate-400 hover:bg-white/5"
                        >
                          <Copy size={14} />
                          <span className="ltr-num">{v.phone}</span>
                        </button>
                      </div>
                    ) : (
                      <button
                        onClick={() => setEditing(v)}
                        className="flex w-full items-center justify-center gap-1.5 rounded-lg border border-dashed border-emerald-400/40 py-2 text-sm font-medium text-emerald-300 hover:bg-emerald-500/10"
                      >
                        <UserPlus size={14} />
                        הוסף איש קשר
                      </button>
                    )}
                  </div>
                </div>
              ))}
          </div>
        </section>
      ))}

      {(addOpen || editing) && (
        <VendorDialog
          vendor={editing}
          onClose={() => { setAddOpen(false); setEditing(null) }}
          onSaved={(isNew) => {
            setAddOpen(false)
            setEditing(null)
            notify(isNew ? 'איש מקצוע נוסף בהצלחה!' : 'איש מקצוע עודכן בהצלחה!')
            load()
          }}
        />
      )}

      {toast && (
        <div className="fixed bottom-6 start-1/2 z-50 -translate-x-1/2 rtl:translate-x-1/2 rounded-full border border-white/10 bg-slate-800 px-5 py-2.5 text-sm text-white shadow-xl">
          {toast}
        </div>
      )}
    </div>
  )
}

function VendorDialog({
  vendor, onClose, onSaved,
}: { vendor: Vendor | null; onClose: () => void; onSaved: (isNew: boolean) => void }) {
  const [profession, setProfession] = useState(vendor?.profession ?? '')
  const [category, setCategory] = useState(vendor?.category ?? 'כללי')
  const [name, setName] = useState(vendor?.name ?? '')
  const [phone, setPhone] = useState(vendor?.phone ?? '')
  const [rating, setRating] = useState(vendor?.rating ?? 3)
  const [busy, setBusy] = useState(false)

  async function save(e: React.FormEvent) {
    e.preventDefault()
    setBusy(true)
    const payload = {
      profession: profession.trim(),
      category,
      name: name.trim() || null,
      phone: phone.trim() || null,
      rating,
    }
    if (vendor) {
      await supabase.from('vendors').update(payload).eq('id', vendor.id)
    } else {
      await supabase.from('vendors').insert(payload)
    }
    setBusy(false)
    onSaved(!vendor)
  }

  return (
    <Modal title={vendor ? `עריכה — ${vendor.profession}` : 'מקצוע חדש'} onClose={onClose}>
      <form onSubmit={save} className="space-y-3">
        <input
          required value={profession} onChange={(e) => setProfession(e.target.value)}
          placeholder="מקצוע (חשמלאי, אינסטלטור...)" className={inputCls}
        />
        <label className="block text-sm">
          <span className="mb-1 block text-slate-400">קטגוריה</span>
          <select value={category} onChange={(e) => setCategory(e.target.value)} className={inputCls}>
            {CATEGORY_ORDER.map((c) => (
              <option key={c} value={c}>{c}</option>
            ))}
          </select>
        </label>
        <input
          autoFocus={!!vendor} value={name} onChange={(e) => setName(e.target.value)}
          placeholder="שם איש הקשר" className={inputCls}
        />
        <input
          value={phone} onChange={(e) => setPhone(e.target.value)}
          placeholder="טלפון" dir="ltr" className={`${inputCls} placeholder:text-end`}
        />
        <label className="block text-sm">
          <span className="mb-1 block text-slate-400">דירוג</span>
          <div className="flex items-center gap-1">
            {[1, 2, 3, 4, 5].map((n) => (
              <button key={n} type="button" onClick={() => setRating(n)}>
                <Star size={22} className={n <= rating ? 'fill-amber-400 text-amber-400' : 'text-slate-300'} />
              </button>
            ))}
          </div>
        </label>
        <DialogButtons busy={busy} onCancel={onClose} submitLabel={vendor ? 'שמור' : 'הוסף'} />
      </form>
    </Modal>
  )
}
