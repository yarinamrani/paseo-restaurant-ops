import { useEffect, useState } from 'react'
import { Routes, Route, Navigate } from 'react-router-dom'
import type { Session } from '@supabase/supabase-js'
import { Clock, LogOut, RefreshCw } from 'lucide-react'
import { supabase } from './lib/supabase'
import AuthPage from './pages/Auth'
import Layout from './components/Layout'
import FaultsPage from './pages/Faults'
import TasksPage from './pages/Tasks'
import VendorsPage from './pages/Vendors'
import TeamPage from './pages/Team'

export default function App() {
  const [session, setSession] = useState<Session | null>(null)
  const [role, setRole] = useState<string | null>(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    supabase.auth.getSession().then(({ data }) => {
      setSession(data.session)
      if (!data.session) setLoading(false)
    })
    const { data: sub } = supabase.auth.onAuthStateChange((_e, s) => setSession(s))
    return () => sub.subscription.unsubscribe()
  }, [])

  useEffect(() => {
    if (!session) {
      setRole(null)
      return
    }
    supabase
      .from('user_roles')
      .select('role')
      .eq('user_id', session.user.id)
      .single()
      .then(({ data }) => {
        setRole(data?.role ?? 'pending')
        setLoading(false)
      })
  }, [session])

  if (loading) {
    return (
      <div className="flex min-h-screen items-center justify-center text-slate-500">
        טוען...
      </div>
    )
  }

  if (!session) {
    return (
      <Routes>
        <Route path="/auth" element={<AuthPage />} />
        <Route path="*" element={<Navigate to="/auth" replace />} />
      </Routes>
    )
  }

  if (role === 'pending') {
    return <PendingApproval />
  }

  const isAdmin = role === 'admin'

  return (
    <Routes>
      <Route element={<Layout isAdmin={isAdmin} />}>
        <Route path="/" element={<FaultsPage />} />
        <Route path="/tasks" element={<TasksPage />} />
        <Route path="/vendors" element={<VendorsPage />} />
        {isAdmin && <Route path="/team" element={<TeamPage />} />}
      </Route>
      <Route path="*" element={<Navigate to="/" replace />} />
    </Routes>
  )
}

function PendingApproval() {
  return (
    <div className="flex min-h-screen items-center justify-center bg-gradient-to-b from-amber-50 to-slate-50 px-4">
      <div className="w-full max-w-sm rounded-2xl border border-slate-200 bg-white p-8 text-center shadow-sm">
        <div className="mx-auto mb-4 flex h-14 w-14 items-center justify-center rounded-2xl bg-amber-100 text-amber-600">
          <Clock size={28} />
        </div>
        <h1 className="text-lg font-bold text-slate-900">ההרשמה התקבלה!</h1>
        <p className="mt-2 text-sm leading-relaxed text-slate-600">
          החשבון שלך ממתין לאישור של מנהל.
          <br />
          ברגע שיאשרו אותך תוכל להיכנס למערכת.
        </p>
        <div className="mt-6 flex flex-col gap-2">
          <button
            onClick={() => window.location.reload()}
            className="flex items-center justify-center gap-1.5 rounded-lg bg-emerald-600 py-2.5 text-sm font-semibold text-white hover:bg-emerald-700"
          >
            <RefreshCw size={15} />
            בדוק שוב
          </button>
          <button
            onClick={() => supabase.auth.signOut()}
            className="flex items-center justify-center gap-1.5 rounded-lg py-2 text-sm text-slate-500 hover:bg-slate-100"
          >
            <LogOut size={15} className="rtl:-scale-x-100" />
            התנתק
          </button>
        </div>
      </div>
    </div>
  )
}
