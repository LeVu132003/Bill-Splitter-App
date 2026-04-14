/**
 * Guest authentication middleware utilities
 * Validates guest session for room access
 */

import { NextRequest, NextResponse } from 'next/server'
import { getGuestSession, verifyGuestSession } from '../session'
import { createSupabaseServerClient } from '../supabase/server'
import type { RoomState } from '../types'

export interface GuestAuthResult {
  authorized: boolean
  memberName?: string
  isAdmin?: boolean
  error?: string
}

/**
 * Verify guest has valid session for a room
 * Returns authorization result with member info
 */
export async function verifyGuestAuth(
  roomCode: string
): Promise<GuestAuthResult> {
  try {
    // Get session from cookies
    const session = await getGuestSession(roomCode)
    
    if (!session) {
      return {
        authorized: false,
        error: 'No session found',
      }
    }
    
    // Fetch room data to verify session
    const supabase = await createSupabaseServerClient()
    const { data, error } = await supabase
      .from('rooms')
      .select('data')
      .eq('code', roomCode.toUpperCase())
      .single()
    
    if (error || !data) {
      return {
        authorized: false,
        error: 'Room not found',
      }
    }
    
    const roomState = data.data as RoomState
    
    // Verify session against room members
    const isValid = verifyGuestSession(session, roomState.members)
    
    if (!isValid) {
      return {
        authorized: false,
        error: 'Invalid session',
      }
    }
    
    return {
      authorized: true,
      memberName: session.memberName,
      isAdmin: session.isAdmin,
    }
  } catch (err) {
    return {
      authorized: false,
      error: 'Authentication error',
    }
  }
}

/**
 * Middleware wrapper for API routes requiring guest auth
 * Usage: wrap your API handler with this function
 */
export function withGuestAuth(
  handler: (
    request: NextRequest,
    context: { params: { code: string }; memberName: string; isAdmin: boolean }
  ) => Promise<NextResponse>
) {
  return async (
    request: NextRequest,
    context: { params: { code: string } }
  ): Promise<NextResponse> => {
    const roomCode = context.params.code
    
    const authResult = await verifyGuestAuth(roomCode)
    
    if (!authResult.authorized) {
      return NextResponse.json(
        { error: 'Unauthorized', message: authResult.error },
        { status: 401 }
      )
    }
    
    // Pass member info to handler
    return handler(request, {
      ...context,
      memberName: authResult.memberName!,
      isAdmin: authResult.isAdmin!,
    })
  }
}
