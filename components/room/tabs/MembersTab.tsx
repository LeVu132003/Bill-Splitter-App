'use client'

import { useState } from 'react'
import { useRoom } from '../RoomProvider'
import { getMembers, ini, cc, ADMIN_NAME } from '@/lib/utils'

export default function MembersTab() {
  const { st, isAdmin, syncToServer } = useRoom()
  const [newName, setNewName] = useState('')
  const [error, setError] = useState('')

  const members = getMembers(st.members).filter(m => m.name !== ADMIN_NAME)

  async function handleAdd() {
    setError('')
    if (!newName.trim()) return
    if (members.some(m => m.name === newName.trim())) {
      setError('Tên này đã có!')
      return
    }
    const newState = {
      ...st,
      members: [...getMembers(st.members), { name: newName.trim(), pin: '' }],
    }
    setNewName('')
    await syncToServer(newState)
  }

  async function handleRemove(name: string) {
    if (!confirm(`Xóa ${name} khỏi phòng?`)) return
    const newState = {
      ...st,
      members: getMembers(st.members).filter(m => m.name !== name),
    }
    await syncToServer(newState)
  }

  return (
    <div>
      <div className="card" style={{ marginBottom: '.875rem' }}>
        <div className="cb">
          <div className="slbl">Thành viên trong phòng</div>
          <div style={{ display: 'flex', flexWrap: 'wrap', gap: 8 }}>
            {members.length === 0 && (
              <span style={{ fontSize: 13, color: 'var(--t3)' }}>Chưa có ai</span>
            )}
            {members.map((m, i) => (
              <span key={m.name} className="mtag">
                <span className={`av xs ${cc(i)}`}>{ini(m.name)}</span>
                <span>{m.name}</span>
                <span className="pin-ok" title={m.pin ? 'Đã có PIN' : 'Chưa có PIN'}>
                  {m.pin ? '🔑' : '🔓'}
                </span>
                {isAdmin && (
                  <span className="mx" onClick={() => handleRemove(m.name)}>✕</span>
                )}
              </span>
            ))}
          </div>
        </div>
      </div>

      {isAdmin && (
        <div className="card">
          <div className="cb">
            <div className="slbl">Thêm thành viên</div>
            {error && <div style={{ color: 'var(--red)', fontSize: 13, marginBottom: 8 }}>{error}</div>}
            <div style={{ display: 'flex', gap: 8 }}>
              <input
                type="text"
                placeholder="Tên thành viên..."
                value={newName}
                onChange={e => setNewName(e.target.value)}
                onKeyDown={e => e.key === 'Enter' && handleAdd()}
              />
              <button className="btn btn-p" onClick={handleAdd}>+ Thêm</button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
