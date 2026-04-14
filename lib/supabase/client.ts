import { createBrowserClient } from '@supabase/ssr'

// Singleton — tránh tạo nhiều instances
let client: ReturnType<typeof createBrowserClient> | null = null

// Dùng trong Client Components, chỉ cho Realtime subscribe và Auth
export function getSupabaseBrowserClient() {
  if (!client) {
    client = createBrowserClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
    )
  }
  return client
}
