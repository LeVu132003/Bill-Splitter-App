'use client'

import { useRoom } from './RoomProvider'
import { getNames } from '@/lib/utils'

export default function Topbar() {
  const { st, myName, isAdmin, roomCode } = useRoom()
  const memberCount = getNames(st.members).length
  const txCount = (st.txs || []).length

  function copyCode() {
    navigator.clipboard.writeText(roomCode)
  }

  return (
    <div className="topbar">
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
