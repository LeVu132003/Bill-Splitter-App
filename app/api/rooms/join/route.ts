import { NextResponse, type NextRequest } from 'next/server'
import { createSupabaseServerClient, createSupabaseAuthClient } from '@/lib/supabase/server'

export async function POST(request: NextRequest) {
  const authClient = await createSupabaseAuthClient()
  const { data: { user } } = await authClient.auth.getUser()
  if (!user) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  const { code, memberName } = await request.json()
  if (!code || !memberName) {
    return NextResponse.json({ error: 'Missing fields' }, { status: 400 })
  }

  const supabase = await createSupabaseServerClient()
  await supabase.from('room_members').upsert({
    user_id: user.id,
    room_code: code.toUpperCase(),
    member_name: memberName,
  }, { onConflict: 'user_id,room_code' })

  return NextResponse.json({ ok: true })
}
