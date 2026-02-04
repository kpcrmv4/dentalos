# DentalFlow OS

ระบบบริหารจัดการสต็อกรากฟันเทียมและเวิร์กโฟลว์คลินิก

## Tech Stack

- **Frontend:** Next.js 14+ (App Router), React 18, TypeScript
- **Styling:** Tailwind CSS, shadcn/ui
- **Database:** Supabase (PostgreSQL)
- **Auth:** Supabase Auth
- **Deployment:** Vercel

## Getting Started

### 1. Install dependencies

```bash
npm install
```

### 2. Setup Supabase

1. สร้างโปรเจคใหม่ที่ [supabase.com](https://supabase.com)
2. ไปที่ Settings > API และคัดลอก URL และ anon key
3. สร้างไฟล์ `.env.local`:

```env
NEXT_PUBLIC_SUPABASE_URL=your-supabase-url
NEXT_PUBLIC_SUPABASE_ANON_KEY=your-anon-key
```

4. รัน SQL migration ใน Supabase SQL Editor:
   - เปิดไฟล์ `supabase/migrations/20260204000000_init.sql`
   - คัดลอกและรันใน SQL Editor

### 3. Create Storage Bucket

ใน Supabase Dashboard:
1. ไปที่ Storage
2. สร้าง bucket ชื่อ "photos"
3. ตั้งค่าเป็น Private

### 4. Run development server

```bash
npm run dev
```

เปิด [http://localhost:3000](http://localhost:3000)

## Project Structure

```
src/
├── app/                    # Next.js App Router
│   ├── (dashboard)/       # Dashboard routes (protected)
│   ├── login/             # Login page
│   └── layout.tsx         # Root layout
├── components/
│   ├── dashboard/         # Dashboard components
│   ├── layout/            # Layout components
│   └── ui/                # shadcn/ui components
├── lib/
│   ├── supabase/          # Supabase client
│   ├── database.types.ts  # TypeScript types
│   └── utils.ts           # Utility functions
└── middleware.ts          # Auth middleware
```

## User Roles

| Role | Description |
|------|-------------|
| admin | ผู้บริหาร - Full access |
| dentist | ทันตแพทย์ - Cases, Reservations |
| assistant | ผู้ช่วยทันตแพทย์ - Stock deduction |
| inventory | ฝ่ายคลัง - Inventory management |
| cs | Customer Service - Calendar view |

## Deploy to Vercel

[![Deploy with Vercel](https://vercel.com/button)](https://vercel.com/new/clone?repository-url=https://github.com/your-repo/dentalflow)

1. คลิก Deploy to Vercel
2. เพิ่ม Environment Variables:
   - `NEXT_PUBLIC_SUPABASE_URL`
   - `NEXT_PUBLIC_SUPABASE_ANON_KEY`
3. Deploy!

## License

MIT
