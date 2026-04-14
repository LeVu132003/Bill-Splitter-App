# Bill Splitter App — Next.js Migration Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Migrate "Chia Tiền Nhóm" từ single HTML file sang Next.js 15 App Router với Supabase Auth (Google), Supabase Realtime, deploy Vercel.

**Architecture:** Next.js App Router với server components/API Routes giữ `SUPABASE_SERVICE_ROLE_KEY` server-side. Client chỉ dùng anon key để subscribe Realtime. Mọi DB write đi qua API Routes có auth check.

**Tech Stack:** Next.js 15, TypeScript, Supabase JS v2, CSS Modules, Vercel

---

## File Map

### Tạo mới
- `package.json` — deps: next, react, @supabase/supabase-js, @supabase/ssr
- `tsconfig.json` — TypeScript config
- `next.config.ts` — Next.js config
- `middleware.ts` — bảo vệ route `/room/*`
- `.env.example` — template env vars
- `DEPLOYMENT.md` — hướng dẫn deploy
- `app/layout.tsx` — root layout
- `app/globals.css` — design system CSS (từ inline style của HTML gốc)
- `app/(auth)/login/page.tsx` — trang login Google
- `app/(app)/layout.tsx` — protected layout (check auth)
- `app/(app)/page.tsx` — home: tạo/join room
- `app/(app)/page.module.css` — styles cho home
- `app/(app)/room/[code]/page.tsx` — room page (server component, load initial data)
- `app/api/auth/callback/route.ts` — Supabase OAuth callback
- `app/api/rooms/route.ts` — POST tạo phòng
- `app/api/rooms/[code]/route.ts` — GET đọc room, PATCH ghi room
- `lib/supabase/server.ts` — Supabase server client (service role)
- `lib/supabase/client.ts` — Supabase browser client (anon, Realtime)
- `lib/utils.ts` — fmtK, timeAgo, uid, uid6, hashPin, ini, cc, escHtml
- `lib/types.ts` — TypeScript types: Room, Member, Tx, Comment, RoomState
- `components/auth/LoginButton.tsx` — nút "Đăng nhập với Google"
- `components/auth/UserMenu.tsx` — avatar + logout
- `components/room/RoomProvider.tsx` — Context + Realtime listener
- `components/room/Topbar.tsx` — topbar với room code, status dot, admin badge
- `components/room/TabBar.tsx` — tab navigation
- `components/room/tabs/MembersTab.tsx` — tab thành viên
- `components/room/tabs/SpendTab.tsx` — tab chi tiêu (compose AddTxForm + TxList)
- `components/room/tabs/ResultTab.tsx` — tab kết quả
- `components/room/spend/AddTxForm.tsx` — form thêm chi tiêu
- `components/room/spend/SplitToggle.tsx` — equal/percent/fixed selector
- `components/room/spend/TxList.tsx` — danh sách tx (reverse order)
- `components/room/spend/TxCard.tsx` — 1 transaction card, expand/collapse, edit, comments
- `components/room/result/StatsBar.tsx` — tổng chi/khoản/CK
- `components/room/result/BalanceList.tsx` — số dư từng người
- `components/room/result/TransferList.tsx` — ai chuyển cho ai
- `components/ui/Toast.tsx` — toast notification
- `components/ui/LoadingOverlay.tsx` — loading spinner overlay

---

## Task 1: Scaffold Next.js Project

**Files:**
- Create: `package.json`
- Create: `tsconfig.json`
- Create: `next.config.ts`
- Create: `.env.example`
- Create: `.gitignore`

- [ ] **Step 1: Khởi tạo Next.js project**

```bash
cd /Users/lehoanganhvu/Downloads/bill-splitter-app
npx create-next-app@latest . --typescript --app --no-src-dir --no-tailwind --eslint --import-alias "@/*" --yes
```

Expected output: Next.js project được scaffold, `package.json` tạo xong.

- [ ] **Step 2: Cài thêm Supabase dependencies**

```bash
npm install @supabase/supabase-js @supabase/ssr
```

- [ ] **Step 3: Tạo `.env.example`**

```env
# Public — dùng được ở browser (chỉ cho Realtime subscribe)
NEXT_PUBLIC_SUPABASE_URL=https://your-project.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=your-anon-key-here

# Private — chỉ server-side (API Routes & Server Components)
SUPABASE_SERVICE_ROLE_KEY=your-service-role-key-here
```

- [ ] **Step 4: Copy `.env.example` thành `.env.local` và điền giá trị thật**

```bash
cp .env.example .env.local
```

Điền vào `.env.local`:
- `NEXT_PUBLIC_SUPABASE_URL`: lấy từ Supabase Dashboard > Settings > API > Project URL
- `NEXT_PUBLIC_SUPABASE_ANON_KEY`: lấy từ Supabase Dashboard > Settings > API > anon/public key
- `SUPABASE_SERVICE_ROLE_KEY`: lấy từ Supabase Dashboard > Settings > API > service_role key

- [ ] **Step 5: Cập nhật `.gitignore` — đảm bảo `.env.local` không bị commit**

Mở `.gitignore`, kiểm tra dòng `.env.local` đã có. Nếu chưa có, thêm:
```
.env.local
```

- [ ] **Step 6: Commit**

```bash
cd /Users/lehoanganhvu/Downloads/bill-splitter-app
git add package.json package-lock.json tsconfig.json next.config.ts .eslintrc.json .gitignore .env.example
git commit -m "feat: scaffold Next.js 15 project with Supabase deps"
```

---

## Task 2: TypeScript Types & Utilities

**Files:**
- Create: `lib/types.ts`
- Create: `lib/utils.ts`

- [ ] **Step 1: Tạo `lib/types.ts`**

```typescript
export interface Member {
  name: string
  pin: string // djb2 hash hoặc empty string nếu chưa set
}

export interface Comment {
  id: string
  author: string
  text: string
  ts: number
}

export type SplitMode = 'equal' | 'percent' | 'fixed'

export interface Tx {
  id: string
  desc: string
  note?: string
  amountK: number
  payer: string
  parts: string[]           // tên các thành viên tham gia
  splits: Record<string, number> | null // {name: shareK} — null nếu equal
  splitMode: SplitMode
  by: string                // người tạo tx
  ts: number
  edited?: number
  comments: Comment[]
}

export interface RoomState {
  name: string              // tên buổi chơi
  members: Member[]
  txs: Tx[]
  created?: number
  settled?: Record<string, boolean>
}

export interface RoomRow {
  code: string
  data: RoomState
  updated_at: string
}

export interface Transfer {
  from: string
  to: string
  amountK: number
}
```

- [ ] **Step 2: Tạo `lib/utils.ts`**

```typescript
export function fmtK(k: number): string {
  k = Math.round(k * 10) / 10
  if (k >= 1000) {
    const m = k / 1000
    return (Number.isInteger(m) ? m : m.toFixed(1)) + 'M'
  }
  return (Number.isInteger(k) ? k : k.toFixed(1)) + 'k'
}

export function timeAgo(ts: number): string {
  const d = Date.now() - ts
  const s = Math.floor(d / 1000)
  const m = Math.floor(s / 60)
  const h = Math.floor(m / 60)
  if (s < 60) return 'vừa xong'
  if (m < 60) return m + 'ph trước'
  if (h < 24) return h + 'g trước'
  return new Date(ts).toLocaleDateString('vi-VN', { day: '2-digit', month: '2-digit' })
}

export const ini = (n: string): string =>
  n.trim().split(/\s+/).map(w => w[0]).join('').slice(0, 2).toUpperCase()

export const cc = (i: number): string => 'c' + (i % 8)

export const uid = (): string => Math.random().toString(36).slice(2, 10)

export const uid6 = (): string => Math.random().toString(36).slice(2, 8).toUpperCase()

export function escHtml(s: string): string {
  return s
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
}

// djb2 hash — giữ nguyên từ code gốc để PIN cũ vẫn work
export function hashPin(p: string): string {
  let h = 5381
  for (let i = 0; i < p.length; i++) {
    h = (((h << 5) + h) + p.charCodeAt(i)) >>> 0
  }
  return h.toString(16)
}

export function getMembers(members: Array<Member | string>): Member[] {
  return members.map(m => typeof m === 'string' ? { name: m, pin: '' } : m)
}

export function getNames(members: Array<Member | string>): string[] {
  return getMembers(members).map(m => m.name)
}

export const ADMIN_NAME = 'admin'
export const ADMIN_PIN = '132003'
```

- [ ] **Step 3: Commit**

```bash
git add lib/types.ts lib/utils.ts
git commit -m "feat: add TypeScript types and utility functions"
```

---

## Task 3: Supabase Clients

**Files:**
- Create: `lib/supabase/server.ts`
- Create: `lib/supabase/client.ts`

- [ ] **Step 1: Tạo `lib/supabase/server.ts`**

```typescript
import { createServerClient } from '@supabase/ssr'
import { cookies } from 'next/headers'
import type { RoomState } from '@/lib/types'

// Dùng trong Server Components và API Routes
// Có đủ quyền đọc/ghi DB (service role)
export async function createSupabaseServerClient() {
  const cookieStore = await cookies()
  return createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!,
    {
      cookies: {
        getAll() {
          return cookieStore.getAll()
        },
        setAll(cookiesToSet) {
          try {
            cookiesToSet.forEach(({ name, value, options }) =>
              cookieStore.set(name, value, options)
            )
          } catch {
            // Server Component — không cần handle
          }
        },
      },
    }
  )
}

// Dùng trong API Routes để check auth session
export async function createSupabaseAuthClient() {
  const cookieStore = await cookies()
  return createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        getAll() {
          return cookieStore.getAll()
        },
        setAll(cookiesToSet) {
          try {
            cookiesToSet.forEach(({ name, value, options }) =>
              cookieStore.set(name, value, options)
            )
          } catch {}
        },
      },
    }
  )
}
```

- [ ] **Step 2: Tạo `lib/supabase/client.ts`**

```typescript
import { createBrowserClient } from '@supabase/ssr'

// Singleton — tránh tạo nhiều instances
let client: ReturnType<typeof createBrowserClient> | null = null

// Dùng trong Client Components, chỉ cho Realtime subscribe và Auth
export function getSupabaseBrowserClient() {
  if (!client) {
    client = createBrowserClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
    )
  }
  return client
}
```

- [ ] **Step 3: Commit**

```bash
git add lib/supabase/server.ts lib/supabase/client.ts
git commit -m "feat: add Supabase server and browser clients"
```

---

## Task 4: Middleware & Auth Callback

**Files:**
- Create: `middleware.ts`
- Create: `app/api/auth/callback/route.ts`

- [ ] **Step 1: Tạo `middleware.ts`**

```typescript
import { createServerClient } from '@supabase/ssr'
import { NextResponse, type NextRequest } from 'next/server'

export async function middleware(request: NextRequest) {
  let supabaseResponse = NextResponse.next({ request })

  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        getAll() {
          return request.cookies.getAll()
        },
        setAll(cookiesToSet) {
          cookiesToSet.forEach(({ name, value }) =>
            request.cookies.set(name, value)
          )
          supabaseResponse = NextResponse.next({ request })
          cookiesToSet.forEach(({ name, value, options }) =>
            supabaseResponse.cookies.set(name, value, options)
          )
        },
      },
    }
  )

  const { data: { user } } = await supabase.auth.getUser()

  const { pathname } = request.nextUrl

  // Bảo vệ room routes — redirect /login nếu chưa auth
  if (!user && pathname.startsWith('/room')) {
    const url = request.nextUrl.clone()
    url.pathname = '/login'
    return NextResponse.redirect(url)
  }

  // Redirect về home nếu đã login mà vào /login
  if (user && pathname === '/login') {
    const url = request.nextUrl.clone()
    url.pathname = '/'
    return NextResponse.redirect(url)
  }

  return supabaseResponse
}

export const config = {
  matcher: ['/((?!_next/static|_next/image|favicon.ico|.*\\.(?:svg|png|jpg|jpeg|gif|webp)$).*)'],
}
```

- [ ] **Step 2: Tạo `app/api/auth/callback/route.ts`**

```typescript
import { createServerClient } from '@supabase/ssr'
import { cookies } from 'next/headers'
import { NextResponse, type NextRequest } from 'next/server'

export async function GET(request: NextRequest) {
  const { searchParams, origin } = new URL(request.url)
  const code = searchParams.get('code')
  const next = searchParams.get('next') ?? '/'

  if (code) {
    const cookieStore = await cookies()
    const supabase = createServerClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
      {
        cookies: {
          getAll() { return cookieStore.getAll() },
          setAll(cookiesToSet) {
            cookiesToSet.forEach(({ name, value, options }) =>
              cookieStore.set(name, value, options)
            )
          },
        },
      }
    )

    const { error } = await supabase.auth.exchangeCodeForSession(code)
    if (!error) {
      return NextResponse.redirect(`${origin}${next}`)
    }
  }

  return NextResponse.redirect(`${origin}/login?error=auth_failed`)
}
```

- [ ] **Step 3: Commit**

```bash
git add middleware.ts app/api/auth/callback/route.ts
git commit -m "feat: add middleware auth guard and OAuth callback"
```

---

## Task 5: Rooms API Routes

**Files:**
- Create: `app/api/rooms/route.ts`
- Create: `app/api/rooms/[code]/route.ts`

- [ ] **Step 1: Tạo `app/api/rooms/route.ts` (POST — tạo phòng mới)**

```typescript
import { NextResponse, type NextRequest } from 'next/server'
import { createSupabaseServerClient, createSupabaseAuthClient } from '@/lib/supabase/server'
import { uid6, hashPin, ADMIN_NAME } from '@/lib/utils'
import type { RoomState } from '@/lib/types'

export async function POST(request: NextRequest) {
  // Verify auth
  const authClient = await createSupabaseAuthClient()
  const { data: { user } } = await authClient.auth.getUser()
  if (!user) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  const body = await request.json()
  const { eventName, memberName, pin } = body as {
    eventName: string
    memberName: string
    pin: string
  }

  if (!eventName?.trim() || !memberName?.trim()) {
    return NextResponse.json({ error: 'Thiếu thông tin' }, { status: 400 })
  }
  if (!/^\d{6}$/.test(pin)) {
    return NextResponse.json({ error: 'PIN phải đúng 6 chữ số' }, { status: 400 })
  }

  const code = uid6()
  const initState: RoomState = {
    name: eventName.trim(),
    members: [{ name: memberName.trim(), pin: hashPin(pin) }],
    txs: [],
    created: Date.now(),
  }

  const supabase = await createSupabaseServerClient()

  // Tạo room
  const { error: roomError } = await supabase
    .from('rooms')
    .insert({ code, data: initState, updated_at: new Date().toISOString() })

  if (roomError) {
    return NextResponse.json({ error: 'Không tạo được phòng' }, { status: 500 })
  }

  // Ghi room_members
  await supabase.from('room_members').upsert({
    user_id: user.id,
    room_code: code,
    member_name: memberName.trim(),
  })

  return NextResponse.json({ code, data: initState }, { status: 201 })
}
```

- [ ] **Step 2: Tạo `app/api/rooms/[code]/route.ts` (GET + PATCH)**

```typescript
import { NextResponse, type NextRequest } from 'next/server'
import { createSupabaseServerClient, createSupabaseAuthClient } from '@/lib/supabase/server'
import { hashPin, ADMIN_NAME, ADMIN_PIN, getMembers } from '@/lib/utils'
import type { RoomState } from '@/lib/types'

// GET — đọc room data
export async function GET(
  _request: NextRequest,
  { params }: { params: Promise<{ code: string }> }
) {
  const { code } = await params
  const authClient = await createSupabaseAuthClient()
  const { data: { user } } = await authClient.auth.getUser()
  if (!user) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  const supabase = await createSupabaseServerClient()
  const { data, error } = await supabase
    .from('rooms')
    .select('data')
    .eq('code', code.toUpperCase())
    .single()

  if (error || !data) {
    return NextResponse.json({ error: 'Không tìm thấy phòng' }, { status: 404 })
  }

  return NextResponse.json({ data: data.data })
}

// PATCH — ghi room data (thêm tx, edit tx, add comment, etc.)
export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ code: string }> }
) {
  const { code } = await params
  const authClient = await createSupabaseAuthClient()
  const { data: { user } } = await authClient.auth.getUser()
  if (!user) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  const body = await request.json()
  const { newState, memberName, pin } = body as {
    newState: RoomState
    memberName: string
    pin?: string
  }

  if (!newState || !memberName) {
    return NextResponse.json({ error: 'Thiếu dữ liệu' }, { status: 400 })
  }

  const supabase = await createSupabaseServerClient()

  // Đọc state hiện tại để verify PIN
  const { data: current, error: readErr } = await supabase
    .from('rooms')
    .select('data')
    .eq('code', code.toUpperCase())
    .single()

  if (readErr || !current) {
    return NextResponse.json({ error: 'Không tìm thấy phòng' }, { status: 404 })
  }

  const currentState = current.data as RoomState
  const members = getMembers(currentState.members)

  // Admin bypass
  const isAdmin = memberName === ADMIN_NAME

  if (isAdmin) {
    if (pin !== ADMIN_PIN) {
      return NextResponse.json({ error: 'PIN admin không đúng' }, { status: 403 })
    }
  } else {
    // Verify member PIN
    const member = members.find(m => m.name === memberName)
    if (!member) {
      return NextResponse.json({ error: 'Thành viên không tồn tại' }, { status: 403 })
    }
    if (member.pin && pin) {
      const { hashPin: hp } = await import('@/lib/utils')
      if (hp(pin) !== member.pin) {
        return NextResponse.json({ error: 'PIN không đúng' }, { status: 403 })
      }
    }
  }

  // Ghi state mới
  const { error: writeErr } = await supabase
    .from('rooms')
    .update({ data: newState, updated_at: new Date().toISOString() })
    .eq('code', code.toUpperCase())

  if (writeErr) {
    return NextResponse.json({ error: 'Lỗi ghi dữ liệu' }, { status: 500 })
  }

  // Broadcast realtime event tới tất cả clients trong room
  await supabase.channel(`room:${code.toUpperCase()}`).send({
    type: 'broadcast',
    event: 'room_updated',
    payload: { data: newState },
  })

  // Upsert room_members
  await supabase.from('room_members').upsert({
    user_id: user.id,
    room_code: code.toUpperCase(),
    member_name: memberName,
  })

  return NextResponse.json({ data: newState })
}
```

- [ ] **Step 3: Commit**

```bash
git add app/api/rooms/
git commit -m "feat: add rooms API routes (create, read, write) with auth"
```

---

## Task 6: Global CSS & Root Layout

**Files:**
- Modify: `app/globals.css`
- Modify: `app/layout.tsx`

- [ ] **Step 1: Thay toàn bộ `app/globals.css`** bằng CSS từ phần `<style>` của `index.html` (từ dòng 9 đến trước `</style>`), thêm vào đầu:

```css
@import url('https://fonts.googleapis.com/css2?family=DM+Sans:ital,opsz,wght@0,9..40,300;0,9..40,400;0,9..40,500;0,9..40,600;1,9..40,300&family=DM+Mono:wght@400;500&display=swap');

*{box-sizing:border-box;margin:0;padding:0;-webkit-tap-highlight-color:transparent}
:root{
  --bg:#faf9f6;--bg2:#f3f1ec;--bg3:#e8e5de;
  --surface:#fff;--border:#e8e4db;--border2:#d4cfc5;
  --text:#1a1714;--t2:#6b6560;--t3:#a09990;
  --accent:#c4571a;--abg:#fdf0e8;--aborder:#f0cdb3;
  --green:#1a7a4a;--gbg:#e8f5ee;
  --red:#b83232;--rbg:#fceaea;
  --blue:#1a5c9e;--bbg:#e8f0fb;
  --gold:#9a6f0a;--ybg:#fef9e7;
  --r:14px;--rsm:9px;--rxs:6px;
  --sh:0 1px 3px rgba(0,0,0,.06),0 1px 2px rgba(0,0,0,.04);
  --shmd:0 4px 16px rgba(0,0,0,.09),0 2px 4px rgba(0,0,0,.05);
}
/* ... (copy toàn bộ CSS từ file gốc) ... */
```

- [ ] **Step 2: Cập nhật `app/layout.tsx`**

```tsx
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
```

- [ ] **Step 3: Commit**

```bash
git add app/globals.css app/layout.tsx
git commit -m "feat: add global CSS design system and root layout"
```

---

## Task 7: Login Page & Auth Components

**Files:**
- Create: `app/(auth)/login/page.tsx`
- Create: `components/auth/LoginButton.tsx`
- Create: `components/auth/UserMenu.tsx`

- [ ] **Step 1: Tạo `components/auth/LoginButton.tsx`**

```tsx
'use client'

import { getSupabaseBrowserClient } from '@/lib/supabase/client'

export default function LoginButton() {
  async function handleLogin() {
    const supabase = getSupabaseBrowserClient()
    await supabase.auth.signInWithOAuth({
      provider: 'google',
      options: {
        redirectTo: `${window.location.origin}/api/auth/callback`,
      },
    })
  }

  return (
    <button className="btn btn-p btn-full" onClick={handleLogin}>
      <svg width="18" height="18" viewBox="0 0 24 24" fill="none" style={{flexShrink:0}}>
        <path d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z" fill="#4285F4"/>
        <path d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" fill="#34A853"/>
        <path d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l3.66-2.84z" fill="#FBBC05"/>
        <path d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z" fill="#EA4335"/>
      </svg>
      Đăng nhập với Google
    </button>
  )
}
```

- [ ] **Step 2: Tạo `app/(auth)/login/page.tsx`**

```tsx
import LoginButton from '@/components/auth/LoginButton'

export default function LoginPage({
  searchParams,
}: {
  searchParams: Promise<{ error?: string }>
}) {
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
```

- [ ] **Step 3: Tạo `components/auth/UserMenu.tsx`**

```tsx
'use client'

import { getSupabaseBrowserClient } from '@/lib/supabase/client'
import { useRouter } from 'next/navigation'
import type { User } from '@supabase/supabase-js'

export default function UserMenu({ user }: { user: User }) {
  const router = useRouter()

  async function handleLogout() {
    const supabase = getSupabaseBrowserClient()
    await supabase.auth.signOut()
    router.push('/login')
  }

  const avatar = user.user_metadata?.avatar_url
  const name = user.user_metadata?.full_name || user.email || 'User'

  return (
    <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
      {avatar ? (
        // eslint-disable-next-line @next/next/no-img-element
        <img src={avatar} alt={name} style={{ width: 28, height: 28, borderRadius: '50%' }} />
      ) : (
        <div className="av sm c0" style={{ width: 28, height: 28, fontSize: 10 }}>
          {name.slice(0, 2).toUpperCase()}
        </div>
      )}
      <button
        className="btn btn-sm"
        onClick={handleLogout}
        style={{ fontSize: 12 }}
      >
        Đăng xuất
      </button>
    </div>
  )
}
```

- [ ] **Step 4: Commit**

```bash
git add app/\(auth\)/ components/auth/
git commit -m "feat: add login page and auth components"
```

---

## Task 8: Home Page (Tạo/Join Room)

**Files:**
- Create: `app/(app)/layout.tsx`
- Create: `app/(app)/page.tsx`

- [ ] **Step 1: Tạo `app/(app)/layout.tsx`**

```tsx
import { createSupabaseAuthClient } from '@/lib/supabase/server'
import { redirect } from 'next/navigation'

export default async function AppLayout({ children }: { children: React.ReactNode }) {
  const supabase = await createSupabaseAuthClient()
  const { data: { user } } = await supabase.auth.getUser()

  if (!user) {
    redirect('/login')
  }

  return <>{children}</>
}
```

- [ ] **Step 2: Tạo `app/(app)/page.tsx`**

```tsx
'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { hashPin, uid6 } from '@/lib/utils'

type Step = 'home' | 'create' | 'join' | 'join-member' | 'join-pin'

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
    // Lưu session vào localStorage
    localStorage.setItem(`room_${code}_member`, createName)
    localStorage.setItem(`room_${code}_pin`, createPin)
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
    setJoinMembers(data.members.map((m: any) => typeof m === 'string' ? { name: m, pin: '' } : m))
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
    // Update via PATCH (member chưa có PIN — dùng tên làm "pin" tạm cho phép)
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
      localStorage.setItem(`room_${code}_member`, 'admin')
      localStorage.setItem(`room_${code}_pin`, pinVal)
      router.push(`/room/${code}`)
      return
    }

    if (!member.pin) {
      // First time — set PIN
      if (!/^\d{6}$/.test(pinVal)) { setPinError('PIN phải đúng 6 chữ số!'); return }
      const { hashPin: hp } = await import('@/lib/utils')
      const updatedMembers = joinMembers.map(m =>
        m.name === selectedMember ? { ...m, pin: hp(pinVal) } : m
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
      localStorage.setItem(`room_${code}_member`, selectedMember)
      localStorage.setItem(`room_${code}_pin`, pinVal)
      router.push(`/room/${code}`)
      return
    }

    // Verify PIN — gọi GET để verify phía server (không verify client-side)
    localStorage.setItem(`room_${code}_member`, selectedMember)
    localStorage.setItem(`room_${code}_pin`, pinVal)
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
                  <span className={`av sm c${i % 8}`} style={{ width: 26, height: 26, fontSize: 9, display: 'inline-flex', alignItems: 'center', justifyContent: 'center', borderRadius: '50%', fontFamily: 'DM Mono, monospace', flexShrink: 0 }}>
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
```

- [ ] **Step 3: Commit**

```bash
git add app/\(app\)/
git commit -m "feat: add home page with create/join room flow"
```

---

## Task 9: RoomProvider (Context + Realtime)

**Files:**
- Create: `components/room/RoomProvider.tsx`

- [ ] **Step 1: Tạo `components/room/RoomProvider.tsx`**

```tsx
'use client'

import { createContext, useContext, useEffect, useReducer, useCallback, type ReactNode } from 'react'
import { getSupabaseBrowserClient } from '@/lib/supabase/client'
import { ADMIN_NAME } from '@/lib/utils'
import type { RoomState, Tx } from '@/lib/types'

interface RoomContextValue {
  st: RoomState
  myName: string
  isAdmin: boolean
  roomCode: string
  pin: string
  dispatch: (action: RoomAction) => void
  syncToServer: (newState: RoomState) => Promise<void>
}

type RoomAction =
  | { type: 'SET_STATE'; payload: RoomState }
  | { type: 'ADD_TX'; payload: Tx }
  | { type: 'UPDATE_TX'; payload: Tx }
  | { type: 'DELETE_TX'; payload: string }

function roomReducer(state: RoomState, action: RoomAction): RoomState {
  switch (action.type) {
    case 'SET_STATE':
      return action.payload
    case 'ADD_TX':
      return { ...state, txs: [...(state.txs || []), action.payload] }
    case 'UPDATE_TX':
      return { ...state, txs: state.txs.map(t => t.id === action.payload.id ? action.payload : t) }
    case 'DELETE_TX':
      return { ...state, txs: state.txs.filter(t => t.id !== action.payload) }
    default:
      return state
  }
}

const RoomContext = createContext<RoomContextValue | null>(null)

export function useRoom() {
  const ctx = useContext(RoomContext)
  if (!ctx) throw new Error('useRoom must be used within RoomProvider')
  return ctx
}

interface RoomProviderProps {
  children: ReactNode
  initialState: RoomState
  roomCode: string
  myName: string
  pin: string
}

export default function RoomProvider({ children, initialState, roomCode, myName, pin }: RoomProviderProps) {
  const [st, dispatch] = useReducer(roomReducer, initialState)
  const isAdmin = myName === ADMIN_NAME

  const syncToServer = useCallback(async (newState: RoomState) => {
    await fetch(`/api/rooms/${roomCode}`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ newState, memberName: myName, pin }),
    })
  }, [roomCode, myName, pin])

  // Subscribe Supabase Realtime
  useEffect(() => {
    const supabase = getSupabaseBrowserClient()
    const channel = supabase
      .channel(`room:${roomCode}`)
      .on('broadcast', { event: 'room_updated' }, ({ payload }) => {
        if (payload?.data) {
          dispatch({ type: 'SET_STATE', payload: payload.data as RoomState })
        }
      })
      .subscribe()

    return () => {
      supabase.removeChannel(channel)
    }
  }, [roomCode])

  return (
    <RoomContext.Provider value={{ st, myName, isAdmin, roomCode, pin, dispatch, syncToServer }}>
      {children}
    </RoomContext.Provider>
  )
}
```

- [ ] **Step 2: Commit**

```bash
git add components/room/RoomProvider.tsx
git commit -m "feat: add RoomProvider with Supabase Realtime subscription"
```

---

## Task 10: Room Page (Server Component)

**Files:**
- Create: `app/(app)/room/[code]/page.tsx`

- [ ] **Step 1: Tạo `app/(app)/room/[code]/page.tsx`**

```tsx
import { createSupabaseServerClient, createSupabaseAuthClient } from '@/lib/supabase/server'
import { redirect } from 'next/navigation'
import { cookies } from 'next/headers'
import RoomProvider from '@/components/room/RoomProvider'
import RoomShell from '@/components/room/RoomShell'
import type { RoomState } from '@/lib/types'

export default async function RoomPage({
  params,
}: {
  params: Promise<{ code: string }>
}) {
  const { code } = await params
  const roomCode = code.toUpperCase()

  // Verify auth
  const authClient = await createSupabaseAuthClient()
  const { data: { user } } = await authClient.auth.getUser()
  if (!user) redirect('/login')

  // Load room data
  const supabase = await createSupabaseServerClient()
  const { data, error } = await supabase
    .from('rooms')
    .select('data')
    .eq('code', roomCode)
    .single()

  if (error || !data) redirect('/?error=room_not_found')

  const initialState = data.data as RoomState

  // Đọc member session từ cookie (set bởi home page)
  const cookieStore = await cookies()
  const myName = cookieStore.get(`room_${roomCode}_member`)?.value || ''
  const pin = cookieStore.get(`room_${roomCode}_pin`)?.value || ''

  // Nếu chưa join room, về home
  if (!myName) redirect('/')

  return (
    <RoomProvider
      initialState={initialState}
      roomCode={roomCode}
      myName={myName}
      pin={pin}
    >
      <RoomShell />
    </RoomProvider>
  )
}
```

> **Lưu ý:** Home page dùng `localStorage` cho member/pin session. Room page server component không đọc được localStorage. Cần chuyển sang cookie. Cập nhật home page `handleCreate` và `handlePinSubmit` để set cookie thay vì localStorage:

Thêm helper này vào `app/(app)/page.tsx`:
```tsx
function setRoomSession(code: string, memberName: string, pin: string) {
  // Set cookie thay vì localStorage để server component đọc được
  document.cookie = `room_${code}_member=${encodeURIComponent(memberName)}; path=/; max-age=86400`
  document.cookie = `room_${code}_pin=${encodeURIComponent(pin)}; path=/; max-age=86400`
}
```

Thay `localStorage.setItem(...)` bằng `setRoomSession(code, memberName, pin)` trong tất cả nơi dùng.

- [ ] **Step 2: Tạo `components/room/RoomShell.tsx`** — client component bọc toàn bộ room UI

```tsx
'use client'

import { useState } from 'react'
import Topbar from './Topbar'
import TabBar from './TabBar'
import MembersTab from './tabs/MembersTab'
import SpendTab from './tabs/SpendTab'
import ResultTab from './tabs/ResultTab'

type Tab = 0 | 1 | 2

export default function RoomShell() {
  const [activeTab, setActiveTab] = useState<Tab>(0)

  return (
    <div>
      <Topbar />
      <TabBar activeTab={activeTab} onTabChange={setActiveTab} />
      <div className="shell">
        {activeTab === 0 && <MembersTab />}
        {activeTab === 1 && <SpendTab />}
        {activeTab === 2 && <ResultTab />}
      </div>
    </div>
  )
}
```

- [ ] **Step 3: Commit**

```bash
git add app/\(app\)/room/ components/room/RoomShell.tsx
git commit -m "feat: add room page with server-side data loading"
```

---

## Task 11: Topbar & TabBar Components

**Files:**
- Create: `components/room/Topbar.tsx`
- Create: `components/room/TabBar.tsx`

- [ ] **Step 1: Tạo `components/room/Topbar.tsx`**

```tsx
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
```

- [ ] **Step 2: Tạo `components/room/TabBar.tsx`**

```tsx
'use client'

const TABS = ['👥 Thành viên', '💰 Chi tiêu', '📊 Kết quả']

interface TabBarProps {
  activeTab: number
  onTabChange: (tab: number) => void
}

export default function TabBar({ activeTab, onTabChange }: TabBarProps) {
  return (
    <div className="tabbar">
      {TABS.map((label, i) => (
        <button
          key={i}
          className={`tab${activeTab === i ? ' active' : ''}`}
          onClick={() => onTabChange(i)}
        >
          {label}
        </button>
      ))}
    </div>
  )
}
```

- [ ] **Step 3: Commit**

```bash
git add components/room/Topbar.tsx components/room/TabBar.tsx
git commit -m "feat: add Topbar and TabBar components"
```

---

## Task 12: MembersTab

**Files:**
- Create: `components/room/tabs/MembersTab.tsx`

- [ ] **Step 1: Tạo `components/room/tabs/MembersTab.tsx`**

```tsx
'use client'

import { useState } from 'react'
import { useRoom } from '../RoomProvider'
import { getMembers, ini, cc, ADMIN_NAME } from '@/lib/utils'

export default function MembersTab() {
  const { st, myName, isAdmin, syncToServer } = useRoom()
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
```

- [ ] **Step 2: Commit**

```bash
git add components/room/tabs/MembersTab.tsx
git commit -m "feat: add MembersTab component"
```

---

## Task 13: SpendTab — AddTxForm & SplitToggle

**Files:**
- Create: `components/room/spend/AddTxForm.tsx`
- Create: `components/room/spend/SplitToggle.tsx`

- [ ] **Step 1: Tạo `components/room/spend/SplitToggle.tsx`**

```tsx
'use client'

import type { SplitMode } from '@/lib/types'

interface SplitToggleProps {
  mode: SplitMode
  onChange: (mode: SplitMode) => void
}

export default function SplitToggle({ mode, onChange }: SplitToggleProps) {
  return (
    <div className="split-mode-toggle">
      <button className={`smt-btn${mode === 'equal' ? ' active' : ''}`} onClick={() => onChange('equal')}>
        ⚖️ Chia đều
      </button>
      <button className={`smt-btn${mode === 'percent' ? ' active' : ''}`} onClick={() => onChange('percent')}>
        % Theo tỉ lệ
      </button>
      <button className={`smt-btn${mode === 'fixed' ? ' active' : ''}`} onClick={() => onChange('fixed')}>
        💰 Số tiền cố định
      </button>
    </div>
  )
}
```

- [ ] **Step 2: Tạo `components/room/spend/AddTxForm.tsx`**

```tsx
'use client'

import { useState } from 'react'
import { useRoom } from '../RoomProvider'
import SplitToggle from './SplitToggle'
import { uid, getNames, fmtK, ADMIN_NAME } from '@/lib/utils'
import type { SplitMode, Tx } from '@/lib/types'

export default function AddTxForm() {
  const { st, myName, syncToServer } = useRoom()
  const [desc, setDesc] = useState('')
  const [note, setNote] = useState('')
  const [amtK, setAmtK] = useState('')
  const [payer, setPayer] = useState<string | null>(null)
  const [selParts, setSelParts] = useState<string[]>([])
  const [splitMode, setSplitMode] = useState<SplitMode>('equal')
  const [customSplits, setCustomSplits] = useState<Record<string, number>>({})
  const [error, setError] = useState('')

  const members = getNames(st.members).filter(n => n !== ADMIN_NAME)

  function togglePart(name: string) {
    setSelParts(prev =>
      prev.includes(name) ? prev.filter(x => x !== name) : [...prev, name]
    )
  }

  function updateCustomSplit(name: string, val: string) {
    setCustomSplits(prev => ({ ...prev, [name]: parseFloat(val) || 0 }))
  }

  function getSplitSummary(): { total: number; ok: boolean; label: string } {
    const amt = parseFloat(amtK) || 0
    const vals = Object.values(customSplits).filter(v => v > 0)
    const total = vals.reduce((a, b) => a + b, 0)
    if (splitMode === 'percent') {
      return { total, ok: Math.abs(total - 100) < 0.01, label: `${Math.round(total * 10) / 10}% / 100%` }
    }
    return { total, ok: amt > 0 && Math.abs(total - amt) < 0.01, label: `${fmtK(total)} / ${amt ? fmtK(amt) : '?'}` }
  }

  async function handleAdd() {
    setError('')
    const amt = parseFloat(amtK)
    if (!desc.trim()) { setError('Nhập tên khoản chi!'); return }
    if (!amt || amt <= 0) { setError('Nhập số tiền hợp lệ!'); return }
    if (!payer) { setError('Chọn người trả!'); return }

    let parts: string[] = []
    let splits: Record<string, number> | null = null

    if (splitMode === 'equal') {
      parts = selParts.length ? [...selParts] : members
      splits = null
    } else if (splitMode === 'percent') {
      const entries = Object.entries(customSplits).filter(([, v]) => v > 0)
      if (!entries.length) { setError('Nhập tỉ lệ cho ít nhất 1 người!'); return }
      const total = entries.reduce((s, [, v]) => s + v, 0)
      if (Math.abs(total - 100) > 0.5) { setError(`Tổng tỉ lệ phải = 100% (hiện: ${Math.round(total)}%)`); return }
      parts = entries.map(([n]) => n)
      splits = {}
      entries.forEach(([n, pct]) => { splits![n] = Math.round(amt * pct / 100 * 100) / 100 })
    } else {
      const entries = Object.entries(customSplits).filter(([, v]) => v > 0)
      if (!entries.length) { setError('Nhập số tiền cho ít nhất 1 người!'); return }
      const total = entries.reduce((s, [, v]) => s + v, 0)
      if (Math.abs(total - amt) > 0.05) { setError(`Tổng phải = ${fmtK(amt)} (hiện: ${fmtK(total)})`); return }
      parts = entries.map(([n]) => n)
      splits = {}
      entries.forEach(([n, v]) => { splits![n] = v })
    }

    const newTx: Tx = {
      id: uid(),
      desc: desc.trim(),
      note: note.trim() || undefined,
      amountK: amt,
      payer,
      parts,
      splits,
      splitMode,
      by: myName,
      ts: Date.now(),
      comments: [],
    }

    const newState = { ...st, txs: [...(st.txs || []), newTx] }

    // Reset form
    setDesc(''); setNote(''); setAmtK(''); setPayer(null); setSelParts([])
    setCustomSplits({}); setSplitMode('equal')

    await syncToServer(newState)
  }

  const summary = splitMode !== 'equal' ? getSplitSummary() : null

  return (
    <div className="card" style={{ marginBottom: '.875rem' }}>
      <div className="cb">
        <div className="slbl">Thêm khoản chi</div>
        {error && <div style={{ color: 'var(--red)', fontSize: 13, marginBottom: 8 }}>{error}</div>}

        <div className="field">
          <label className="flbl">Tên khoản chi</label>
          <input type="text" placeholder="Cà phê, Ăn tối, Xăng xe..." value={desc} onChange={e => setDesc(e.target.value)} />
        </div>

        <div className="field">
          <label className="flbl">Mô tả <span className="fhint">tuỳ chọn</span></label>
          <textarea placeholder="Ghi chú thêm..." rows={2} style={{ fontSize: 13, padding: '7px 10px' }} value={note} onChange={e => setNote(e.target.value)} />
        </div>

        <div className="field">
          <label className="flbl">Số tiền <span className="fhint">nghìn đồng</span></label>
          <div className="amt-wrap">
            <input type="number" placeholder="150" min="0" inputMode="decimal" value={amtK} onChange={e => setAmtK(e.target.value)} />
            <span className="amt-sfx">k</span>
          </div>
        </div>

        <div className="field">
          <label className="flbl">Người trả</label>
          <div className="chips">
            {members.map(m => (
              <button key={m} className={`chip pay${payer === m ? ' on' : ''}`} onClick={() => setPayer(m)}>{m}</button>
            ))}
          </div>
        </div>

        <div className="field">
          <label className="flbl">Cách chia tiền</label>
          <SplitToggle mode={splitMode} onChange={mode => { setSplitMode(mode); setCustomSplits({}) }} />
        </div>

        {splitMode === 'equal' ? (
          <div className="field">
            <label className="flbl">Người tham gia <span className="fhint">bỏ trống = tất cả</span></label>
            <div className="chips">
              {members.map(m => (
                <button key={m} className={`chip${selParts.includes(m) ? ' on' : ''}`} onClick={() => togglePart(m)}>{m}</button>
              ))}
            </div>
          </div>
        ) : (
          <div className="field">
            <label className="flbl">
              {splitMode === 'percent' ? 'Tỉ lệ từng người (%)' : 'Số tiền từng người (k)'}
            </label>
            {members.map((m, i) => (
              <div key={m} className="part-row">
                <span className={`av xs c${i % 8}`} style={{ width: 22, height: 22, fontSize: 8, display: 'inline-flex', alignItems: 'center', justifyContent: 'center', borderRadius: '50%', fontFamily: 'DM Mono', flexShrink: 0 }}>
                  {m.trim().split(/\s+/).map(w => w[0]).join('').slice(0, 2).toUpperCase()}
                </span>
                <span className="part-name">{m}</span>
                <input
                  type="number"
                  className="part-input"
                  placeholder="0"
                  min="0"
                  inputMode="decimal"
                  value={customSplits[m] || ''}
                  onChange={e => updateCustomSplit(m, e.target.value)}
                />
                <span className="part-unit">{splitMode === 'percent' ? '%' : 'k'}</span>
              </div>
            ))}
            {summary && (
              <div className="split-summary" style={{ display: 'flex' }}>
                <span>Tổng: <strong>{summary.label}</strong></span>
                <span className={summary.ok ? 'split-ok' : 'split-warn'}>
                  {summary.ok ? '✓ Đúng' : '⚠ Chưa khớp'}
                </span>
              </div>
            )}
          </div>
        )}

        <button className="btn btn-p btn-full" style={{ marginTop: '.6rem' }} onClick={handleAdd}>
          + Thêm khoản
        </button>
      </div>
    </div>
  )
}
```

- [ ] **Step 3: Commit**

```bash
git add components/room/spend/AddTxForm.tsx components/room/spend/SplitToggle.tsx
git commit -m "feat: add AddTxForm and SplitToggle components"
```

---

## Task 14: TxCard & TxList

**Files:**
- Create: `components/room/spend/TxCard.tsx`
- Create: `components/room/spend/TxList.tsx`
- Create: `components/room/tabs/SpendTab.tsx`

- [ ] **Step 1: Tạo `components/room/spend/TxCard.tsx`**

```tsx
'use client'

import { useState } from 'react'
import { useRoom } from '../RoomProvider'
import { ini, cc, fmtK, timeAgo, uid, getNames, ADMIN_NAME } from '@/lib/utils'
import type { Tx, SplitMode } from '@/lib/types'

export default function TxCard({ tx }: { tx: Tx }) {
  const { st, myName, isAdmin, syncToServer } = useRoom()
  const [open, setOpen] = useState(false)
  const [editing, setEditing] = useState(false)
  const [cmtText, setCmtText] = useState('')

  // Edit state
  const [editDesc, setEditDesc] = useState(tx.desc)
  const [editNote, setEditNote] = useState(tx.note || '')
  const [editAmt, setEditAmt] = useState(String(tx.amountK))
  const [editPayer, setEditPayer] = useState(tx.payer)
  const [editSplitMode, setEditSplitMode] = useState<SplitMode>(tx.splitMode || 'equal')
  const [editParts, setEditParts] = useState<string[]>(tx.parts)

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

  async function handleSaveEdit() {
    const amt = parseFloat(editAmt)
    if (!editDesc.trim() || !amt || amt <= 0) return
    const updated: Tx = {
      ...tx,
      desc: editDesc.trim(),
      note: editNote.trim() || undefined,
      amountK: amt,
      payer: editPayer,
      parts: editParts.length ? editParts : nonAdminMembers,
      splits: null,
      splitMode: editSplitMode,
      edited: Date.now(),
    }
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
    <div className={`txcard${isMine ? ' mine' : isAdmin ? ' admin-edit' : ''}`}>
      {/* Head */}
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

      {/* Expandable */}
      {open && (
        <div className="tx-expand open">
          {/* Note */}
          {tx.note && !editing && (
            <div style={{ padding: '8px 12px 0', fontSize: 13, color: 'var(--t2)', lineHeight: 1.5, whiteSpace: 'pre-wrap' }}>
              {tx.note}
            </div>
          )}

          {/* Edit form */}
          {editing && canEdit && (
            <div className="edit-form">
              <div className="slbl" style={{ marginBottom: '.5rem' }}>✏️ Chỉnh sửa</div>
              <div className="edit-row">
                <div style={{ flex: 1 }}>
                  <label className="flbl" style={{ fontSize: 11 }}>Tên khoản</label>
                  <input type="text" value={editDesc} onChange={e => setEditDesc(e.target.value)} style={{ fontSize: 13, padding: '7px 10px' }} />
                </div>
                <div style={{ width: 110 }}>
                  <label className="flbl" style={{ fontSize: 11 }}>Tiền (k)</label>
                  <div className="amt-wrap">
                    <input type="number" value={editAmt} onChange={e => setEditAmt(e.target.value)} style={{ fontSize: 13, padding: '7px 30px 7px 10px', fontFamily: 'DM Mono' }} />
                    <span className="amt-sfx" style={{ right: 8, fontSize: 11 }}>k</span>
                  </div>
                </div>
              </div>
              <div style={{ marginBottom: 8 }}>
                <label className="flbl" style={{ fontSize: 11 }}>Mô tả</label>
                <textarea rows={2} value={editNote} onChange={e => setEditNote(e.target.value)} style={{ fontSize: 13, padding: '7px 10px' }} />
              </div>
              <div style={{ marginBottom: 6 }}>
                <label className="flbl" style={{ fontSize: 11 }}>Người trả</label>
                <div className="chips" style={{ marginTop: 4 }}>
                  {nonAdminMembers.map(m => (
                    <button key={m} className={`chip pay${editPayer === m ? ' on' : ''}`} onClick={() => setEditPayer(m)} style={{ padding: '4px 10px', fontSize: 12 }}>{m}</button>
                  ))}
                </div>
              </div>
              <div style={{ marginBottom: 8 }}>
                <label className="flbl" style={{ fontSize: 11 }}>Người tham gia</label>
                <div className="chips" style={{ marginTop: 4 }}>
                  {nonAdminMembers.map(m => (
                    <button key={m} className={`chip${editParts.includes(m) ? ' on' : ''}`}
                      onClick={() => setEditParts(prev => prev.includes(m) ? prev.filter(x => x !== m) : [...prev, m])}
                      style={{ padding: '4px 10px', fontSize: 12 }}>{m}</button>
                  ))}
                </div>
              </div>
              <div style={{ display: 'flex', gap: 7 }}>
                <button className="btn btn-p btn-sm" onClick={handleSaveEdit}>Lưu</button>
                <button className="btn btn-sm" onClick={() => setEditing(false)}>Hủy</button>
              </div>
            </div>
          )}

          {/* Action bar */}
          {!editing && canEdit && (
            <div style={{ padding: '8px 12px', background: 'var(--abg)', borderBottom: '1px solid var(--aborder)', display: 'flex', gap: 7, alignItems: 'center' }}>
              <span style={{ fontSize: 11, color: 'var(--accent)', fontWeight: 500, flex: 1 }}>
                {isAdmin && !isMine ? '👑 Quyền admin' : 'Khoản chi của bạn'}
              </span>
              <button className="btn btn-xs" onClick={() => setEditing(true)} style={{ borderColor: 'var(--aborder)', color: 'var(--accent)' }}>✏️ Sửa</button>
              <button className="btn btn-xs" onClick={handleDelete} style={{ borderColor: 'rgba(184,50,50,.3)', color: 'var(--red)' }}>🗑 Xóa</button>
            </div>
          )}

          {/* Comments */}
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
```

- [ ] **Step 2: Tạo `components/room/spend/TxList.tsx`**

```tsx
'use client'

import { useRoom } from '../RoomProvider'
import TxCard from './TxCard'

export default function TxList() {
  const { st } = useRoom()
  const txs = [...(st.txs || [])].reverse()

  if (!txs.length) {
    return (
      <div className="empty">
        <div className="ei">🧾</div>
        Chưa có khoản nào
      </div>
    )
  }

  return (
    <div>
      {txs.map(tx => <TxCard key={tx.id} tx={tx} />)}
    </div>
  )
}
```

- [ ] **Step 3: Tạo `components/room/tabs/SpendTab.tsx`**

```tsx
'use client'

import AddTxForm from '../spend/AddTxForm'
import TxList from '../spend/TxList'

export default function SpendTab() {
  return (
    <div>
      <AddTxForm />
      <div className="slbl">Lịch sử chi tiêu</div>
      <TxList />
    </div>
  )
}
```

- [ ] **Step 4: Commit**

```bash
git add components/room/spend/ components/room/tabs/SpendTab.tsx
git commit -m "feat: add TxCard, TxList, and SpendTab components"
```

---

## Task 15: ResultTab

**Files:**
- Create: `components/room/result/StatsBar.tsx`
- Create: `components/room/result/BalanceList.tsx`
- Create: `components/room/result/TransferList.tsx`
- Create: `components/room/tabs/ResultTab.tsx`

- [ ] **Step 1: Thêm `calcBal` và `calcTf` vào `lib/utils.ts`**

```typescript
// Thêm vào cuối lib/utils.ts

import type { Tx, Transfer } from './types'

export function calcBal(txs: Tx[], memberNames: string[]): Record<string, number> {
  const b: Record<string, number> = {}
  memberNames.forEach(m => { b[m] = 0 })
  txs.forEach(t => {
    const k = t.amountK || 0
    if (t.splits && Object.keys(t.splits).length) {
      Object.entries(t.splits).forEach(([p, sh]) => {
        if (b[p] !== undefined) b[p] -= sh
      })
    } else {
      const sh = k / t.parts.length
      t.parts.forEach(p => { if (b[p] !== undefined) b[p] -= sh })
    }
    if (b[t.payer] !== undefined) b[t.payer] += k
  })
  return b
}

export function calcTf(bal: Record<string, number>): Transfer[] {
  const deb = Object.entries(bal).filter(([, v]) => v < -0.01).map(([n, v]) => ({ n, v })).sort((a, b) => a.v - b.v)
  const cre = Object.entries(bal).filter(([, v]) => v > 0.01).map(([n, v]) => ({ n, v })).sort((a, b) => b.v - a.v)
  const out: Transfer[] = []
  let i = 0, j = 0
  while (i < deb.length && j < cre.length) {
    const d = deb[i], c = cre[j]
    const a = Math.min(-d.v, c.v)
    out.push({ from: d.n, to: c.n, amountK: a })
    d.v += a; c.v -= a
    if (Math.abs(d.v) < 0.01) i++
    if (Math.abs(c.v) < 0.01) j++
  }
  return out
}
```

- [ ] **Step 2: Tạo `components/room/result/StatsBar.tsx`**

```tsx
'use client'

import { useRoom } from '../RoomProvider'
import { fmtK, calcBal, calcTf, getNames, ADMIN_NAME } from '@/lib/utils'

export default function StatsBar() {
  const { st } = useRoom()
  const txs = st.txs || []
  const totalK = txs.reduce((s, t) => s + (t.amountK || 0), 0)
  const members = getNames(st.members).filter(m => m !== ADMIN_NAME)
  const bal = txs.length ? calcBal(txs, members) : {}
  const tfs = txs.length ? calcTf({ ...bal }) : []

  return (
    <div className="stats">
      <div className="stat">
        <div className="stat-n">{txs.length ? fmtK(totalK) : '—'}</div>
        <div className="stat-l">Tổng chi</div>
      </div>
      <div className="stat">
        <div className="stat-n">{txs.length || '—'}</div>
        <div className="stat-l">Khoản</div>
      </div>
      <div className="stat">
        <div className="stat-n">{txs.length ? tfs.length : '—'}</div>
        <div className="stat-l">Chuyển CK</div>
      </div>
    </div>
  )
}
```

- [ ] **Step 3: Tạo `components/room/result/BalanceList.tsx`**

```tsx
'use client'

import { useRoom } from '../RoomProvider'
import { fmtK, calcBal, ini, cc, getNames, ADMIN_NAME } from '@/lib/utils'

export default function BalanceList() {
  const { st } = useRoom()
  const txs = st.txs || []
  const members = getNames(st.members).filter(m => m !== ADMIN_NAME)
  const bal = txs.length ? calcBal(txs, members) : {}

  if (!members.length) {
    return <div className="empty"><div className="ei">👤</div>Chưa có thành viên</div>
  }

  return (
    <div>
      {members.map((m, i) => {
        const b = bal[m] || 0
        const col = b > 0.01 ? 'var(--green)' : b < -0.01 ? 'var(--red)' : 'var(--t3)'
        const lbl = b > 0.01 ? 'được nhận' : b < -0.01 ? 'cần trả' : 'hòa vốn'
        return (
          <div key={m} style={{ display: 'flex', alignItems: 'center', gap: 10, padding: '10px 0', borderBottom: '1px solid var(--border)' }}>
            <div className={`av ${cc(i)}`}>{ini(m)}</div>
            <div style={{ flex: 1 }}>
              <div style={{ fontWeight: 500, fontSize: 14 }}>{m}</div>
              <div style={{ fontSize: 12, color: 'var(--t3)' }}>{lbl}</div>
            </div>
            <div style={{ fontFamily: 'DM Mono', fontSize: 15, fontWeight: 600, color: col }}>
              {b > 0.01 ? '+' : ''}{fmtK(Math.abs(b))}
            </div>
          </div>
        )
      })}
    </div>
  )
}
```

- [ ] **Step 4: Tạo `components/room/result/TransferList.tsx`**

```tsx
'use client'

import { useRoom } from '../RoomProvider'
import { fmtK, calcBal, calcTf, ini, cc, getNames, ADMIN_NAME } from '@/lib/utils'

export default function TransferList() {
  const { st } = useRoom()
  const txs = st.txs || []
  const members = getNames(st.members).filter(m => m !== ADMIN_NAME)
  const bal = txs.length ? calcBal(txs, members) : {}
  const tfs = txs.length ? calcTf({ ...bal }) : []

  if (!tfs.length) {
    return <div className="empty"><div className="ei">💸</div>{txs.length ? 'Mọi người hòa vốn!' : 'Chưa có dữ liệu'}</div>
  }

  return (
    <div>
      {tfs.map((tf, i) => {
        const fromIdx = members.indexOf(tf.from)
        const toIdx = members.indexOf(tf.to)
        return (
          <div key={i} style={{ display: 'flex', alignItems: 'center', gap: 10, padding: '10px 0', borderBottom: '1px solid var(--border)' }}>
            <div className={`av ${cc(fromIdx >= 0 ? fromIdx : 0)}`}>{ini(tf.from)}</div>
            <div style={{ flex: 1, fontSize: 14 }}>
              <strong>{tf.from}</strong>
              <span style={{ color: 'var(--t3)', margin: '0 6px' }}>→</span>
              <strong>{tf.to}</strong>
            </div>
            <div style={{ fontFamily: 'DM Mono', fontSize: 15, fontWeight: 600, color: 'var(--accent)' }}>
              {fmtK(tf.amountK)}
            </div>
          </div>
        )
      })}
    </div>
  )
}
```

- [ ] **Step 5: Tạo `components/room/tabs/ResultTab.tsx`**

```tsx
'use client'

import StatsBar from '../result/StatsBar'
import BalanceList from '../result/BalanceList'
import TransferList from '../result/TransferList'
import { useRoom } from '../RoomProvider'
import { calcBal, calcTf, fmtK, getNames, ADMIN_NAME } from '@/lib/utils'

export default function ResultTab() {
  const { st, myName } = useRoom()

  function copyResult() {
    const txs = st.txs || []
    const members = getNames(st.members).filter(m => m !== ADMIN_NAME)
    const bal = calcBal(txs, members)
    const tfs = calcTf({ ...bal })
    const totalK = txs.reduce((s, t) => s + (t.amountK || 0), 0)
    let text = `💸 ${st.name}\nTổng chi: ${fmtK(totalK)}\n\nSố dư:\n`
    members.forEach(m => {
      const b = bal[m] || 0
      text += `  ${m}: ${b > 0 ? '+' : ''}${fmtK(b)}\n`
    })
    if (tfs.length) {
      text += '\nChuyển khoản:\n'
      tfs.forEach(tf => { text += `  ${tf.from} → ${tf.to}: ${fmtK(tf.amountK)}\n` })
    }
    navigator.clipboard.writeText(text)
  }

  return (
    <div>
      <StatsBar />

      <div className="slbl" style={{ marginBottom: '.6rem' }}>Số dư từng người</div>
      <div className="card" style={{ marginBottom: '.875rem' }}>
        <div className="cb" style={{ paddingTop: '.75rem', paddingBottom: '.75rem' }}>
          <BalanceList />
        </div>
      </div>

      <div className="slbl" style={{ marginBottom: '.6rem' }}>Ai cần chuyển tiền cho ai</div>
      <div className="card" style={{ marginBottom: '.875rem' }}>
        <div className="cb" style={{ paddingTop: '.75rem', paddingBottom: '.75rem' }}>
          <TransferList />
        </div>
      </div>

      {(st.txs || []).length > 0 && (
        <button className="sharebtn" onClick={copyResult} style={{ width: '100%', padding: '12px', borderRadius: 'var(--rsm)', border: '1.5px solid var(--border2)', background: 'var(--surface)', cursor: 'pointer', fontSize: 14, fontWeight: 500 }}>
          📋 Copy kết quả gửi nhóm chat
        </button>
      )}
    </div>
  )
}
```

- [ ] **Step 6: Commit**

```bash
git add components/room/result/ components/room/tabs/ResultTab.tsx lib/utils.ts
git commit -m "feat: add ResultTab with balance and transfer calculation"
```

---

## Task 16: DEPLOYMENT.md & .env.example

**Files:**
- Create: `DEPLOYMENT.md`

- [ ] **Step 1: Tạo `DEPLOYMENT.md`**

```markdown
# Hướng Dẫn Deploy Bill Splitter App

## 1. Setup Supabase Project

### 1a. Tạo project mới
1. Vào [supabase.com](https://supabase.com) → New Project
2. Đặt tên, chọn region (Southeast Asia), đặt mật khẩu DB

### 1b. Tạo bảng
Vào **SQL Editor** và chạy:

```sql
-- Bảng rooms (nếu chưa có)
CREATE TABLE IF NOT EXISTS rooms (
  code        TEXT PRIMARY KEY,
  data        JSONB NOT NULL,
  updated_at  TIMESTAMPTZ DEFAULT NOW()
);

-- Bảng room_members
CREATE TABLE IF NOT EXISTS room_members (
  user_id     UUID REFERENCES auth.users(id) ON DELETE CASCADE,
  room_code   TEXT REFERENCES rooms(code) ON DELETE CASCADE,
  member_name TEXT NOT NULL,
  joined_at   TIMESTAMPTZ DEFAULT NOW(),
  PRIMARY KEY (user_id, room_code)
);

-- Enable Realtime
ALTER PUBLICATION supabase_realtime ADD TABLE rooms;
```

### 1c. Lấy API Keys
Vào **Settings → API**:
- **Project URL** → `NEXT_PUBLIC_SUPABASE_URL`
- **anon/public** key → `NEXT_PUBLIC_SUPABASE_ANON_KEY`
- **service_role** key → `SUPABASE_SERVICE_ROLE_KEY` ⚠️ Không commit key này!

---

## 2. Setup Google OAuth

### 2a. Google Cloud Console
1. Vào [console.cloud.google.com](https://console.cloud.google.com)
2. Tạo project mới (hoặc chọn project có sẵn)
3. **APIs & Services → OAuth consent screen**
   - User Type: External
   - Điền App name, support email, developer email
4. **APIs & Services → Credentials → Create Credentials → OAuth 2.0 Client ID**
   - Application type: **Web application**
   - Authorized redirect URIs: `https://<your-supabase-project>.supabase.co/auth/v1/callback`

### 2b. Cấu hình trong Supabase
1. Supabase Dashboard → **Authentication → Providers → Google**
2. Enable Google provider
3. Điền **Client ID** và **Client Secret** từ Google Cloud Console
4. Lưu

---

## 3. Deploy lên Vercel

### 3a. Push code lên GitHub
```bash
git remote add origin https://github.com/LeVu132003/Bill-Splitter-App.git
git push -u origin main
```

### 3b. Import vào Vercel
1. Vào [vercel.com](https://vercel.com) → New Project
2. Import repo `Bill-Splitter-App` từ GitHub
3. Framework: **Next.js** (tự detect)
4. **Environment Variables** — thêm 3 biến:
   ```
   NEXT_PUBLIC_SUPABASE_URL = https://xxx.supabase.co
   NEXT_PUBLIC_SUPABASE_ANON_KEY = eyJ...
   SUPABASE_SERVICE_ROLE_KEY = eyJ...
   ```
5. Click **Deploy**

### 3c. Cập nhật redirect URI
Sau khi deploy xong, copy domain Vercel (vd: `bill-splitter-app.vercel.app`).
Quay lại Google Cloud Console → OAuth credentials → thêm:
```
https://bill-splitter-app.vercel.app/api/auth/callback
```

---

## 4. Chạy Local Development

```bash
# Clone repo
git clone https://github.com/LeVu132003/Bill-Splitter-App.git
cd Bill-Splitter-App

# Cài dependencies
npm install

# Setup env
cp .env.example .env.local
# Điền các giá trị vào .env.local

# Chạy dev server
npm run dev
# → http://localhost:3000
```

### Thêm localhost vào Google OAuth
Trong Google Cloud Console → OAuth credentials → thêm Authorized redirect URI:
```
http://localhost:3000/api/auth/callback
```

---

## 5. Kiểm tra Deploy

- [ ] Truy cập domain Vercel → redirect về `/login`
- [ ] Click "Đăng nhập với Google" → OAuth flow hoạt động
- [ ] Tạo phòng mới → nhận room code
- [ ] Mở tab khác → join phòng → thêm chi tiêu → thấy realtime update
- [ ] Xem tab Kết quả → tính toán đúng
```

- [ ] **Step 2: Commit**

```bash
git add DEPLOYMENT.md
git commit -m "docs: add deployment guide for Supabase, Google OAuth, and Vercel"
```

---

## Task 17: Push to GitHub & Final Check

- [ ] **Step 1: Thêm remote GitHub**

```bash
cd /Users/lehoanganhvu/Downloads/bill-splitter-app
git remote add origin https://github.com/LeVu132003/Bill-Splitter-App.git
```

- [ ] **Step 2: Kiểm tra build không có lỗi TypeScript**

```bash
npm run build
```

Expected: Build thành công, không có TypeScript errors. Nếu có lỗi, fix trước khi push.

- [ ] **Step 3: Push lên GitHub**

```bash
git push -u origin main
```

- [ ] **Step 4: Verify trên GitHub**

Mở `https://github.com/LeVu132003/Bill-Splitter-App` — kiểm tra tất cả files đã có:
- `app/`, `components/`, `lib/`, `middleware.ts`, `DEPLOYMENT.md`, `.env.example`

---

## Self-Review — Spec Coverage

| Spec requirement | Task |
|---|---|
| Next.js 15 App Router | Task 1 |
| TypeScript | Task 1, 2 |
| Supabase Auth (Google OAuth) | Task 3, 4, 7 |
| Room code + PIN vẫn work | Task 5, 8 |
| SUPABASE_SERVICE_ROLE_KEY server-side only | Task 3, 5 |
| API Routes cho mọi DB write | Task 5 |
| Supabase Realtime Broadcast | Task 9 |
| RoomContext + dispatch | Task 9 |
| Middleware bảo vệ /room/* | Task 4 |
| Giữ nguyên design system CSS | Task 6 |
| MembersTab | Task 12 |
| AddTxForm + SplitToggle | Task 13 |
| TxCard (edit, delete, comments) | Task 14 |
| ResultTab (balance, transfer, copy) | Task 15 |
| DEPLOYMENT.md | Task 16 |
| Push lên GitHub | Task 17 |
| room_members table | Task 5 (upsert khi join) |
| calcBal + calcTf | Task 15 |
