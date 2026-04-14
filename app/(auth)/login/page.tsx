import LoginButton from '@/components/auth/LoginButton'
import Link from 'next/link'

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
          
          <div style={{ marginTop: '2rem', paddingTop: '1.5rem', borderTop: '1px solid var(--border)' }}>
            <p style={{ fontSize: 13, color: 'var(--t3)', marginBottom: '1rem' }}>Hoặc trải nghiệm không cần tạo tài khoản</p>
            <Link href="/guest" style={{ display: 'block', textDecoration: 'none' }}>
              <button className="btn btn-full" style={{ background: 'var(--bg2)', color: 'var(--text)', border: '1.5px solid var(--border)', fontWeight: 500 }}>
                Dùng với tư cách Khách
              </button>
            </Link>
          </div>
        </div>
      </div>
    </div>
  )
}
