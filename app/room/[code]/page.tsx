import { createSupabaseServerClient, createSupabaseAuthClient } from '@/lib/supabase/server'
import { redirect } from 'next/navigation'
import { cookies } from 'next/headers'
import { getGuestSession, verifyGuestSession } from '@/lib/session'
import RoomProvider from '@/components/room/RoomProvider'
import RoomShell from '@/components/room/RoomShell'
import type { RoomState } from '@/lib/types'

export default async function RoomPage({
  params,
}: {
  params: Promise<{ code: string }>
}) {
  const { code } = await params
  const roomCode = code.toUpperCase()

  // Check for authenticated user first
  const authClient = await createSupabaseAuthClient()
  const { data: { user } } = await authClient.auth.getUser()

  // Fetch room data
  const supabase = await createSupabaseServerClient()
  const { data, error } = await supabase
    .from('rooms')
    .select('data')
    .eq('code', roomCode)
    .single()

  if (error || !data) {
    redirect('/?error=room_not_found')
  }

  const initialState = data.data as RoomState

  // If authenticated user, get member name from cookies or room_members table
  if (user) {
    const cookieStore = await cookies()
    let myName = cookieStore.get(`room_${roomCode}_member`)?.value
    
    if (myName) {
      myName = decodeURIComponent(myName)
    } else {
      // Try to get from room_members table
      const { data: memberData } = await supabase
        .from('room_members')
        .select('member_name')
        .eq('user_id', user.id)
        .eq('room_code', roomCode)
        .single()
      
      if (memberData) {
        myName = memberData.member_name
      }
    }

    if (!myName) {
      // User is authenticated but hasn't joined this room yet.
      // Redirect to the entry page to select a member.
      redirect(`/guest?r=${roomCode}`)
    }

    const pin = cookieStore.get(`room_${roomCode}_pin`)?.value || ''

    return (
      <RoomProvider
        initialState={initialState}
        roomCode={roomCode}
        myName={myName}
        pin={decodeURIComponent(pin)}
      >
        <RoomShell />
      </RoomProvider>
    )
  }

  // Check for guest session
  const guestSession = await getGuestSession(roomCode)
  
  if (!guestSession) {
    // No auth and no guest session - redirect to guest entry
    redirect(`/guest?r=${roomCode}`)
  }

  // Verify guest session is valid
  const isValid = verifyGuestSession(guestSession, initialState.members)
  
  if (!isValid) {
    // Invalid session - redirect to guest entry
    redirect(`/guest?r=${roomCode}`)
  }

  return (
    <RoomProvider
      initialState={initialState}
      roomCode={roomCode}
      myName={guestSession.memberName}
      pin={guestSession.pinHash}
    >
      <RoomShell />
    </RoomProvider>
  )
}
