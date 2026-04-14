import { NextResponse } from 'next/server'
import { createSupabaseServerClient, createSupabaseAuthClient } from '@/lib/supabase/server'

export async function GET() {
  const authClient = await createSupabaseAuthClient()
  const { data: { user } } = await authClient.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const supabase = await createSupabaseServerClient()
  const { data } = await supabase
    .from('room_members')
    .select('member_name, room_code, rooms(data, updated_at)')
    .eq('user_id', user.id)

  if (!data) return NextResponse.json({ months: {} })

  // Tính tổng chi tiêu theo tháng
  const months: Record<string, { totalK: number; rooms: Record<string, { name: string; amountK: number }> }> = {}

  for (const row of data) {
    const memberName = row.member_name as string
    const roomsData = Array.isArray(row.rooms) ? row.rooms[0] : row.rooms as { data: { name: string; txs?: { payer: string; parts: string[]; amountK: number; splits: Record<string, number> | null; ts: number }[] }; updated_at: string } | null
    if (!roomsData?.data?.txs) continue

    for (const tx of roomsData.data.txs) {
      // Chỉ tính các tx mà user tham gia
      const involved = tx.parts.includes(memberName) || tx.payer === memberName
      if (!involved) continue

      const date = new Date(tx.ts)
      const monthKey = `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}`

      // Tính phần user phải trả
      let myShare = 0
      if (tx.splits && tx.splits[memberName] !== undefined) {
        myShare = tx.splits[memberName]
      } else if (tx.parts.includes(memberName)) {
        myShare = tx.amountK / tx.parts.length
      }

      if (!months[monthKey]) months[monthKey] = { totalK: 0, rooms: {} }
      months[monthKey].totalK += myShare

      const roomCode = row.room_code as string
      if (!months[monthKey].rooms[roomCode]) {
        months[monthKey].rooms[roomCode] = { name: roomsData.data.name, amountK: 0 }
      }
      months[monthKey].rooms[roomCode].amountK += myShare
    }
  }

  // Round values
  for (const m of Object.values(months)) {
    m.totalK = Math.round(m.totalK * 10) / 10
    for (const r of Object.values(m.rooms)) {
      r.amountK = Math.round(r.amountK * 10) / 10
    }
  }

  return NextResponse.json({ months })
}
