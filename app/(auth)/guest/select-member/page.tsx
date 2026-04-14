'use client'

import { useState, useEffect, Suspense } from 'react'
import { useRouter, useSearchParams } from 'next/navigation'
import MemberPicker from '@/components/guest/MemberPicker'
import type { Member, RoomState } from '@/lib/types'

function SelectMemberContent() {
  const router = useRouter()
  const searchParams = useSearchParams()
  const [roomCode, setRoomCode] = useState('')
  const [roomData, setRoomData] = useState<RoomState | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')

  useEffect(() => {
    const code = searchParams.get('r')
    if (!code) {
      router.push('/guest')
      return
    }

    setRoomCode(code.toUpperCase())
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
      // Create a minimal RoomState from the validation response
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

  const handleSelectMember = (memberName: string) => {
    // Navigate to PIN entry page
    router.push(`/guest/pin?r=${roomCode}&m=${encodeURIComponent(memberName)}`)
  }

  const handleAddNewMember = async (name: string) => {
    if (!roomData) return

    try {
      // Add new member to room via guest API
      const response = await fetch('/api/rooms/guest', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ 
          roomCode: roomCode,
          memberName: name 
        }),
      })

      if (!response.ok) {
        const error = await response.json()
        throw new Error(error.error || 'Failed to add member')
      }

      const result = await response.json()

      // Update local state with new members list
      setRoomData({
        ...roomData,
        members: result.members,
      })

      // Auto-select the new member
      handleSelectMember(name)
    } catch (err) {
      throw new Error(err instanceof Error ? err.message : 'Không thể thêm thành viên')
    }
  }

  const handleBack = () => {
    router.push('/guest')
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
    <MemberPicker
      roomCode={roomCode}
      roomName={roomData.name}
      members={roomData.members}
      onSelect={handleSelectMember}
      onAddNew={handleAddNewMember}
      onBack={handleBack}
    />
  )
}

export default function SelectMemberPage() {
  return (
    <Suspense
      fallback={
        <div className="loading-overlay">
          <div className="spin" />
        </div>
      }
    >
      <SelectMemberContent />
    </Suspense>
  )
}
