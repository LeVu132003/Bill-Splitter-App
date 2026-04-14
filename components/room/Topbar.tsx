'use client'

import { useRoom } from './RoomProvider'
import { getNames } from '@/lib/utils'
import { useRouter } from 'next/navigation'

export default function Topbar() {
  const { st, myName, isAdmin, roomCode } = useRoom()
  const router = useRouter()
  const memberCount = getNames(st.members).length
  const txCount = (st.txs || []).length

  function copyCode() {
    navigator.clipboard.writeText(roomCode)
  }

  return (
    <div className="topbar">
      <button
        onClick={() => router.push('/')}
        style={{ background: 'none', border: 'none', cursor: 'pointer', color: 'var(--t2)', fontSize: 18, padding: '0 4px', flexShrink: 0, display: 'flex', alignItems: 'center' }}
        title="Quay lại danh sách"
      >
        ←
      </button>
      <div className="tinfo">
        <div className="tname">{st.name}</div>
        <div className="tsub">
          {myName}{isAdmin ? ' 👑' : ''} · {memberCount} thành viên · {txCount} khoản
        </div>
      </div>
      {isAdmin && (
        <div className="admin-pill" style={{ display: 'flex' }}>
          <span>👑</span>
          <span>Admin</span>
        </div>
      )}
      <button className="rpill" onClick={copyCode}>
        <span className="dot on" />
        {roomCode}
      </button>
    </div>
  )
}
