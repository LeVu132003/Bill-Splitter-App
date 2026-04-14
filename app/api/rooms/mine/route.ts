import { NextResponse } from 'next/server'
import { createSupabaseServerClient, createSupabaseAuthClient } from '@/lib/supabase/server'

export async function GET() {
  const authClient = await createSupabaseAuthClient()
  const { data: { user } } = await authClient.auth.getUser()
  if (!user) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  const supabase = await createSupabaseServerClient()
  const { data, error } = await supabase
    .from('room_members')
    .select('room_code, member_name, joined_at, rooms(data)')
    .eq('user_id', user.id)
    .order('joined_at', { ascending: false })

  if (error) {
    return NextResponse.json({ rooms: [] })
  }

  const rooms = (data || []).map((r) => {
    const roomData = Array.isArray(r.rooms) ? r.rooms[0]?.data : (r.rooms as { data: { name: string; txs?: unknown[] } } | null)?.data
    return {
      code: r.room_code as string,
      memberName: r.member_name as string,
      joinedAt: r.joined_at as string,
      name: roomData?.name || (r.room_code as string),
      txCount: (roomData?.txs || []).length,
    }
  })

  return NextResponse.json({ rooms })
}
