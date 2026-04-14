'use client'

import { useRoom } from './RoomProvider'
import { getNames, generateRoomDeepLink } from '@/lib/utils'
import { useRouter } from 'next/navigation'
import { useState, useEffect } from 'react'

export default function Topbar() {
  const { st, myName, isAdmin, roomCode } = useRoom()
  const router = useRouter()
  const memberCount = getNames(st.members).length
  const txCount = (st.txs || []).length
  const [isConnected, setIsConnected] = useState(true)

  // Simulate connection status (in real app, this would track actual connection)
  useEffect(() => {
    setIsConnected(true)
  }, [])

  function copyLink() {
    const deepLink = generateRoomDeepLink(roomCode)
    navigator.clipboard.writeText(deepLink).catch(() => {})
    showToast('✓ Đã copy link — paste vào nhóm chat nhé!')
  }

  function showToast(message: string) {
    const toast = document.getElementById('toast')
    if (!toast) {
      // Create toast element if it doesn't exist
      const toastEl = document.createElement('div')
      toastEl.id = 'toast'
      toastEl.textContent = message
      document.body.appendChild(toastEl)
      
      // Show toast
      setTimeout(() => toastEl.classList.add('show'), 10)
      
      // Hide and remove after 2.4s
      setTimeout(() => {
        toastEl.classList.remove('show')
        setTimeout(() => toastEl.remove(), 220)
      }, 2400)
    } else {
      toast.textContent = message
      toast.classList.add('show')
      setTimeout(() => {
        toast.classList.remove('show')
      }, 2400)
    }
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
      <button className="rpill" onClick={copyLink}>
        <span className={`dot ${isConnected ? 'on' : ''}`} />
        <span>{roomCode}</span>
        <span style={{ fontSize: '10px', color: 'var(--t3)' }}>copy</span>
      </button>
    </div>
  )
}
