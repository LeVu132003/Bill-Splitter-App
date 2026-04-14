import { NextResponse, type NextRequest } from 'next/server'
import { createSupabaseServerClient, createSupabaseAuthClient } from '@/lib/supabase/server'
import { hashPin, ADMIN_NAME, ADMIN_PIN, getMembers } from '@/lib/utils'
import type { RoomState } from '@/lib/types'

// GET — đọc room data
export async function GET(
  _request: NextRequest,
  { params }: { params: Promise<{ code: string }> }
) {
  const { code } = await params
  const authClient = await createSupabaseAuthClient()
  const { data: { user } } = await authClient.auth.getUser()
  if (!user) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  const supabase = await createSupabaseServerClient()
  const { data, error } = await supabase
    .from('rooms')
    .select('data')
    .eq('code', code.toUpperCase())
    .single()

  if (error || !data) {
    return NextResponse.json({ error: 'Không tìm thấy phòng' }, { status: 404 })
  }

  return NextResponse.json({ data: data.data })
}

// PATCH — ghi room data (thêm tx, edit tx, add comment, etc.)
export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ code: string }> }
) {
  const { code } = await params
  const authClient = await createSupabaseAuthClient()
  const { data: { user } } = await authClient.auth.getUser()
  if (!user) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  const body = await request.json()
  const { newState, memberName, pin } = body as {
    newState: RoomState
    memberName: string
    pin?: string
  }

  if (!newState || !memberName) {
    return NextResponse.json({ error: 'Thiếu dữ liệu' }, { status: 400 })
  }

  const supabase = await createSupabaseServerClient()

  // Đọc state hiện tại để verify PIN
  const { data: current, error: readErr } = await supabase
    .from('rooms')
    .select('data')
    .eq('code', code.toUpperCase())
    .single()

  if (readErr || !current) {
    return NextResponse.json({ error: 'Không tìm thấy phòng' }, { status: 404 })
  }

  const currentState = current.data as RoomState
  const members = getMembers(currentState.members)

  // Admin bypass
  const isAdmin = memberName === ADMIN_NAME

  if (isAdmin) {
    if (pin !== ADMIN_PIN) {
      return NextResponse.json({ error: 'PIN admin không đúng' }, { status: 403 })
    }
  } else {
    // Verify member PIN
    const member = members.find(m => m.name === memberName)
    if (!member) {
      return NextResponse.json({ error: 'Thành viên không tồn tại' }, { status: 403 })
    }
    if (member.pin && pin) {
      if (hashPin(pin) !== member.pin) {
        return NextResponse.json({ error: 'PIN không đúng' }, { status: 403 })
      }
    }
  }

  // Ghi state mới
  const { error: writeErr } = await supabase
    .from('rooms')
    .update({ data: newState, updated_at: new Date().toISOString() })
    .eq('code', code.toUpperCase())

  if (writeErr) {
    return NextResponse.json({ error: 'Lỗi ghi dữ liệu' }, { status: 500 })
  }

  // Broadcast realtime event tới tất cả clients trong room
  await supabase.channel(`room:${code.toUpperCase()}`).send({
    type: 'broadcast',
    event: 'room_updated',
    payload: { data: newState },
  })

  // Upsert room_members
  await supabase.from('room_members').upsert({
    user_id: user.id,
    room_code: code.toUpperCase(),
    member_name: memberName,
  })

  return NextResponse.json({ data: newState })
}
