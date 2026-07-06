import { useState } from 'react'
import { UtensilsCrossed } from 'lucide-react'
import { supabase } from '../lib/supabase'

export default function AuthPage() {
  const [mode, setMode] = useState<'signin' | 'signup'>('signin')
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [fullName, setFullName] = useState('')
  const [error, setError] = useState<string | null>(null)
  const [busy, setBusy] = useState(false)

  async function submit(e: React.FormEvent) {
    e.preventDefault()
    setError(null)
    setBusy(true)
    const res =
      mode === 'signin'
        ? await supabase.auth.signInWithPassword({ email, password })
        : await supabase.auth.signUp({
            email,
            password,
            options: { data: { full_name: fullName } },
          })
    setBusy(false)
    if (res.error) {
      const msg = res.error.message
      setError(
        msg.includes('Invalid login credentials')
          ? 'אימייל או סיסמה שגויים'
          : msg.includes('already registered')
            ? 'האימייל כבר רשום במערכת'
            : msg
      )
    }
  }

  return (
    <div className="flex min-h-screen items-center justify-center bg-gradient-to-b from-emerald-50 to-slate-50 px-4">
      <div className="w-full max-w-sm rounded-2xl border border-slate-200 bg-white p-8 shadow-sm">
        <div className="mb-6 flex flex-col items-center gap-2 text-center">
          <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-emerald-600 text-white">
            <UtensilsCrossed size={24} />
          </div>
          <h1 className="text-xl font-bold text-slate-900">Paseo Ops</h1>
          <p className="text-sm text-slate-500">ניהול תפעול המסעדה</p>
        </div>

        <div className="mb-5 grid grid-cols-2 rounded-lg bg-slate-100 p-1 text-sm font-medium">
          <button
            onClick={() => setMode('signin')}
            className={`rounded-md py-1.5 ${mode === 'signin' ? 'bg-white text-slate-900 shadow-sm' : 'text-slate-500'}`}
          >
            התחברות
          </button>
          <button
            onClick={() => setMode('signup')}
            className={`rounded-md py-1.5 ${mode === 'signup' ? 'bg-white text-slate-900 shadow-sm' : 'text-slate-500'}`}
          >
            הרשמה
          </button>
        </div>

        <form onSubmit={submit} className="space-y-3">
          {mode === 'signup' && (
            <input
              required
              value={fullName}
              onChange={(e) => setFullName(e.target.value)}
              placeholder="שם מלא"
              className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm focus:border-emerald-500 focus:outline-none"
            />
          )}
          <input
            required
            type="email"
            dir="ltr"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            placeholder="אימייל"
            className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm placeholder:text-end focus:border-emerald-500 focus:outline-none"
          />
          <input
            required
            type="password"
            dir="ltr"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            placeholder="סיסמה"
            minLength={6}
            className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm placeholder:text-end focus:border-emerald-500 focus:outline-none"
          />
          {error && <p className="text-sm text-red-600">{error}</p>}
          <button
            disabled={busy}
            className="w-full rounded-lg bg-emerald-600 py-2.5 text-sm font-semibold text-white hover:bg-emerald-700 disabled:opacity-50"
          >
            {busy ? 'רק רגע...' : mode === 'signin' ? 'התחבר' : 'הירשם'}
          </button>
        </form>
      </div>
    </div>
  )
}
