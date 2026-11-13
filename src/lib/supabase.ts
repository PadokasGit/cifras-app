import { createClient, type SupabaseClient } from '@supabase/supabase-js'

const url = import.meta.env.VITE_SUPABASE_URL as string | undefined
const key = import.meta.env.VITE_SUPABASE_ANON_KEY as string | undefined

/** null quando o projeto não está configurado: o app continua 100% local. */
export const supabase: SupabaseClient | null = url && key ? createClient(url, key) : null
