import { NextResponse, type NextRequest } from 'next/server'
import { createSupabaseServerClient } from '@/lib/supabase/server'

// GET — validate room exists (no auth required for guests)
export async function GET(request: NextRequest) {
  const searchParams = request.nextUrl.searchParams
  const code = searchParams.get('code')

  if (!code) {
    return NextResponse.json({ error: 'Thiếu mã phòng' }, { status: 400 })
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

  // Return minimal data for validation (just confirm it exists and return room name + members)
  return NextResponse.json({ 
    exists: true,
    name: data.data.name,
    members: data.data.members 
  })
}
