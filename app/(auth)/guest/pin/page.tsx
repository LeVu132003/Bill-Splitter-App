'use client'

import { useState, useEffect, Suspense } from 'react'
import { useRouter, useSearchParams } from 'next/navigation'
import PINKeypad from '@/components/guest/PINKeypad'
import type { Member, RoomState } from '@/lib/types'

function PINEntryContent() {
  const router = useRouter()
  const searchParams = useSearchParams()
  const [roomCode, setRoomCode] = useState('')
  const [memberName, setMemberName] = useState('')
  const [roomData, setRoomData] = useState<RoomState | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')

  useEffect(() => {
    const code = searchParams.get('r')
    const member = searchParams.get('m')
    
    if (!code || !member) {
      router.push('/guest')
      return
    }

    setRoomCode(code.toUpperCase())
    setMemberName(decodeURIComponent(member))
    fetchRoomData(code.toUpperCase())
  }, [searchParams, router])

  const fetchRoomData = async (code: string) => {
    try {
      const response = await fetch(`/api/rooms/validate?code=${code}`)
      
      if (!response.ok) {
        setError('Không tìm thấy phòng')
        setLoading(false)
        return
      }

      const data = await response.json()
      setRoomData({
        name: data.name,
        members: data.members,
        txs: [],
      })
      setLoading(false)
    } catch (err) {
      setError('Lỗi kết nối — vui lòng thử lại')
      setLoading(false)
    }
  }

  const handlePINSuccess = async (pin: string, isAdmin: boolean) => {
    if (!roomData) return

    try {
      // Use the join API to handle guest authentication.
      // The API sets session cookies via Set-Cookie headers server-side,
      // so they are guaranteed to be present in the next server render.
      const response = await fetch('/api/rooms/join', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          code: roomCode,
          memberName: memberName,
          pin: pin,
          isGuest: true,
        }),
      })

      if (!response.ok) {
        const error = await response.json()
        throw new Error(error.error || 'Authentication failed')
      }

      // Cookies are already set by the API response headers.
      // Navigate to room — the server will find the session cookies.
      router.push(`/room/${roomCode}`)
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Lỗi xác thực — thử lại')
    }
  }

  const handleBack = () => {
    router.push(`/guest/select-member?r=${roomCode}`)
  }

  if (loading) {
    return (
      <div className="loading-overlay">
        <div className="spin" />
        <div style={{ fontSize: 14, color: 'var(--t2)' }}>
          Đang tải...
        </div>
      </div>
    )
  }

  if (error || !roomData) {
    return (
      <div
        style={{
          minHeight: '100dvh',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          padding: '1rem',
          background: 'var(--bg)',
        }}
      >
        <div className="card" style={{ maxWidth: 360, width: '100%' }}>
          <div className="cb" style={{ textAlign: 'center' }}>
            <div style={{ fontSize: 40, marginBottom: '1rem' }}>⚠️</div>
            <p style={{ color: 'var(--red)', marginBottom: '1rem' }}>
              {error || 'Không tìm thấy phòng'}
            </p>
            <button className="btn btn-full" onClick={handleBack}>
              Quay lại
            </button>
          </div>
        </div>
      </div>
    )
  }

  return (
    <PINKeypad
      memberName={memberName}
      roomCode={roomCode}
      roomName={roomData.name}
      members={roomData.members}
      onSuccess={handlePINSuccess}
      onBack={handleBack}
    />
  )
}

export default function PINEntryPage() {
  return (
    <Suspense
      fallback={
        <div className="loading-overlay">
          <div className="spin" />
        </div>
      }
    >
      <PINEntryContent />
    </Suspense>
  )
}
