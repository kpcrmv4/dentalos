-- =====================================================
-- DentalFlow OS - Seed Data
-- Version: 1.0.0
-- Created: 2026-02-04
-- Run this after creating a user in Supabase Auth
-- =====================================================

-- Note: You must first create a user in Supabase Auth Dashboard
-- Then get their UUID and replace 'YOUR_USER_UUID' below

-- Disable audit triggers during seed data insertion
DROP TRIGGER IF EXISTS audit_products ON products;
DROP TRIGGER IF EXISTS audit_stock_items ON stock_items;
DROP TRIGGER IF EXISTS audit_cases ON cases;
DROP TRIGGER IF EXISTS audit_reservations ON reservations;
DROP TRIGGER IF EXISTS audit_purchase_orders ON purchase_orders;

-- =====================================================
-- 1. SAMPLE PRODUCTS
-- =====================================================

-- Get category IDs
DO $$
DECLARE
  v_implant_cat UUID;
  v_abutment_cat UUID;
  v_bonegraft_cat UUID;
  v_membrane_cat UUID;
  v_str_supplier UUID;
  v_nb_supplier UUID;
  v_oss_supplier UUID;
  v_bio_supplier UUID;
BEGIN
  -- Get category IDs
  SELECT id INTO v_implant_cat FROM categories WHERE name = 'Implant' LIMIT 1;
  SELECT id INTO v_abutment_cat FROM categories WHERE name = 'Abutment' LIMIT 1;
  SELECT id INTO v_bonegraft_cat FROM categories WHERE name = 'Bone Graft' LIMIT 1;
  SELECT id INTO v_membrane_cat FROM categories WHERE name = 'Membrane' LIMIT 1;

  -- Get supplier IDs
  SELECT id INTO v_str_supplier FROM suppliers WHERE code = 'STR' LIMIT 1;
  SELECT id INTO v_nb_supplier FROM suppliers WHERE code = 'NB' LIMIT 1;
  SELECT id INTO v_oss_supplier FROM suppliers WHERE code = 'OSS' LIMIT 1;
  SELECT id INTO v_bio_supplier FROM suppliers WHERE code = 'BIO' LIMIT 1;

  -- Insert products if not exists
  INSERT INTO products (supplier_id, category_id, sku, name, brand, size, unit, reorder_point, standard_cost)
  SELECT * FROM (VALUES
    (v_str_supplier, v_implant_cat, 'STR-BLT-410', 'Straumann BLT Implant 4.1x10mm', 'Straumann', '4.1x10mm', 'ชิ้น', 5, 25000.00),
    (v_str_supplier, v_implant_cat, 'STR-BLT-412', 'Straumann BLT Implant 4.1x12mm', 'Straumann', '4.1x12mm', 'ชิ้น', 5, 25000.00),
    (v_str_supplier, v_implant_cat, 'STR-BLT-450', 'Straumann BLT Implant 4.5x10mm', 'Straumann', '4.5x10mm', 'ชิ้น', 3, 26000.00),
    (v_str_supplier, v_abutment_cat, 'STR-ABT-RC', 'Straumann RC Abutment', 'Straumann', 'RC', 'ชิ้น', 5, 8000.00),
    (v_nb_supplier, v_implant_cat, 'NB-ACT-350', 'Nobel Active Implant 3.5x10mm', 'Nobel Biocare', '3.5x10mm', 'ชิ้น', 5, 28000.00),
    (v_nb_supplier, v_implant_cat, 'NB-ACT-400', 'Nobel Active Implant 4.0x10mm', 'Nobel Biocare', '4.0x10mm', 'ชิ้น', 5, 28000.00),
    (v_nb_supplier, v_abutment_cat, 'NB-ABT-MUA', 'Nobel Multi-Unit Abutment', 'Nobel Biocare', 'MUA', 'ชิ้น', 3, 12000.00),
    (v_oss_supplier, v_implant_cat, 'OSS-TS3-408', 'Osstem TS III 4.0x8mm', 'Osstem', '4.0x8mm', 'ชิ้น', 5, 12000.00),
    (v_oss_supplier, v_implant_cat, 'OSS-TS3-412', 'Osstem TS III 4.0x12mm', 'Osstem', '4.0x12mm', 'ชิ้น', 5, 12000.00),
    (v_oss_supplier, v_implant_cat, 'OSS-TS3-510', 'Osstem TS III 5.0x10mm', 'Osstem', '5.0x10mm', 'ชิ้น', 3, 13000.00),
    (v_bio_supplier, v_bonegraft_cat, 'BIO-OSS-05', 'Bio-Oss Bone Graft 0.5g', 'Geistlich', '0.5g', 'กล่อง', 5, 4500.00),
    (v_bio_supplier, v_bonegraft_cat, 'BIO-OSS-10', 'Bio-Oss Bone Graft 1.0g', 'Geistlich', '1.0g', 'กล่อง', 3, 7500.00),
    (v_bio_supplier, v_membrane_cat, 'BIO-GIDE-S', 'Bio-Gide Membrane Small', 'Geistlich', '25x25mm', 'ชิ้น', 5, 6500.00),
    (v_bio_supplier, v_membrane_cat, 'BIO-GIDE-L', 'Bio-Gide Membrane Large', 'Geistlich', '30x40mm', 'ชิ้น', 3, 9500.00)
  ) AS t(supplier_id, category_id, sku, name, brand, size, unit, reorder_point, standard_cost)
  WHERE NOT EXISTS (SELECT 1 FROM products WHERE sku = t.sku);
END $$;

-- =====================================================
-- 2. SAMPLE STOCK ITEMS
-- =====================================================

DO $$
DECLARE
  v_product RECORD;
BEGIN
  -- Add stock for each product
  FOR v_product IN
    SELECT id, sku FROM products
  LOOP
    -- Add 2-3 LOT numbers for each product
    INSERT INTO stock_items (product_id, lot_number, expiry_date, quantity, reserved_quantity, cost_price, location, status)
    SELECT * FROM (VALUES
      (v_product.id, 'LOT-2026-' || SUBSTRING(v_product.sku, 1, 3) || '-001', '2027-06-15'::DATE, 10, 0, 20000.00, 'A-01-01', 'active'),
      (v_product.id, 'LOT-2026-' || SUBSTRING(v_product.sku, 1, 3) || '-002', '2027-03-20'::DATE, 5, 0, 20000.00, 'A-01-02', 'active'),
      (v_product.id, 'LOT-2026-' || SUBSTRING(v_product.sku, 1, 3) || '-003', '2026-04-10'::DATE, 3, 0, 20000.00, 'B-01-01', 'active')
    ) AS t(product_id, lot_number, expiry_date, quantity, reserved_quantity, cost_price, location, status)
    WHERE NOT EXISTS (SELECT 1 FROM stock_items WHERE lot_number = t.lot_number);
  END LOOP;
END $$;

-- =====================================================
-- 3. SAMPLE PATIENTS
-- =====================================================

INSERT INTO patients (hn_number, full_name, phone, email, date_of_birth, notes)
SELECT * FROM (VALUES
  ('HN-001234', 'คุณสมศักดิ์ ใจดี', '081-234-5678', 'somsak@email.com', '1975-05-15'::DATE, 'ผู้ป่วยดูแลเป็นอย่างดี'),
  ('HN-001235', 'คุณมาลี สุขใจ', '082-345-6789', 'malee@email.com', '1982-08-20'::DATE, NULL),
  ('HN-001236', 'คุณประสิทธิ์ มั่นคง', '083-456-7890', 'prasit@email.com', '1968-12-01'::DATE, 'แพ้ยา Penicillin'),
  ('HN-001237', 'คุณวิภา รักษ์สุข', '084-567-8901', 'wipa@email.com', '1990-03-10'::DATE, NULL),
  ('HN-001238', 'คุณสมชาย ดีใจ', '085-678-9012', 'somchai@email.com', '1985-07-25'::DATE, NULL),
  ('HN-001239', 'คุณนิภา แก้วใส', '086-789-0123', 'nipa@email.com', '1978-11-30'::DATE, 'เบาหวาน ความดัน')
) AS t(hn_number, full_name, phone, email, date_of_birth, notes)
WHERE NOT EXISTS (SELECT 1 FROM patients WHERE hn_number = t.hn_number);

-- =====================================================
-- 4. SAMPLE CASES (requires user profile to exist)
-- =====================================================

DO $$
DECLARE
  v_dentist_id UUID;
  v_patient1_id UUID;
  v_patient2_id UUID;
  v_patient3_id UUID;
  v_patient4_id UUID;
  v_patient5_id UUID;
BEGIN
  -- Get first admin/dentist profile
  SELECT id INTO v_dentist_id FROM profiles LIMIT 1;

  -- Get patient IDs
  SELECT id INTO v_patient1_id FROM patients WHERE hn_number = 'HN-001234' LIMIT 1;
  SELECT id INTO v_patient2_id FROM patients WHERE hn_number = 'HN-001235' LIMIT 1;
  SELECT id INTO v_patient3_id FROM patients WHERE hn_number = 'HN-001236' LIMIT 1;
  SELECT id INTO v_patient4_id FROM patients WHERE hn_number = 'HN-001237' LIMIT 1;
  SELECT id INTO v_patient5_id FROM patients WHERE hn_number = 'HN-001238' LIMIT 1;

  -- Only insert if we have a dentist profile
  IF v_dentist_id IS NOT NULL AND v_patient1_id IS NOT NULL THEN
    -- Insert cases for this month
    INSERT INTO cases (case_number, patient_id, dentist_id, scheduled_date, scheduled_time, procedure_type, traffic_light, status, notes)
    SELECT * FROM (VALUES
      ('C2026-0001', v_patient1_id, v_dentist_id, CURRENT_DATE, '09:00'::TIME, 'Implant Placement', 'green', 'scheduled', 'เตรียมของครบแล้ว'),
      ('C2026-0002', v_patient2_id, v_dentist_id, CURRENT_DATE, '13:00'::TIME, 'Bone Graft', 'yellow', 'scheduled', 'รอของจาก PO'),
      ('C2026-0003', v_patient3_id, v_dentist_id, CURRENT_DATE + INTERVAL '1 day', '10:00'::TIME, 'Implant Placement', 'red', 'scheduled', 'ยังขาดวัสดุ'),
      ('C2026-0004', v_patient4_id, v_dentist_id, CURRENT_DATE + INTERVAL '2 days', '14:00'::TIME, 'Sinus Lift', 'green', 'scheduled', NULL),
      ('C2026-0005', v_patient5_id, v_dentist_id, CURRENT_DATE + INTERVAL '3 days', '09:30'::TIME, 'Implant Placement', 'green', 'scheduled', NULL),
      ('C2026-0006', v_patient1_id, v_dentist_id, CURRENT_DATE + INTERVAL '7 days', '11:00'::TIME, 'Abutment Connection', 'green', 'scheduled', 'นัดต่อเนื่อง'),
      ('C2026-0007', v_patient2_id, v_dentist_id, CURRENT_DATE - INTERVAL '5 days', '10:00'::TIME, 'Implant Placement', 'green', 'completed', 'เสร็จเรียบร้อย'),
      ('C2026-0008', v_patient3_id, v_dentist_id, CURRENT_DATE - INTERVAL '10 days', '14:30'::TIME, 'Bone Graft', 'green', 'completed', NULL)
    ) AS t(case_number, patient_id, dentist_id, scheduled_date, scheduled_time, procedure_type, traffic_light, status, notes)
    WHERE NOT EXISTS (SELECT 1 FROM cases WHERE case_number = t.case_number);
  END IF;
END $$;

-- =====================================================
-- 5. SAMPLE PURCHASE ORDERS
-- =====================================================

DO $$
DECLARE
  v_user_id UUID;
  v_str_supplier UUID;
  v_nb_supplier UUID;
  v_oss_supplier UUID;
  v_po1_id UUID;
  v_po2_id UUID;
  v_po3_id UUID;
  v_product RECORD;
BEGIN
  SELECT id INTO v_user_id FROM profiles LIMIT 1;
  SELECT id INTO v_str_supplier FROM suppliers WHERE code = 'STR' LIMIT 1;
  SELECT id INTO v_nb_supplier FROM suppliers WHERE code = 'NB' LIMIT 1;
  SELECT id INTO v_oss_supplier FROM suppliers WHERE code = 'OSS' LIMIT 1;

  IF v_user_id IS NOT NULL THEN
    -- Insert POs
    INSERT INTO purchase_orders (po_number, supplier_id, status, ordered_at, expected_at, total_amount, created_by)
    SELECT * FROM (VALUES
      ('PO-2026-0001', v_str_supplier, 'sent', NOW() - INTERVAL '7 days', (CURRENT_DATE + INTERVAL '7 days')::DATE, 250000.00, v_user_id),
      ('PO-2026-0002', v_nb_supplier, 'draft', NULL, NULL, 180000.00, v_user_id),
      ('PO-2026-0003', v_oss_supplier, 'received', NOW() - INTERVAL '14 days', (CURRENT_DATE - INTERVAL '7 days')::DATE, 120000.00, v_user_id),
      ('PO-2026-0004', v_str_supplier, 'partial', NOW() - INTERVAL '10 days', (CURRENT_DATE - INTERVAL '3 days')::DATE, 85000.00, v_user_id)
    ) AS t(po_number, supplier_id, status, ordered_at, expected_at, total_amount, created_by)
    WHERE NOT EXISTS (SELECT 1 FROM purchase_orders WHERE po_number = t.po_number)
    RETURNING id INTO v_po1_id;

    -- Get PO IDs for items
    SELECT id INTO v_po1_id FROM purchase_orders WHERE po_number = 'PO-2026-0001';
    SELECT id INTO v_po2_id FROM purchase_orders WHERE po_number = 'PO-2026-0002';
    SELECT id INTO v_po3_id FROM purchase_orders WHERE po_number = 'PO-2026-0003';

    -- Insert PO items
    IF v_po1_id IS NOT NULL THEN
      FOR v_product IN SELECT id FROM products WHERE sku LIKE 'STR%' LIMIT 3
      LOOP
        INSERT INTO po_items (po_id, product_id, quantity_ordered, quantity_received, unit_price, status)
        VALUES (v_po1_id, v_product.id, 5, 0, 25000.00, 'pending')
        ON CONFLICT DO NOTHING;
      END LOOP;
    END IF;
  END IF;
END $$;

-- =====================================================
-- 6. SAMPLE RESERVATIONS
-- =====================================================

DO $$
DECLARE
  v_case RECORD;
  v_stock RECORD;
  v_user_id UUID;
BEGIN
  SELECT id INTO v_user_id FROM profiles LIMIT 1;

  IF v_user_id IS NOT NULL THEN
    -- Create reservations for scheduled cases
    FOR v_case IN
      SELECT c.id as case_id
      FROM cases c
      WHERE c.status = 'scheduled'
      LIMIT 3
    LOOP
      -- Get a random stock item
      SELECT s.id as stock_id INTO v_stock
      FROM stock_items s
      WHERE s.status = 'active' AND s.quantity > s.reserved_quantity
      LIMIT 1;

      IF v_stock IS NOT NULL THEN
        INSERT INTO reservations (case_id, stock_item_id, quantity, status, reserved_by)
        VALUES (v_case.case_id, v_stock.stock_id, 1, 'reserved', v_user_id)
        ON CONFLICT DO NOTHING;

        -- Update reserved quantity
        UPDATE stock_items SET reserved_quantity = reserved_quantity + 1 WHERE id = v_stock.stock_id;
      END IF;
    END LOOP;
  END IF;
END $$;

-- =====================================================
-- 7. SAMPLE NOTIFICATIONS
-- =====================================================

DO $$
DECLARE
  v_user_id UUID;
BEGIN
  SELECT id INTO v_user_id FROM profiles LIMIT 1;

  IF v_user_id IS NOT NULL THEN
    INSERT INTO notifications (user_id, type, title, message, is_read)
    SELECT * FROM (VALUES
      (v_user_id, 'low_stock', 'สินค้าใกล้หมด', 'Nobel Active Implant 3.5x10mm เหลือ 2 ชิ้น', false),
      (v_user_id, 'expiring', 'สินค้าใกล้หมดอายุ', 'Bio-Oss Bone Graft 0.5g หมดอายุใน 60 วัน', false),
      (v_user_id, 'case', 'เคสวันนี้', 'มี 3 เคสที่นัดหมายวันนี้', true),
      (v_user_id, 'transfer', 'รอคืนของ', 'TR-2026-0001 เกินกำหนดคืน 2 วัน', true)
    ) AS t(user_id, type, title, message, is_read)
    WHERE NOT EXISTS (SELECT 1 FROM notifications WHERE user_id = v_user_id AND title = t.title);
  END IF;
END $$;

-- =====================================================
-- 8. RE-ENABLE AUDIT TRIGGERS
-- =====================================================

-- Re-create audit triggers after seed data insertion
CREATE TRIGGER audit_products
  AFTER INSERT OR UPDATE OR DELETE ON products
  FOR EACH ROW EXECUTE FUNCTION audit_trigger_func();

CREATE TRIGGER audit_stock_items
  AFTER INSERT OR UPDATE OR DELETE ON stock_items
  FOR EACH ROW EXECUTE FUNCTION audit_trigger_func();

CREATE TRIGGER audit_cases
  AFTER INSERT OR UPDATE OR DELETE ON cases
  FOR EACH ROW EXECUTE FUNCTION audit_trigger_func();

CREATE TRIGGER audit_reservations
  AFTER INSERT OR UPDATE OR DELETE ON reservations
  FOR EACH ROW EXECUTE FUNCTION audit_trigger_func();

CREATE TRIGGER audit_purchase_orders
  AFTER INSERT OR UPDATE OR DELETE ON purchase_orders
  FOR EACH ROW EXECUTE FUNCTION audit_trigger_func();
