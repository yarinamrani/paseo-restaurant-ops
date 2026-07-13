import { createContext, useCallback, useContext, useEffect, useState } from 'react'
import { supabase, type Area, type Business } from './supabase'

type OrgContextValue = {
  businesses: Business[]
  areas: Area[]
  loaded: boolean
  reload: () => void
  bizName: (id: string | null, fallback?: string) => string
  areaName: (id: string | null) => string
}

const OrgContext = createContext<OrgContextValue>({
  businesses: [],
  areas: [],
  loaded: false,
  reload: () => {},
  bizName: () => '',
  areaName: () => '',
})

export function OrgProvider({ children }: { children: React.ReactNode }) {
  const [businesses, setBusinesses] = useState<Business[]>([])
  const [areas, setAreas] = useState<Area[]>([])
  const [loaded, setLoaded] = useState(false)

  const reload = useCallback(() => {
    Promise.all([
      supabase.from('businesses').select('*').order('sort_order'),
      supabase.from('areas').select('*').order('sort_order'),
    ]).then(([b, a]) => {
      setBusinesses((b.data as Business[]) ?? [])
      setAreas((a.data as Area[]) ?? [])
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
    <OrgContext.Provider value={{ businesses, areas, loaded, reload, bizName, areaName }}>
      {children}
    </OrgContext.Provider>
  )
}

export const useOrg = () => useContext(OrgContext)
