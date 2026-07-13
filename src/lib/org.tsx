import { createContext, useCallback, useContext, useEffect, useState } from 'react'
import { supabase, type Area, type Business } from './supabase'

export type Person = { user_id: string; full_name: string | null }

type OrgContextValue = {
  businesses: Business[]
  areas: Area[]
  people: Person[]
  loaded: boolean
  reload: () => void
  bizName: (id: string | null, fallback?: string) => string
  areaName: (id: string | null) => string
}

const OrgContext = createContext<OrgContextValue>({
  businesses: [],
  areas: [],
  people: [],
  loaded: false,
  reload: () => {},
  bizName: () => '',
  areaName: () => '',
})

export function OrgProvider({ children }: { children: React.ReactNode }) {
  const [businesses, setBusinesses] = useState<Business[]>([])
  const [areas, setAreas] = useState<Area[]>([])
  const [people, setPeople] = useState<Person[]>([])
  const [loaded, setLoaded] = useState(false)

  const reload = useCallback(() => {
    Promise.all([
      supabase.from('businesses').select('*').order('sort_order'),
      supabase.from('areas').select('*').order('sort_order'),
      supabase.from('profiles').select('user_id, full_name').order('full_name'),
    ]).then(([b, a, p]) => {
      setBusinesses((b.data as Business[]) ?? [])
      setAreas((a.data as Area[]) ?? [])
      setPeople((p.data as Person[]) ?? [])
      setLoaded(true)
    })
  }, [])

  useEffect(() => {
    reload()
  }, [reload])

  const bizName = useCallback(
    (id: string | null, fallback = '') => businesses.find((b) => b.id === id)?.name ?? fallback,
    [businesses]
  )
  const areaName = useCallback(
    (id: string | null) => areas.find((a) => a.id === id)?.name ?? '',
    [areas]
  )

  return (
    <OrgContext.Provider value={{ businesses, areas, people, loaded, reload, bizName, areaName }}>
      {children}
    </OrgContext.Provider>
  )
}

export const useOrg = () => useContext(OrgContext)
