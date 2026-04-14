# Bill Splitter App — Next.js Migration Design
**Date:** 2026-04-14  
**Status:** Approved

## Overview

Migrate "Chia Tiền Nhóm" từ single HTML file sang Next.js 15 App Router để deploy lên Vercel. Thêm Google Auth qua Supabase Auth, nâng cấp từ polling lên Supabase Realtime (WebSocket). Supabase service key chỉ tồn tại server-side (API Routes), client không bao giờ có quyền ghi DB trực tiếp.

---

## Tech Stack

| Layer | Technology |
|---|---|
| Framework | Next.js 15 (App Router) |
| Styling | CSS Modules (giữ nguyên CSS variables/design system hiện tại) |
| Auth | Supabase Auth (Google OAuth) |
| Database | Supabase (PostgreSQL, bảng `rooms` hiện tại + thêm `room_members`) |
| Realtime | Supabase Realtime Broadcast |
| Deployment | Vercel (serverless, zero-config) |
| Language | TypeScript |

---

## Project Structure

```
bill-splitter-app/
├── app/
│   ├── (auth)/
│   │   └── login/
│   │       └── page.tsx              # Google OAuth login page
│   ├── (app)/
│   │   ├── layout.tsx                # Auth-protected layout
│   │   ├── page.tsx                  # Home: tạo/join room
│   │   └── room/
│   │       └── [code]/
│   │           └── page.tsx          # Room page
│   └── api/
│       ├── auth/
│       │   └── callback/
│       │       └── route.ts          # Supabase OAuth callback
│       └── rooms/
│           ├── route.ts              # POST: tạo phòng mới
│           └── [code]/
│               └── route.ts          # GET: đọc room, PATCH: ghi room data
├── components/
│   ├── auth/
│   │   ├── LoginButton.tsx
│   │   └── UserMenu.tsx
│   └── room/
│       ├── RoomProvider.tsx          # Context + Realtime listener
│       ├── Topbar.tsx
│       ├── TabBar.tsx
│       ├── tabs/
│       │   ├── MembersTab.tsx
│       │   ├── SpendTab.tsx
│       │   └── ResultTab.tsx
│       └── spend/
│           ├── AddTxForm.tsx
│           ├── SplitToggle.tsx
│           ├── TxList.tsx
│           └── TxCard.tsx
├── lib/
│   ├── supabase/
│   │   ├── server.ts                 # createServerClient (service role key)
│   │   └── client.ts                 # createBrowserClient (anon key, Realtime only)
│   └── utils.ts                      # fmtK, timeAgo, uid, hashPin, ini, cc
├── middleware.ts                      # Bảo vệ route /room/* — redirect /login nếu chưa auth
├── .env.local                        # Env vars (không commit)
├── .env.example                      # Template env vars (commit)
├── DEPLOYMENT.md                     # Hướng dẫn deploy đầy đủ
└── docs/superpowers/specs/
    └── 2026-04-14-nextjs-migration-design.md
```

---

## Architecture

### Auth Flow

1. User vào app → middleware check session → chưa login → redirect `/login`
2. Click "Đăng nhập với Google" → Supabase OAuth redirect Google
3. Google callback → `/api/auth/callback` → Supabase tạo session cookie
4. Middleware cho qua → vào home page

### Room Access (giữ room code + PIN)

1. User login → vào `/` → nhập room code hoặc tạo phòng mới
2. Join room: nhập tên + PIN → `POST /api/rooms/[code]` verify PIN hash server-side
3. Server set cookie `{roomCode, memberName}` — không cần nhập lại
4. Admin PIN giữ nguyên logic hiện tại (`admin` / hash)
5. Supabase Auth user ID được map với member name qua bảng `room_members`

### Data Flow

```
User action (thêm chi tiêu)
  → PATCH /api/rooms/[code]         (server: verify session, verify PIN, ghi DB)
  → Server broadcast Supabase event  (sau khi ghi thành công)
  → Tất cả client trong room nhận    (Realtime WebSocket)
  → RoomProvider cập nhật state      (React re-render)
```

### Security Model

- `SUPABASE_SERVICE_ROLE_KEY` chỉ dùng trong API Routes (server-side) — không bao giờ expose ra client
- `NEXT_PUBLIC_SUPABASE_ANON_KEY` dùng ở client chỉ để subscribe Realtime (read-only channel)
- Mọi write operation đi qua API Routes — có auth check trước khi ghi
- PIN hash dùng djb2 (giữ nguyên từ code cũ) — không phải crypto nhưng đủ cho use case này

---

## Database Schema

```sql
-- Bảng hiện tại (giữ nguyên)
CREATE TABLE rooms (
  code        TEXT PRIMARY KEY,
  data        JSONB NOT NULL,
  updated_at  TIMESTAMPTZ DEFAULT NOW()
);

-- Bảng mới
CREATE TABLE room_members (
  user_id     UUID REFERENCES auth.users(id) ON DELETE CASCADE,
  room_code   TEXT REFERENCES rooms(code) ON DELETE CASCADE,
  member_name TEXT NOT NULL,
  joined_at   TIMESTAMPTZ DEFAULT NOW(),
  PRIMARY KEY (user_id, room_code)
);

-- Enable Realtime cho bảng rooms
ALTER PUBLICATION supabase_realtime ADD TABLE rooms;
```

---

## State Management

- Không dùng Redux/Zustand — React Context đủ cho scope này
- `RoomContext` export: `{ st, myName, isAdmin, dispatch }`
- `dispatch` actions: `ADD_TX | EDIT_TX | DELETE_TX | ADD_COMMENT | ADD_MEMBER`
- Realtime listener đặt trong `RoomProvider`, tự sync state khi nhận broadcast

---

## Environment Variables

```env
# .env.local (không commit)

# Public — dùng được ở browser (chỉ cho Realtime subscribe)
NEXT_PUBLIC_SUPABASE_URL=https://xxx.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=eyJ...

# Private — chỉ server-side (API Routes)
SUPABASE_SERVICE_ROLE_KEY=eyJ...
```

Google OAuth credentials được cấu hình trong **Supabase Dashboard** (Authentication > Providers > Google) — không cần thêm vào `.env`.

---

## UI Migration Strategy

- Giữ nguyên toàn bộ design system: CSS variables, color palette, typography (DM Sans + DM Mono), border radius, shadows
- Chuyển inline `<style>` sang `app/globals.css` + CSS Modules per component
- Logic JS (fmtK, timeAgo, hashPin, split calculations) chuyển nguyên sang `lib/utils.ts`
- Không redesign UI — chỉ componentize

---

## Realtime Implementation

Dùng Supabase Broadcast (không phải Postgres Changes):
- Đơn giản hơn, không cần enable row-level replication
- Server broadcast sau mỗi write thành công
- Client subscribe: `supabase.channel('room:ABC123').on('broadcast', ...)`

---

## Deliverables

1. Next.js 15 project với đầy đủ tính năng hiện tại
2. Google Auth (Supabase Auth) + giữ room code/PIN
3. Supabase Realtime thay thế polling
4. `DEPLOYMENT.md` — hướng dẫn đầy đủ setup Supabase, Google OAuth, Vercel
5. `.env.example` — template env vars
6. Push lên GitHub: `https://github.com/LeVu132003/Bill-Splitter-App.git`
