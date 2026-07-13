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
  'bg-violet-500/15 text-violet-300',
  'bg-emerald-500/15 text-emerald-300',
  'bg-sky-500/15 text-sky-300',
  'bg-amber-500/15 text-amber-300',
  'bg-rose-500/15 text-rose-300',
  'bg-indigo-500/15 text-indigo-300',
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

export const ITEM_STATUSES = [
  { value: 'open', label: 'פתוח', cls: 'bg-white/10 text-slate-400' },
  { value: 'in_progress', label: 'בטיפול', cls: 'bg-blue-500/15 text-blue-300' },
  { value: 'waiting_supplier', label: 'ממתין לספק/טכנאי', cls: 'bg-amber-500/15 text-amber-300' },
  { value: 'waiting_approval', label: 'ממתין לאישור', cls: 'bg-purple-500/15 text-purple-300' },
  { value: 'on_hold', label: 'מושהה', cls: 'bg-white/15 text-slate-500' },
  { value: 'done', label: 'הושלם', cls: 'bg-emerald-500/15 text-emerald-300' },
  { value: 'cancelled', label: 'בוטל', cls: 'bg-rose-500/15 text-rose-400' },
] as const

export const statusLabel = (s: string) => ITEM_STATUSES.find((x) => x.value === s)?.label ?? s
export const statusCls = (s: string) => ITEM_STATUSES.find((x) => x.value === s)?.cls ?? 'bg-white/10 text-slate-400'
export const isOpenStatus = (s: string) => s !== 'done' && s !== 'cancelled'

export type ItemComment = {
  id: string
  item_kind: 'fault' | 'task'
  item_id: string
  user_id: string | null
  user_name: string | null
  body: string
  created_at: string
}

export type ItemActivity = {
  id: number
  item_kind: 'fault' | 'task'
  item_id: string
  user_id: string | null
  user_name: string | null
  action: string
  field: string | null
  old_value: string | null
  new_value: string | null
  created_at: string
}

export type Task = {
  id: string
  title: string
  description: string | null
  due_date: string | null
  vendor_id: string | null
  assignee_name: string | null
  assignee_user_id: string | null
  priority: 'low' | 'medium' | 'high'
  issue_image_url: string | null
  cost: number | null
  status: string
  branch: string
  business_id: string | null
  area_id: string | null
  resolution_notes: string | null
  warranty_until: string | null
  deleted_at: string | null
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
  assignee_user_id: string | null
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
  assignee_user_id: string | null
  deadline: string | null
  priority: 'low' | 'medium' | 'high'
  status: string
  branch: string
  business_id: string | null
  area_id: string | null
  image_url: string | null
  deleted_at: string | null
  created_by: string | null
  completed_at: string | null
  created_at: string
}

export type AppNotification = {
  id: number
  user_id: string
  title: string
  body: string | null
  item_kind: string | null
  item_id: string | null
  read_at: string | null
  created_at: string
}

export type ItemAttachment = {
  id: string
  item_kind: 'fault' | 'task'
  item_id: string
  file_name: string
  mime_type: string | null
  size_bytes: number | null
  url: string
  storage_path: string
  uploaded_by: string | null
  uploaded_by_name: string | null
  created_at: string
}
