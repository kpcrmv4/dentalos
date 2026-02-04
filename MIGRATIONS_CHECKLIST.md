# SQL Migrations Checklist

**สถานะ**: ⚠️ ต้อง Apply ก่อนใช้งาน

---

## ไฟล์ที่ต้อง Apply (ตามลำดับ)

### ไฟล์เดิม (ควร Apply ไปแล้ว)
- [x] `20260204000000_init.sql` - Schema หลัก
- [x] `20260204000001_storage.sql` - Storage buckets
- [x] `20260204000002_seed_data.sql` - ข้อมูลเริ่มต้น

### ไฟล์ใหม่ที่ต้อง Apply

| # | ไฟล์ | ขนาด | จุดประสงค์ |
|---|------|------|-----------|
| 1 | `20260204000001_notifications_audit.sql` | 13 KB | ระบบแจ้งเตือน In-App และ Audit Trail |
| 2 | `20260204000002_reservation_advanced.sql` | 21 KB | Logic การจอง (คืนของ, เปลี่ยนอุปกรณ์, ดึงของจากเคสอื่น) |
| 3 | `20260204000003_product_attributes.sql` | 19 KB | Dynamic Product Attributes ตามหมวดหมู่ |
| 4 | `20260204000004_smart_search.sql` | 17 KB | Smart Search + FEFO + แนะนำวัสดุคล้ายกัน |
| 5 | `20260204000005_out_of_stock_requests.sql` | 15 KB | Out-of-Stock Request + Purchase Orders + LINE |
| 6 | `20260204000006_po_receive_integration.sql` | 16 KB | เชื่อมโยง PO กับรับของเข้าคลัง + Auto-Allocation |
| 7 | `20260204000007_dentist_dashboard.sql` | 17 KB | **Dentist Dashboard** - ข้อมูลเฉพาะทันตแพทย์ |

---

## สรุปฟีเจอร์ที่ได้จากแต่ละ Migration

### Migration #1: Notifications & Audit
- ✅ ระบบแจ้งเตือน In-App ตาม Role
- ✅ แจ้งเตือนตัวต่อตัวสำหรับทันตแพทย์
- ✅ Audit Trail บันทึกทุกการเปลี่ยนแปลง

### Migration #2: Advanced Reservation
- ✅ คืนของที่ไม่ได้ใช้
- ✅ ใช้บางส่วน
- ✅ เปลี่ยนอุปกรณ์
- ✅ ดึงของจากเคสอื่น
- ✅ อัพเดท Traffic Light อัตโนมัติ

### Migration #3: Product Attributes
- ✅ Dynamic Attributes ตามหมวดหมู่ (Diameter, Length, Platform)
- ✅ Category Templates
- ✅ สินค้าบางประเภทไม่มีวันหมดอายุ

### Migration #4: Smart Search
- ✅ ค้นหาสินค้าแบบ Autocomplete
- ✅ เรียงตาม FEFO (First Expiry First Out)
- ✅ แนะนำวัสดุคล้ายกัน

### Migration #5: Out-of-Stock Requests
- ✅ ทันตแพทย์ยืนยันใช้ของหมด → แจ้งฝ่ายคลัง
- ✅ สร้าง PO อัตโนมัติ
- ✅ LINE Messaging API Integration

### Migration #6: PO Receive Integration
- ✅ รับของโดยอ้างอิง PO
- ✅ Auto-Allocation ตัดเข้ารายการจอง (FIFO)
- ✅ อัพเดท Traffic Light อัตโนมัติ
- ✅ แจ้งเตือนทันตแพทย์เมื่อของมาแล้ว

### Migration #7: Dentist Dashboard ⭐ NEW!
- ✅ สถิติส่วนตัว (เคสทั้งหมด, รอจองวัสดุ, พร้อม/ไม่พร้อม)
- ✅ เคสใหม่ที่ได้รับมอบหมาย
- ✅ เคสที่ต้องดำเนินการ
- ✅ ปฏิทินเคส + เลือกช่วงเวลา
- ✅ มุมมองตาราง และ Timeline
- ✅ วัสดุที่ใช้บ่อย
- ✅ ประสิทธิภาพส่วนตัว

---

## วิธี Apply

### Option 1: ผ่าน Supabase Dashboard (แนะนำ)

1. ไปที่ [Supabase Dashboard](https://supabase.com/dashboard)
2. เลือก Project ของคุณ
3. ไปที่ **SQL Editor**
4. Copy เนื้อหาจากไฟล์แต่ละไฟล์มาวาง
5. กด **Run** ตามลำดับ (1 → 7)

### Option 2: ผ่าน Supabase CLI

```bash
supabase login
supabase link --project-ref YOUR_PROJECT_REF
supabase db push
```

---

## หมายเหตุ

- ⚠️ **ต้อง Apply ตามลำดับ** เพราะมี Dependencies กัน
- ⚠️ **Backup Database ก่อน** (แนะนำ)

---

**อัพเดทล่าสุด**: 4 กุมภาพันธ์ 2569 (เพิ่ม Migration #7 - Dentist Dashboard)
