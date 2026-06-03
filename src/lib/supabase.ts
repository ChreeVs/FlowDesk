import { createClient } from '@supabase/supabase-js'

const normalizeSupabaseUrl = (value: string | undefined) =>
  value
    ?.trim()
    .replace(/\/rest\/v1\/?$/i, '')
    .replace(/\/+$/, '')

export const supabaseUrl = normalizeSupabaseUrl(import.meta.env.VITE_SUPABASE_URL)
export const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY?.trim()

export const isSupabaseConfigured = Boolean(supabaseUrl && supabaseAnonKey)

export const supabase = supabaseUrl && supabaseAnonKey
  ? createClient(supabaseUrl, supabaseAnonKey)
  : null
