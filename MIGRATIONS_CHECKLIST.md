# SQL Migrations Checklist

**สถานะ**: ⚠️ ต้อง Apply ก่อนใช้งาน

## ไฟล์ที่ต้อง Apply (ตามลำดับ)

- [ ] **1. notifications_audit.sql**
  - ขนาด: 13 KB
  - จุดประสงค์: ระบบแจ้งเตือน In-App และ Audit Trail
  - ไฟล์: `supabase/migrations/20260204000001_notifications_audit.sql`

- [ ] **2. reservation_advanced.sql**
  - ขนาด: 21 KB
  - จุดประสงค์: Logic การจอง (คืนของ, เปลี่ยนอุปกรณ์, ดึงของจากเคสอื่น)
  - ไฟล์: `supabase/migrations/20260204000002_reservation_advanced.sql`

- [ ] **3. product_attributes.sql**
  - ขนาด: 19 KB
  - จุดประสงค์: Dynamic Product Attributes ตามหมวดหมู่
  - ไฟล์: `supabase/migrations/20260204000003_product_attributes.sql`

- [ ] **4. smart_search.sql**
  - ขนาด: 15 KB
  - จุดประสงค์: Smart Search + FEFO + แนะนำวัสดุคล้ายกัน
  - ไฟล์: `supabase/migrations/20260204000004_smart_search.sql`

- [ ] **5. out_of_stock_requests.sql**
  - ขนาด: 18 KB
  - จุดประสงค์: Out-of-Stock Request System + Purchase Orders + LINE Integration
  - ไฟล์: `supabase/migrations/20260204000005_out_of_stock_requests.sql`

---

## วิธี Apply

### Option 1: ผ่าน Supabase Dashboard (แนะนำ)

1. ไปที่ [Supabase Dashboard](https://supabase.com/dashboard)
2. เลือก Project ของคุณ
3. ไปที่ **SQL Editor**
4. Copy เนื้อหาจากไฟล์แต่ละไฟล์มาวาง
5. กด **Run** ตามลำดับ

### Option 2: ผ่าน Supabase CLI

```bash
# ติดตั้ง Supabase CLI (ถ้ายังไม่มี)
npm install -g supabase

# Login
supabase login

# Link project
supabase link --project-ref YOUR_PROJECT_REF

# Apply migrations
supabase db push
```

---

## หลัง Apply แล้ว

1. ✅ ตรวจสอบว่าไม่มี Error
2. ✅ ทดสอบ Functions ใหม่
3. ✅ ตั้งค่า LINE Messaging API (ถ้าต้องการใช้)
4. ✅ เพิ่ม Supplier LINE Contacts
5. ✅ ทดสอบระบบจองวัสดุ
6. ✅ ทดสอบ Out-of-Stock Request

---

## หมายเหตุ

- ⚠️ **ต้อง Apply ตามลำดับ** เพราะมี Dependencies กัน
- ⚠️ **Backup Database ก่อน** (แนะนำ)
- ⚠️ ไฟล์ `20260204000000_init.sql` และ `20260204000001_storage.sql` เป็นไฟล์เดิม ไม่ต้อง Apply ใหม่

---

**อัพเดทล่าสุด**: 4 กุมภาพันธ์ 2569
