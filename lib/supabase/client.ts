import { createBrowserClient } from "@supabase/ssr"
import type { Database } from "./database.types"

// ----------  Browser-side Supabase client (sets cookies)  ----------
// Using the helper from `@supabase/ssr` ensures that sessions are
// persisted to *cookies* in addition to localStorage, which allows the
// server-side middleware (createServerClient) to pick them up and keep
// the user logged in across full-page navigations / SSR requests.

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL as string
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY as string

export const supabase = createBrowserClient<Database>(supabaseUrl, supabaseAnonKey)
