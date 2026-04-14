import { NextResponse, type NextRequest } from 'next/server'
import { createSupabaseServerClient, createSupabaseAuthClient } from '@/lib/supabase/server'
import { uid6, hashPin } from '@/lib/utils'
import type { RoomState } from '@/lib/types'

export async function POST(request: NextRequest) {
  // Verify auth
  const authClient = await createSupabaseAuthClient()
  const { data: { user } } = await authClient.auth.getUser()
  if (!user) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  const body = await request.json()
  const { eventName, memberName, pin } = body as {
    eventName: string
    memberName: string
    pin: string
  }

  if (!eventName?.trim() || !memberName?.trim()) {
    return NextResponse.json({ error: 'Thiếu thông tin' }, { status: 400 })
  }
  if (!/^\d{6}$/.test(pin)) {
    return NextResponse.json({ error: 'PIN phải đúng 6 chữ số' }, { status: 400 })
  }

  const code = uid6()
  const initState: RoomState = {
    name: eventName.trim(),
    members: [{ name: memberName.trim(), pin: hashPin(pin) }],
    txs: [],
    created: Date.now(),
  }

  const supabase = await createSupabaseServerClient()

  // Tạo room
  const { error: roomError } = await supabase
    .from('rooms')
    .insert({ code, data: initState, updated_at: new Date().toISOString() })

  if (roomError) {
    return NextResponse.json({ error: 'Không tạo được phòng' }, { status: 500 })
  }

  // Ghi room_members
  await supabase.from('room_members').upsert({
    user_id: user.id,
    room_code: code,
    member_name: memberName.trim(),
  })

  return NextResponse.json({ code, data: initState }, { status: 201 })
}
