import type { Metadata } from 'next'
import './globals.css'

export const metadata: Metadata = {
  title: 'Chia Tiền Nhóm',
  description: 'Ứng dụng chia tiền cho nhóm bạn bè',
}

export default function RootLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return (
    <html lang="vi">
      <body>{children}</body>
    </html>
  )
}
