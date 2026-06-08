import { createClient, type SupabaseClient } from '@supabase/supabase-js'

const url = import.meta.env.VITE_SUPABASE_URL as string | undefined
const anonKey = import.meta.env.VITE_SUPABASE_ANON_KEY as string | undefined

/** True once both VITE_SUPABASE_* env vars are present (see .env.local). */
export const isSupabaseConfigured = Boolean(url && anonKey)

/** Shared browser client, or null when not configured (Share is then disabled). */
export const supabase: SupabaseClient | null = isSupabaseConfigured
  ? createClient(url!, anonKey!)
  : null
