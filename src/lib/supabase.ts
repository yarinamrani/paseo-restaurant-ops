import { createClient } from '@supabase/supabase-js'

export const supabase = createClient(
  import.meta.env.VITE_SUPABASE_URL,
  import.meta.env.VITE_SUPABASE_ANON_KEY
)

export type Vendor = {
  id: string
  name: string | null
  profession: string
  phone: string | null
  category: string
  rating: number
  created_at: string
}

export const BRANCHES = ['טאלה', 'פסאו', 'אומינו'] as const
export type Branch = (typeof BRANCHES)[number]

export const branchColors: Record<string, string> = {
  'טאלה': 'bg-violet-100 text-violet-700',
  'פסאו': 'bg-emerald-100 text-emerald-700',
  'אומינו': 'bg-sky-100 text-sky-700',
}

export type Task = {
  id: string
  title: string
  description: string | null
  due_date: string | null
  vendor_id: string | null
  assignee_name: string | null
  priority: 'low' | 'medium' | 'high'
  issue_image_url: string | null
  cost: number | null
  status: 'open' | 'done'
  branch: string
  resolution_notes: string | null
  warranty_until: string | null
  completed_at: string | null
  created_by: string | null
  created_at: string
}

export type RecurringTask = {
  id: string
  title: string
  description: string | null
  branch: string
  assignee_name: string | null
  priority: string
  interval_days: number
  next_due: string
  active: boolean
  created_at: string
}

export type AdminTask = {
  id: string
  title: string
  description: string | null
  assignee_name: string | null
  deadline: string | null
  priority: 'low' | 'medium' | 'high'
  status: 'open' | 'done'
  branch: string
  image_url: string | null
  created_by: string | null
  completed_at: string | null
  created_at: string
}
