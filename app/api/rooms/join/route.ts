import { NextResponse, type NextRequest } from 'next/server'
import { createSupabaseServerClient, createSupabaseAuthClient } from '@/lib/supabase/server'
import { hashPin, ADMIN_NAME, ADMIN_PIN } from '@/lib/utils'
import type { RoomState } from '@/lib/types'

/**
 * POST /api/rooms/join
 * Handles both authenticated and guest user join flows
 * 
 * For authenticated users:
 * - Requires valid Supabase auth session
 * - Stores room membership in room_members table
 * 
 * For guest users:
 * - Validates room code, member name, and PIN
 * - Returns session tokens for cookie storage
 */
export async function POST(request: NextRequest) {
  const body = await request.json()
  const { code, memberName, pin, isGuest } = body as {
    code: string
    memberName: string
    pin?: string
    isGuest?: boolean
  }

  if (!code || !memberName) {
    return NextResponse.json({ error: 'Missing required fields' }, { status: 400 })
  }

  const roomCode = code.toUpperCase()

  // Handle guest join flow
  if (isGuest) {
    if (!pin) {
      return NextResponse.json({ error: 'PIN required for guest access' }, { status: 400 })
    }

    const supabase = await createSupabaseServerClient()
    
    // Fetch room data
    const { data: roomData, error: roomError } = await supabase
      .from('rooms')
      .select('data')
      .eq('code', roomCode)
      .single()

    if (roomError || !roomData) {
      return NextResponse.json({ error: 'Room not found' }, { status: 404 })
    }

    const roomState = roomData.data as RoomState
    
    // Find member
    const member = roomState.members.find(m => m.name === memberName)
    
    if (!member) {
      return NextResponse.json({ error: 'Member not found' }, { status: 404 })
    }

    // Check if admin account
    const isAdmin = memberName === ADMIN_NAME && pin === ADMIN_PIN
    
    if (isAdmin) {
      // Admin account - special handling
      return NextResponse.json({
        success: true,
        sessionData: {
          memberName,
          pinHash: hashPin(pin),
          isAdmin: true,
        },
      })
    }

    // For first-time users (no PIN set), save the PIN
    if (!member.pin) {
      const pinHash = hashPin(pin)
      
      // Update member with new PIN
      const updatedState: RoomState = {
        ...roomState,
        members: roomState.members.map(m =>
          m.name === memberName ? { ...m, pin: pinHash } : m
        ),
      }

      const { error: updateError } = await supabase
        .from('rooms')
        .update({ data: updatedState, updated_at: new Date().toISOString() })
        .eq('code', roomCode)

      if (updateError) {
        return NextResponse.json({ error: 'Failed to save PIN' }, { status: 500 })
      }

      return NextResponse.json({
        success: true,
        sessionData: {
          memberName,
          pinHash,
          isAdmin: false,
        },
      })
    }

    // Verify PIN for existing users
    const pinHash = hashPin(pin)
    if (pinHash !== member.pin) {
      return NextResponse.json({ error: 'Incorrect PIN' }, { status: 401 })
    }

    return NextResponse.json({
      success: true,
      sessionData: {
        memberName,
        pinHash,
        isAdmin: false,
      },
    })
  }

  // Handle authenticated user join flow
  const authClient = await createSupabaseAuthClient()
  const { data: { user } } = await authClient.auth.getUser()
  
  if (!user) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  const supabase = await createSupabaseServerClient()
  
  // Verify room exists
  const { data: roomData, error: roomError } = await supabase
    .from('rooms')
    .select('code')
    .eq('code', roomCode)
    .single()

  if (roomError || !roomData) {
    return NextResponse.json({ error: 'Room not found' }, { status: 404 })
  }

  // Store room membership
  const { error: memberError } = await supabase
    .from('room_members')
    .upsert({
      user_id: user.id,
      room_code: roomCode,
      member_name: memberName,
    }, { onConflict: 'user_id,room_code' })

  if (memberError) {
    return NextResponse.json({ error: 'Failed to join room' }, { status: 500 })
  }

  return NextResponse.json({ success: true })
}
