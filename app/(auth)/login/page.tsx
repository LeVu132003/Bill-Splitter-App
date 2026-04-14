import LoginButton from '@/components/auth/LoginButton'

export default function LoginPage() {
  return (
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
          <h1 style={{ fontSize: 20, fontWeight: 700, marginBottom: 8 }}>Chia Tiền Nhóm</h1>
          <p style={{ color: 'var(--t2)', fontSize: 14, marginBottom: '1.5rem', lineHeight: 1.6 }}>
            Đăng nhập để tạo và quản lý các buổi chia tiền với bạn bè
          </p>
          <LoginButton />
        </div>
      </div>
    </div>
  )
}
