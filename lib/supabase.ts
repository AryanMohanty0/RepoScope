import { createClient } from '@supabase/supabase-js'

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!

// NEXT_PUBLIC_ is required for the browser to see the variable
// SERVICE_ROLE_KEY should stay secret and is only for the server
const supabaseKey = typeof window === 'undefined'
  ? (process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!)
  : process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!

if (!supabaseKey) {
  throw new Error("Supabase Key is missing! Check your .env.local")
}

export const supabase = createClient(supabaseUrl, supabaseKey)