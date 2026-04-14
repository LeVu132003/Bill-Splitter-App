import { NextResponse, type NextRequest } from 'next/server'
import { createSupabaseServerClient } from '@/lib/supabase/server'
import type { RoomState } from '@/lib/types'

// POST — add new member to room (guest access, no auth required)
export async function POST(request: NextRequest) {
  const body = await request.json()
  const { roomCode, memberName } = body as {
    roomCode: string
    memberName: string
  }

  if (!roomCode || !memberName) {
    return NextResponse.json({ error: 'Thiếu dữ liệu' }, { status: 400 })
  }

  const supabase = await createSupabaseServerClient()

  // Read current state
  const { data: current, error: readErr } = await supabase
    .from('rooms')
    .select('data')
    .eq('code', roomCode.toUpperCase())
    .single()

  if (readErr || !current) {
    return NextResponse.json({ error: 'Không tìm thấy phòng' }, { status: 404 })
  }

  const currentState = current.data as RoomState

  // Check if member name already exists
  if (currentState.members.some(m => m.name === memberName)) {
    return NextResponse.json({ error: 'Tên này đã có trong phòng rồi!' }, { status: 400 })
  }

  // Add new member with empty PIN
  const updatedState: RoomState = {
    ...currentState,
    members: [...currentState.members, { name: memberName, pin: '' }],
  }

  // Update room state
  const { error: writeErr } = await supabase
    .from('rooms')
    .update({ data: updatedState, updated_at: new Date().toISOString() })
    .eq('code', roomCode.toUpperCase())

  if (writeErr) {
    return NextResponse.json({ error: 'Lỗi ghi dữ liệu' }, { status: 500 })
  }

  // Broadcast realtime event
  await supabase.channel(`room:${roomCode.toUpperCase()}`).send({
    type: 'broadcast',
    event: 'room_updated',
    payload: { data: updatedState },
  })

  return NextResponse.json({ 
    success: true,
    members: updatedState.members 
  })
}

// PATCH — update member PIN (guest access, no auth required)
export async function PATCH(request: NextRequest) {
  const body = await request.json()
  const { roomCode, memberName, pin } = body as {
    roomCode: string
    memberName: string
    pin: string
  }

  if (!roomCode || !memberName || !pin) {
    return NextResponse.json({ error: 'Thiếu dữ liệu' }, { status: 400 })
  }

  const supabase = await createSupabaseServerClient()

  // Read current state
  const { data: current, error: readErr } = await supabase
    .from('rooms')
    .select('data')
    .eq('code', roomCode.toUpperCase())
    .single()

  if (readErr || !current) {
    return NextResponse.json({ error: 'Không tìm thấy phòng' }, { status: 404 })
  }

  const currentState = current.data as RoomState

  // Find member and update PIN
  const memberIndex = currentState.members.findIndex(m => m.name === memberName)
  if (memberIndex === -1) {
    return NextResponse.json({ error: 'Không tìm thấy thành viên' }, { status: 404 })
  }

  // Update member PIN
  const updatedState: RoomState = {
    ...currentState,
    members: currentState.members.map((m, i) => 
      i === memberIndex ? { ...m, pin } : m
    ),
  }

  // Update room state
  const { error: writeErr } = await supabase
    .from('rooms')
    .update({ data: updatedState, updated_at: new Date().toISOString() })
    .eq('code', roomCode.toUpperCase())

  if (writeErr) {
    return NextResponse.json({ error: 'Lỗi ghi dữ liệu' }, { status: 500 })
  }

  // Broadcast realtime event
  await supabase.channel(`room:${roomCode.toUpperCase()}`).send({
    type: 'broadcast',
    event: 'room_updated',
    payload: { data: updatedState },
  })

  return NextResponse.json({ 
    success: true,
    members: updatedState.members 
  })
}
