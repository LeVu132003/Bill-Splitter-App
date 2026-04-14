'use client'

import { getSupabaseBrowserClient } from '@/lib/supabase/client'
import { useRouter } from 'next/navigation'
import type { User } from '@supabase/supabase-js'

export default function UserMenu({ user }: { user: User }) {
  const router = useRouter()

  async function handleLogout() {
    const supabase = getSupabaseBrowserClient()
    await supabase.auth.signOut()
    router.push('/login')
  }

  const avatar = user.user_metadata?.avatar_url
  const name = user.user_metadata?.full_name || user.email || 'User'

  return (
    <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
      {avatar ? (
        // eslint-disable-next-line @next/next/no-img-element
        <img src={avatar} alt={name} style={{ width: 28, height: 28, borderRadius: '50%' }} />
      ) : (
        <div className="av sm c0" style={{ width: 28, height: 28, fontSize: 10 }}>
          {name.slice(0, 2).toUpperCase()}
        </div>
      )}
      <button
        className="btn btn-sm"
        onClick={handleLogout}
        style={{ fontSize: 12 }}
      >
        Đăng xuất
      </button>
    </div>
  )
}
