'use client'

import { useState } from 'react'
import { useRoom } from '../RoomProvider'
import EditForm from './EditForm'
import { ini, cc, fmtK, timeAgo, uid, getNames, ADMIN_NAME } from '@/lib/utils'
import type { Tx } from '@/lib/types'

export default function TxCard({ tx }: { tx: Tx }) {
  const { st, myName, isAdmin, syncToServer } = useRoom()
  const [open, setOpen] = useState(false)
  const [editing, setEditing] = useState(false)
  const [cmtText, setCmtText] = useState('')

  const members = getNames(st.members)
  const nonAdminMembers = members.filter(m => m !== ADMIN_NAME)
  const isMine = tx.by === myName
  const canEdit = isAdmin || isMine
  const k = tx.amountK || 0
  const allM = tx.parts.length === nonAdminMembers.length
  const idx = members.indexOf(tx.payer)
  const cmts = tx.comments || []

  async function handleDelete() {
    if (!confirm(`Xóa khoản "${tx.desc}"?`)) return
    const newState = { ...st, txs: st.txs.filter(t => t.id !== tx.id) }
    await syncToServer(newState)
  }

  async function handleSaveEdit(updated: Tx) {
    const newState = { ...st, txs: st.txs.map(t => t.id === tx.id ? updated : t) }
    setEditing(false)
    await syncToServer(newState)
  }

  async function handleSendComment() {
    if (!cmtText.trim()) return
    const newCmt = { id: uid(), author: myName, text: cmtText.trim(), ts: Date.now() }
    const updated: Tx = { ...tx, comments: [...cmts, newCmt] }
    const newState = { ...st, txs: st.txs.map(t => t.id === tx.id ? updated : t) }
    setCmtText('')
    await syncToServer(newState)
  }

  async function handleDeleteComment(cmtId: string) {
    const cmt = cmts.find(c => c.id === cmtId)
    if (!cmt || (cmt.author !== myName && !isAdmin)) return
    const updated: Tx = { ...tx, comments: cmts.filter(c => c.id !== cmtId) }
    const newState = { ...st, txs: st.txs.map(t => t.id === tx.id ? updated : t) }
    await syncToServer(newState)
  }

  const splitLabel = tx.splitMode === 'percent'
    ? <span style={{ fontSize: 10, background: 'var(--bbg)', color: 'var(--blue)', padding: '1px 5px', borderRadius: 4, fontWeight: 600 }}>% tỉ lệ</span>
    : tx.splitMode === 'fixed'
    ? <span style={{ fontSize: 10, background: 'var(--gbg)', color: 'var(--green)', padding: '1px 5px', borderRadius: 4, fontWeight: 600 }}>💰 cố định</span>
    : null

  return (
    <div className={`txcard${isMine ? ' mine' : (isAdmin && !isMine) ? ' admin-edit' : ''}`}>
      <div className="tx-head">
        <div className={`av ${cc(idx >= 0 ? idx : 0)}`}>{ini(tx.payer)}</div>
        <div className="tx-info">
          <div className="tx-name">{tx.desc}</div>
          <div className="tx-meta">
            {tx.payer} trả · {allM ? 'Tất cả' : tx.parts.join(', ')} {splitLabel}
            {tx.edited ? ' · ' : ''}{tx.edited ? <em>đã sửa</em> : null}
          </div>
          <button className="tx-toggle" onClick={() => setOpen(o => !o)}>
            <span>{open ? '▲ Thu gọn' : '▼ Chi tiết'}</span>
            {cmts.length > 0
              ? <span className="cmt-count">💬 {cmts.length}</span>
              : <span style={{ fontSize: 10, color: 'var(--t3)' }}>💬</span>
            }
          </button>
        </div>
        <div className="tx-right">
          <span className="tx-amt">{fmtK(k)}</span>
          {isMine && <span className="tx-badge mine">của tôi</span>}
          {isAdmin && !isMine && <span className="tx-badge admin">👑</span>}
        </div>
      </div>

      {open && (
        <div className="tx-expand open">
          {tx.note && !editing && (
            <div style={{ padding: '8px 12px 0', fontSize: 13, color: 'var(--t2)', lineHeight: 1.5, whiteSpace: 'pre-wrap' }}>
              {tx.note}
            </div>
          )}

          {editing && canEdit && (
            <EditForm
              tx={tx}
              members={st.members}
              onSave={handleSaveEdit}
              onCancel={() => setEditing(false)}
            />
          )}

          {!editing && canEdit && (
            <div style={{ padding: '8px 12px', background: 'var(--abg)', borderBottom: '1px solid var(--aborder)', display: 'flex', gap: 7, alignItems: 'center' }}>
              <span style={{ fontSize: 11, color: 'var(--accent)', fontWeight: 500, flex: 1 }}>
                {isAdmin && !isMine ? '👑 Quyền admin' : 'Khoản chi của bạn'}
              </span>
              <button className="btn btn-xs" onClick={() => setEditing(true)} style={{ borderColor: 'var(--aborder)', color: 'var(--accent)' }}>✏️ Sửa</button>
              <button className="btn btn-xs" onClick={handleDelete} style={{ borderColor: 'rgba(184,50,50,.3)', color: 'var(--red)' }}>🗑 Xóa</button>
            </div>
          )}

          <div className="comments-section">
            <div className="cmt-title">💬 Thảo luận</div>
            {cmts.length === 0 && <div style={{ fontSize: 12, color: 'var(--t3)', marginBottom: 12 }}>Chưa có comment nào</div>}
            {cmts.map(c => {
              const ci = members.indexOf(c.author)
              const canDel = c.author === myName || isAdmin
              return (
                <div key={c.id} className="cmt-item">
                  <div className={`av xs ${cc(ci >= 0 ? ci : 0)}`}>{ini(c.author)}</div>
                  <div className="cmt-body">
                    <div className="cmt-meta">
                      <span className="cmt-name">{c.author}</span>
                      <span>{timeAgo(c.ts)}</span>
                      {canDel && (
                        <button className="cmt-del" onClick={() => handleDeleteComment(c.id)} style={{ background: 'none', border: 'none', color: 'var(--t3)', fontSize: 11, cursor: 'pointer' }}>xóa</button>
                      )}
                    </div>
                    <div className="cmt-text">{c.text}</div>
                  </div>
                </div>
              )
            })}
            <div className="cmt-input-wrap" style={{ display: 'flex', gap: 8 }}>
              <textarea
                placeholder="Viết comment..."
                rows={1}
                value={cmtText}
                onChange={e => setCmtText(e.target.value)}
                onKeyDown={e => { if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); handleSendComment() } }}
                style={{ flex: 1, resize: 'none' }}
              />
              <button className="btn cmt-send" onClick={handleSendComment} style={{ borderColor: 'var(--accent)', color: 'var(--accent)' }}>↑</button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
