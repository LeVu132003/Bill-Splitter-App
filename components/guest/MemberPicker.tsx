'use client'

import { useState } from 'react'
import { ini, cc } from '@/lib/utils'
import type { Member } from '@/lib/types'

interface MemberPickerProps {
  roomCode: string
  roomName: string
  members: Member[]
  onSelect: (memberName: string) => void
  onAddNew: (name: string) => Promise<void>
  onBack: () => void
}

export default function MemberPicker({
  roomCode,
  roomName,
  members,
  onSelect,
  onAddNew,
  onBack,
}: MemberPickerProps) {
  const [newName, setNewName] = useState('')
  const [error, setError] = useState('')
  const [loading, setLoading] = useState(false)

  const handleAddNew = async () => {
    const name = newName.trim()
    setError('')

    if (!name) {
      setError('Vui lòng nhập tên')
      return
    }

    if (members.some(m => m.name === name)) {
      setError('Tên này đã có trong phòng rồi!')
      return
    }

    setLoading(true)
    try {
      await onAddNew(name)
      setNewName('')
      setError('')
    } catch (err) {
      setError('Không thể thêm thành viên')
    } finally {
      setLoading(false)
    }
  }

  const handleKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'Enter') {
      handleAddNew()
    }
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
          <button className="back-link" onClick={onBack}>
            ‹ Quay lại
          </button>

          {/* Room label */}
          <div className="room-label">
            {roomName} · {roomCode}
          </div>

          {/* Title */}
          <div className="stitle" style={{ fontSize: 16, fontWeight: 600, marginBottom: '1rem' }}>
            Bạn là ai?
          </div>

          {/* Member list */}
          <div id="member-pick-list">
            {members.length === 0 ? (
              <div
                style={{
                  color: 'var(--t3)',
                  fontSize: 13,
                  textAlign: 'center',
                  padding: '1rem 0',
                }}
              >
                Phòng chưa có thành viên nào
              </div>
            ) : (
              members.map((member, index) => (
                <button
                  key={member.name}
                  className="mpick-btn"
                  onClick={() => onSelect(member.name)}
                  disabled={loading}
                >
                  <span className={`av sm ${cc(index)}`}>{ini(member.name)}</span>
                  <span className="mpick-name">{member.name}</span>
                  <span className="mpick-sub">
                    {member.pin ? '🔑 Đã có PIN' : '🔓 Chưa có PIN'}
                  </span>
                  <span className="mpick-arrow">›</span>
                </button>
              ))
            )}
          </div>

          {/* Add new member section */}
          <div
            style={{
              borderTop: '1px solid var(--border)',
              paddingTop: '.875rem',
              marginTop: '.25rem',
            }}
          >
            <div style={{ fontSize: 12, color: 'var(--t3)', marginBottom: '.5rem' }}>
              Chưa có tên của bạn?
            </div>
            <div style={{ display: 'flex', gap: 8 }}>
              <input
                type="text"
                id="new-name-inp"
                placeholder="Thêm tên mới..."
                autoComplete="off"
                value={newName}
                onChange={(e) => {
                  setNewName(e.target.value)
                  setError('')
                }}
                onKeyDown={handleKeyDown}
                style={{ flex: 1, fontSize: 13 }}
                disabled={loading}
              />
              <button
                className="btn btn-p"
                style={{ fontSize: 13, whiteSpace: 'nowrap' }}
                onClick={handleAddNew}
                disabled={loading || !newName.trim()}
              >
                {loading ? 'Đang thêm...' : '+ Thêm'}
              </button>
            </div>
            {error && (
              <div
                style={{
                  color: 'var(--red)',
                  fontSize: 12,
                  marginTop: '.5rem',
                }}
              >
                {error}
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  )
}
