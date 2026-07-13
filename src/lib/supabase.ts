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

export type Business = {
  id: string
  name: string
  active: boolean
  sort_order: number
}

export type Area = {
  id: string
  business_id: string | null
  name: string
  active: boolean
  sort_order: number
}

const BADGE_PALETTE = [
  'bg-violet-100 text-violet-700',
  'bg-emerald-100 text-emerald-700',
  'bg-sky-100 text-sky-700',
  'bg-amber-100 text-amber-700',
  'bg-rose-100 text-rose-700',
  'bg-indigo-100 text-indigo-700',
]

export const BAR_PALETTE = [
  'bg-violet-500',
  'bg-emerald-500',
  'bg-sky-500',
  'bg-amber-500',
  'bg-rose-500',
  'bg-indigo-500',
]

export const branchColors: Record<string, string> = {
  'טאלה': BADGE_PALETTE[0],
  'פסאו': BADGE_PALETTE[1],
  'אומינו': BADGE_PALETTE[2],
}

export function badgeColorFor(name: string, index = 0): string {
  return branchColors[name] ?? BADGE_PALETTE[index % BADGE_PALETTE.length]
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
  business_id: string | null
  area_id: string | null
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
  business_id: string | null
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
  business_id: string | null
  area_id: string | null
  image_url: string | null
  created_by: string | null
  completed_at: string | null
  created_at: string
}
