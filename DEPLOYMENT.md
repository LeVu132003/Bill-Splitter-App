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
