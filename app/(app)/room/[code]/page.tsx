import { createSupabaseServerClient, createSupabaseAuthClient } from '@/lib/supabase/server'
import { redirect } from 'next/navigation'
import { cookies } from 'next/headers'
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

  const authClient = await createSupabaseAuthClient()
  const { data: { user } } = await authClient.auth.getUser()
  if (!user) redirect('/login')

  const supabase = await createSupabaseServerClient()
  const { data, error } = await supabase
    .from('rooms')
    .select('data')
    .eq('code', roomCode)
    .single()

  if (error || !data) redirect('/?error=room_not_found')

  const initialState = data.data as RoomState

  const cookieStore = await cookies()
  const myName = decodeURIComponent(cookieStore.get(`room_${roomCode}_member`)?.value || '')
  const pin = decodeURIComponent(cookieStore.get(`room_${roomCode}_pin`)?.value || '')

  if (!myName) redirect('/')

  return (
    <RoomProvider
      initialState={initialState}
      roomCode={roomCode}
      myName={myName}
      pin={pin}
    >
      <RoomShell />
    </RoomProvider>
  )
}
