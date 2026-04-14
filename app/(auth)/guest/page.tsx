'use client'

import { useState, useEffect, Suspense } from 'react'
import { useRouter, useSearchParams } from 'next/navigation'

function GuestEntryContent() {
  const router = useRouter()
  const searchParams = useSearchParams()
  const [roomCode, setRoomCode] = useState('')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')

  // Auto-fill from URL query parameter ?r=ROOMCODE
  useEffect(() => {
    const codeFromUrl = searchParams.get('r')
    if (codeFromUrl) {
      const normalized = codeFromUrl.toUpperCase().trim()
      setRoomCode(normalized)
      // Auto-navigate if valid format (deep link handling)
      if (normalized.length === 6) {
        // Small delay to show the UI briefly before auto-navigating
        const timer = setTimeout(() => {
          handleSubmit(normalized)
        }, 300)
        return () => clearTimeout(timer)
      }
    }
  }, [searchParams])

  const handleSubmit = async (code?: string) => {
    const codeToValidate = (code || roomCode).toUpperCase().trim()
    
    // Validate format
    if (codeToValidate.length !== 6) {
      setError('Mã phòng phải có 6 ký tự')
      return
    }

    setLoading(true)
    setError('')

    try {
      // Validate room exists (guest-friendly endpoint)
      const response = await fetch(`/api/rooms/validate?code=${codeToValidate}`)
      
      if (!response.ok) {
        if (response.status === 404) {
          setError('Không tìm thấy phòng')
        } else {
          setError('Lỗi kết nối — vui lòng thử lại')
        }
        setLoading(false)
        return
      }

      const { exists } = await response.json()
      
      if (exists) {
        // Navigate to member selection
        router.push(`/guest/select-member?r=${codeToValidate}`)
      } else {
        setError('Không tìm thấy phòng')
        setLoading(false)
      }
    } catch (err) {
      setError('Lỗi kết nối — vui lòng thử lại')
      setLoading(false)
    }
  }

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const value = e.target.value.toUpperCase().slice(0, 6)
    setRoomCode(value)
    setError('')
  }

  const handleKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'Enter') {
      handleSubmit()
    }
  }

  return (
    <>
      <div style={{
        minHeight: '100dvh',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        padding: '1rem',
        background: 'var(--bg)',
      }}>
        <div className="card" style={{ maxWidth: 360, width: '100%' }}>
          <div className="cb" style={{ textAlign: 'center' }}>
            <div style={{ fontSize: 40, marginBottom: '1rem' }}>💸</div>
            <h1 style={{ fontSize: 20, fontWeight: 700, marginBottom: 8 }}>
              Vào phòng
            </h1>
            <p style={{ 
              color: 'var(--t2)', 
              fontSize: 14, 
              marginBottom: '1.5rem', 
              lineHeight: 1.6 
            }}>
              Nhập mã phòng 6 ký tự để tham gia chia tiền
            </p>

            <div className="field">
              <label className="flbl" htmlFor="roomCode">
                Mã phòng
              </label>
              <input
                id="roomCode"
                type="text"
                value={roomCode}
                onChange={handleInputChange}
                onKeyDown={handleKeyDown}
                placeholder="VD: ABC123"
                maxLength={6}
                style={{
                  fontFamily: 'DM Mono, monospace',
                  fontSize: 16,
                  textAlign: 'center',
                  letterSpacing: '0.1em',
                  textTransform: 'uppercase',
                }}
                autoFocus
                disabled={loading}
              />
            </div>

            {error && (
              <div style={{
                color: 'var(--red)',
                fontSize: 13,
                marginTop: '0.5rem',
                marginBottom: '0.5rem',
              }}>
                {error}
              </div>
            )}

            <button
              className="btn btn-p btn-full"
              onClick={() => handleSubmit()}
              disabled={loading || roomCode.length !== 6}
              style={{ marginTop: '1rem' }}
            >
              {loading ? 'Đang kiểm tra...' : 'Tiếp tục'}
            </button>
          </div>
        </div>
      </div>

      {loading && (
        <div className="loading-overlay">
          <div className="spin" />
          <div style={{ fontSize: 14, color: 'var(--t2)' }}>
            Đang xử lý...
          </div>
        </div>
      )}
    </>
  )
}

export default function GuestEntryPage() {
  return (
    <Suspense fallback={
      <div style={{
        minHeight: '100dvh',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        background: 'var(--bg)',
      }}>
        <div className="spin" />
      </div>
    }>
      <GuestEntryContent />
    </Suspense>
  )
}
