'use client'

import { useState, useEffect } from 'react'
import { hashPin, ADMIN_NAME, ADMIN_PIN } from '@/lib/utils'
import type { Member } from '@/lib/types'

interface PINKeypadProps {
  memberName: string
  roomCode: string
  roomName: string
  members: Member[]
  onSuccess: (pin: string, isAdmin: boolean) => void
  onBack: () => void
}

export default function PINKeypad({
  memberName,
  roomCode,
  roomName,
  members,
  onSuccess,
  onBack,
}: PINKeypadProps) {
  const [pinValue, setPinValue] = useState('')
  const [error, setError] = useState('')
  const [isShaking, setIsShaking] = useState(false)
  const [loading, setLoading] = useState(false)

  const member = members.find(m => m.name === memberName)
  const isFirstTime = member && !member.pin
  const isAdminAccount = memberName === ADMIN_NAME

  // Auto-submit when 6 digits entered
  useEffect(() => {
    if (pinValue.length === 6) {
      const timer = setTimeout(() => {
        handleSubmit()
      }, 150)
      return () => clearTimeout(timer)
    }
  }, [pinValue])

  const handleSubmit = async () => {
    if (loading) return
    setError('')
    setLoading(true)

    try {
      // Admin special case
      if (isAdminAccount && pinValue === ADMIN_PIN) {
        onSuccess(pinValue, true)
        return
      }

      if (!member) {
        setError('Lỗi: không tìm thấy thành viên')
        setLoading(false)
        return
      }

      // First time setting PIN
      if (isFirstTime) {
        if (!/^\d{6}$/.test(pinValue)) {
          setError('PIN phải đúng 6 chữ số!')
          setPinValue('')
          setLoading(false)
          return
        }
        // PIN will be saved by parent component
        onSuccess(pinValue, false)
        return
      }

      // Verify PIN
      if (hashPin(pinValue) !== member.pin) {
        setError('PIN không đúng, thử lại!')
        triggerShake()
        setPinValue('')
        setLoading(false)
        return
      }

      onSuccess(pinValue, memberName === ADMIN_NAME)
    } catch (err) {
      setError('Lỗi xác thực — thử lại')
      setLoading(false)
    }
  }

  const triggerShake = () => {
    setIsShaking(true)
    setTimeout(() => setIsShaking(false), 400)
  }

  const handleKeyPress = (digit: string) => {
    if (pinValue.length >= 6 || loading) return
    setPinValue(prev => prev + digit)
    setError('')
  }

  const handleDelete = () => {
    setPinValue(prev => prev.slice(0, -1))
    setError('')
  }

  const handleClear = () => {
    setPinValue('')
    setError('')
  }

  const renderDots = () => {
    return Array.from({ length: 6 }).map((_, i) => (
      <div
        key={i}
        className={`pd ${i < pinValue.length ? 'filled' : ''} ${isShaking ? 'error' : ''}`}
      >
        {pinValue[i] ? '●' : ''}
      </div>
    ))
  }

  const getHintText = () => {
    if (isAdminAccount) {
      return 'Tài khoản admin — nhập PIN đặc biệt'
    }
    if (isFirstTime) {
      return 'Lần đầu đăng nhập — tạo PIN 6 số để dùng lần sau'
    }
    return ''
  }

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
      <div className="card" style={{ maxWidth: 420, width: '100%' }}>
        <div className="cb">
          {/* Back button */}
          <button className="back-link" onClick={onBack} disabled={loading}>
            ‹ Quay lại
          </button>

          {/* Room label */}
          <div className="room-label">
            {roomName} · {roomCode}
          </div>

          {/* Title */}
          <div className="stitle">Nhập PIN</div>

          {/* Username display */}
          <div style={{ fontSize: 13, color: 'var(--t2)', marginBottom: '.25rem' }}>
            Đăng nhập với tư cách <strong style={{ color: 'var(--text)' }}>{memberName}</strong>
          </div>

          {/* PIN dots */}
          <div className="pin-dots">
            {renderDots()}
          </div>

          {/* Error message */}
          {error && (
            <div className="serr-sm">
              {error}
            </div>
          )}

          {/* Keypad */}
          <div className="keypad">
            <button className="kp" onClick={() => handleKeyPress('1')} disabled={loading}>1</button>
            <button className="kp" onClick={() => handleKeyPress('2')} disabled={loading}>2</button>
            <button className="kp" onClick={() => handleKeyPress('3')} disabled={loading}>3</button>
            <button className="kp" onClick={() => handleKeyPress('4')} disabled={loading}>4</button>
            <button className="kp" onClick={() => handleKeyPress('5')} disabled={loading}>5</button>
            <button className="kp" onClick={() => handleKeyPress('6')} disabled={loading}>6</button>
            <button className="kp" onClick={() => handleKeyPress('7')} disabled={loading}>7</button>
            <button className="kp" onClick={() => handleKeyPress('8')} disabled={loading}>8</button>
            <button className="kp" onClick={() => handleKeyPress('9')} disabled={loading}>9</button>
            <button className="kp del" onClick={handleDelete} disabled={loading}>⌫</button>
            <button className="kp zero" onClick={() => handleKeyPress('0')} disabled={loading}>0</button>
            <button className="kp clr" onClick={handleClear} disabled={loading}>CLR</button>
          </div>

          {/* Hint text */}
          {getHintText() && (
            <div className="pin-hint">
              {getHintText()}
            </div>
          )}
        </div>
      </div>
    </div>
  )
}
