'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'

type Step = 'home' | 'create' | 'join' | 'join-member' | 'join-pin'

function setRoomSession(code: string, memberName: string, pin: string) {
  document.cookie = `room_${code}_member=${encodeURIComponent(memberName)}; path=/; max-age=86400`
  document.cookie = `room_${code}_pin=${encodeURIComponent(pin)}; path=/; max-age=86400`
}

export default function HomePage() {
  const router = useRouter()
  const [step, setStep] = useState<Step>('home')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')

  // Create room state
  const [eventName, setEventName] = useState('')
  const [createName, setCreateName] = useState('')
  const [createPin, setCreatePin] = useState('')

  // Join room state
  const [joinCode, setJoinCode] = useState('')
  const [joinMembers, setJoinMembers] = useState<Array<{name: string, pin: string}>>([])
  const [joinRoomName, setJoinRoomName] = useState('')
  const [selectedMember, setSelectedMember] = useState('')
  const [newMemberName, setNewMemberName] = useState('')
  const [pinVal, setPinVal] = useState('')
  const [pinError, setPinError] = useState('')

  async function handleCreate() {
    setError('')
    if (!eventName.trim()) { setError('Nhập tên buổi chơi nhé!'); return }
    if (!createName.trim()) { setError('Nhập tên của bạn nhé!'); return }
    if (!/^\d{6}$/.test(createPin)) { setError('PIN phải đúng 6 chữ số!'); return }

    setLoading(true)
    const res = await fetch('/api/rooms', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ eventName, memberName: createName, pin: createPin }),
    })
    setLoading(false)

    if (!res.ok) {
      const j = await res.json()
      setError(j.error || 'Lỗi tạo phòng')
      return
    }
    const { code } = await res.json()
    setRoomSession(code, createName, createPin)
    router.push(`/room/${code}`)
  }

  async function handleFindRoom() {
    setError('')
    const code = joinCode.trim().toUpperCase()
    if (code.length !== 6) { setError('Mã phòng phải đúng 6 ký tự'); return }
    setLoading(true)
    const res = await fetch(`/api/rooms/${code}`)
    setLoading(false)
    if (!res.ok) { setError('Không tìm thấy phòng "' + code + '"'); return }
    const { data } = await res.json()
    setJoinRoomName(data.name)
    setJoinMembers(data.members.map((m: {name: string; pin: string} | string) => typeof m === 'string' ? { name: m, pin: '' } : m))
    setStep('join-member')
  }

  function selectMember(name: string) {
    setSelectedMember(name)
    setPinVal('')
    setPinError('')
    setStep('join-pin')
  }

  async function handleAddSelf() {
    if (!newMemberName.trim()) return
    if (joinMembers.some(m => m.name === newMemberName.trim())) {
      setError('Tên này đã có trong phòng rồi!')
      return
    }
    const code = joinCode.trim().toUpperCase()
    const newMember = { name: newMemberName.trim(), pin: '' }
    const newMembers = [...joinMembers, newMember]
    await fetch(`/api/rooms/${code}`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        newState: {
          name: joinRoomName,
          members: newMembers,
          txs: [],
        },
        memberName: newMember.name,
        pin: '',
      }),
    })
    setJoinMembers(newMembers)
    selectMember(newMember.name)
  }

  async function handlePinSubmit() {
    setPinError('')
    const code = joinCode.trim().toUpperCase()
    const member = joinMembers.find(m => m.name === selectedMember)
    if (!member) return

    // Admin
    if (selectedMember === 'admin') {
      if (pinVal !== '132003') { setPinError('PIN không đúng!'); return }
      setRoomSession(code, 'admin', pinVal)
      router.push(`/room/${code}`)
      return
    }

    if (!member.pin) {
      // First time — set PIN
      if (!/^\d{6}$/.test(pinVal)) { setPinError('PIN phải đúng 6 chữ số!'); return }
      const { hashPin } = await import('@/lib/utils')
      const updatedMembers = joinMembers.map(m =>
        m.name === selectedMember ? { ...m, pin: hashPin(pinVal) } : m
      )
      await fetch(`/api/rooms/${code}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          newState: { name: joinRoomName, members: updatedMembers, txs: [] },
          memberName: selectedMember,
          pin: pinVal,
        }),
      })
      setRoomSession(code, selectedMember, pinVal)
      router.push(`/room/${code}`)
      return
    }

    // Has PIN — just navigate (server will verify on next write)
    setRoomSession(code, selectedMember, pinVal)
    router.push(`/room/${code}`)
  }

  if (loading) {
    return (
      <div style={{ minHeight: '100dvh', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
        <div style={{ textAlign: 'center', color: 'var(--t2)' }}>Đang xử lý...</div>
      </div>
    )
  }

  if (step === 'home') {
    return (
      <div style={{ maxWidth: 540, margin: '0 auto', padding: '2rem 1rem' }}>
        <div style={{ textAlign: 'center', marginBottom: '2rem' }}>
          <div style={{ fontSize: 48, marginBottom: '0.5rem' }}>💸</div>
          <h1 style={{ fontSize: 24, fontWeight: 700 }}>Chia Tiền Nhóm</h1>
        </div>
        <div className="card">
          <div className="cb" style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
            <button className="btn btn-p btn-full" onClick={() => setStep('create')}>
              + Tạo phòng mới
            </button>
            <button className="btn btn-full" onClick={() => setStep('join')}>
              Tham gia phòng có sẵn
            </button>
          </div>
        </div>
      </div>
    )
  }

  if (step === 'create') {
    return (
      <div style={{ maxWidth: 540, margin: '0 auto', padding: '1rem' }}>
        <div className="card">
          <div className="cb">
            <div className="slbl">Tạo phòng mới</div>
            {error && <div style={{ color: 'var(--red)', fontSize: 13, marginBottom: 8 }}>{error}</div>}
            <div className="field">
              <label className="flbl">Tên buổi chơi</label>
              <input type="text" placeholder="Đi Đà Lạt, Sinh nhật Nam..." value={eventName} onChange={e => setEventName(e.target.value)} />
            </div>
            <div className="field">
              <label className="flbl">Tên của bạn</label>
              <input type="text" placeholder="Nguyễn Văn A..." value={createName} onChange={e => setCreateName(e.target.value)} />
            </div>
            <div className="field">
              <label className="flbl">Tạo PIN 6 số</label>
              <input type="password" inputMode="numeric" maxLength={6} placeholder="••••••" value={createPin} onChange={e => setCreatePin(e.target.value)} />
            </div>
            <div style={{ display: 'flex', gap: 8, marginTop: 8 }}>
              <button className="btn btn-p" style={{ flex: 1 }} onClick={handleCreate}>Tạo phòng →</button>
              <button className="btn" onClick={() => { setStep('home'); setError('') }}>Quay lại</button>
            </div>
          </div>
        </div>
      </div>
    )
  }

  if (step === 'join') {
    return (
      <div style={{ maxWidth: 540, margin: '0 auto', padding: '1rem' }}>
        <div className="card">
          <div className="cb">
            <div className="slbl">Tham gia phòng</div>
            {error && <div style={{ color: 'var(--red)', fontSize: 13, marginBottom: 8 }}>{error}</div>}
            <div className="field">
              <label className="flbl">Mã phòng (6 ký tự)</label>
              <input type="text" placeholder="ABC123" maxLength={6} value={joinCode} onChange={e => setJoinCode(e.target.value.toUpperCase())} />
            </div>
            <div style={{ display: 'flex', gap: 8, marginTop: 8 }}>
              <button className="btn btn-p" style={{ flex: 1 }} onClick={handleFindRoom}>Tìm phòng →</button>
              <button className="btn" onClick={() => { setStep('home'); setError('') }}>Quay lại</button>
            </div>
          </div>
        </div>
      </div>
    )
  }

  if (step === 'join-member') {
    return (
      <div style={{ maxWidth: 540, margin: '0 auto', padding: '1rem' }}>
        <div className="card">
          <div className="cb">
            <div className="slbl">{joinRoomName} · {joinCode.toUpperCase()}</div>
            <div style={{ marginBottom: 12 }}>
              {joinMembers.map((m, i) => (
                <button key={m.name} className="btn btn-full" style={{ marginBottom: 6, justifyContent: 'flex-start', gap: 10 }} onClick={() => selectMember(m.name)}>
                  <span className={`av sm c${i % 8}`} style={{ display: 'inline-flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
                    {m.name.trim().split(/\s+/).map((w: string) => w[0]).join('').slice(0, 2).toUpperCase()}
                  </span>
                  <span style={{ flex: 1, textAlign: 'left' }}>{m.name}</span>
                  <span style={{ fontSize: 11, color: 'var(--t3)' }}>{m.pin ? 'Đã có PIN' : 'Chưa có PIN'}</span>
                </button>
              ))}
            </div>
            <div className="field">
              <label className="flbl">Thêm tên mới</label>
              <input type="text" placeholder="Tên của bạn..." value={newMemberName} onChange={e => setNewMemberName(e.target.value)} />
            </div>
            {error && <div style={{ color: 'var(--red)', fontSize: 13, marginBottom: 8 }}>{error}</div>}
            <button className="btn btn-p btn-full" onClick={handleAddSelf}>+ Thêm &amp; vào phòng</button>
          </div>
        </div>
      </div>
    )
  }

  if (step === 'join-pin') {
    return (
      <div style={{ maxWidth: 540, margin: '0 auto', padding: '1rem' }}>
        <div className="card">
          <div className="cb" style={{ textAlign: 'center' }}>
            <div className="slbl">Nhập PIN cho {selectedMember}</div>
            <input
              type="password"
              inputMode="numeric"
              maxLength={6}
              placeholder="••••••"
              value={pinVal}
              onChange={e => setPinVal(e.target.value)}
              style={{ textAlign: 'center', fontSize: 24, letterSpacing: 8, marginBottom: 12 }}
              autoFocus
            />
            {pinError && <div style={{ color: 'var(--red)', fontSize: 13, marginBottom: 8 }}>{pinError}</div>}
            <div style={{ display: 'flex', gap: 8 }}>
              <button className="btn btn-p" style={{ flex: 1 }} onClick={handlePinSubmit}>Vào phòng →</button>
              <button className="btn" onClick={() => setStep('join-member')}>Quay lại</button>
            </div>
          </div>
        </div>
      </div>
    )
  }

  return null
}
