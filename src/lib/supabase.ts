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
  resolution_notes: string | null
  completed_at: string | null
  created_by: string | null
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
  created_by: string | null
  completed_at: string | null
  created_at: string
}
