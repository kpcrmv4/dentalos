-- =====================================================
-- DentalFlow OS - Seed Data (FIXED VERSION v3)
-- Version: 3.0.0
-- Created: 2026-02-04
-- =====================================================

-- Disable audit triggers during seed data insertion
DROP TRIGGER IF EXISTS audit_products ON products;
DROP TRIGGER IF EXISTS audit_stock_items ON stock_items;
DROP TRIGGER IF EXISTS audit_cases ON cases;
DROP TRIGGER IF EXISTS audit_reservations ON reservations;
DROP TRIGGER IF EXISTS audit_purchase_orders ON purchase_orders;

-- =====================================================
-- 0. ADD UNIQUE CONSTRAINTS IF NOT EXISTS
-- =====================================================

-- Add unique constraint on products.sku if not exists
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint WHERE conname = 'products_sku_unique'
  ) THEN
    ALTER TABLE products ADD CONSTRAINT products_sku_unique UNIQUE (sku);
  END IF;
END $$;

-- Add unique constraint on patients.hn_number if not exists
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint WHERE conname = 'patients_hn_number_unique'
  ) THEN
    ALTER TABLE patients ADD CONSTRAINT patients_hn_number_unique UNIQUE (hn_number);
  END IF;
END $$;

-- Add unique constraint on cases.case_number if not exists
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint WHERE conname = 'cases_case_number_unique'
  ) THEN
    ALTER TABLE cases ADD CONSTRAINT cases_case_number_unique UNIQUE (case_number);
  END IF;
END $$;

-- Add unique constraint on purchase_orders.po_number if not exists
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint WHERE conname = 'purchase_orders_po_number_unique'
  ) THEN
    ALTER TABLE purchase_orders ADD CONSTRAINT purchase_orders_po_number_unique UNIQUE (po_number);
  END IF;
END $$;

-- Add unique constraint on stock_items.lot_number if not exists
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint WHERE conname = 'stock_items_lot_number_unique'
  ) THEN
    ALTER TABLE stock_items ADD CONSTRAINT stock_items_lot_number_unique UNIQUE (lot_number);
  END IF;
END $$;

-- =====================================================
-- 1. SAMPLE PRODUCTS
-- =====================================================

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
  -- Get single category ID each
  SELECT id INTO v_implant_cat FROM categories WHERE name = 'Implant' ORDER BY id LIMIT 1;
  SELECT id INTO v_abutment_cat FROM categories WHERE name = 'Abutment' ORDER BY id LIMIT 1;
  SELECT id INTO v_bonegraft_cat FROM categories WHERE name = 'Bone Graft' ORDER BY id LIMIT 1;
  SELECT id INTO v_membrane_cat FROM categories WHERE name = 'Membrane' ORDER BY id LIMIT 1;

  -- Get single supplier ID each
  SELECT id INTO v_str_supplier FROM suppliers WHERE code = 'STR' ORDER BY id LIMIT 1;
  SELECT id INTO v_nb_supplier FROM suppliers WHERE code = 'NB' ORDER BY id LIMIT 1;
  SELECT id INTO v_oss_supplier FROM suppliers WHERE code = 'OSS' ORDER BY id LIMIT 1;
  SELECT id INTO v_bio_supplier FROM suppliers WHERE code = 'BIO' ORDER BY id LIMIT 1;

  -- Only insert if categories and suppliers exist
  IF v_implant_cat IS NOT NULL AND v_str_supplier IS NOT NULL THEN
    INSERT INTO products (supplier_id, category_id, sku, name, brand, size, unit, reorder_point, standard_cost)
    VALUES (v_str_supplier, v_implant_cat, 'STR-BLT-410', 'Straumann BLT Implant 4.1x10mm', 'Straumann', '4.1x10mm', 'ชิ้น', 5, 25000.00)
    ON CONFLICT (sku) DO NOTHING;
    
    INSERT INTO products (supplier_id, category_id, sku, name, brand, size, unit, reorder_point, standard_cost)
    VALUES (v_str_supplier, v_implant_cat, 'STR-BLT-412', 'Straumann BLT Implant 4.1x12mm', 'Straumann', '4.1x12mm', 'ชิ้น', 5, 25000.00)
    ON CONFLICT (sku) DO NOTHING;
    
    INSERT INTO products (supplier_id, category_id, sku, name, brand, size, unit, reorder_point, standard_cost)
    VALUES (v_str_supplier, v_implant_cat, 'STR-BLT-450', 'Straumann BLT Implant 4.5x10mm', 'Straumann', '4.5x10mm', 'ชิ้น', 3, 26000.00)
    ON CONFLICT (sku) DO NOTHING;
    
    INSERT INTO products (supplier_id, category_id, sku, name, brand, size, unit, reorder_point, standard_cost)
    VALUES (v_str_supplier, v_abutment_cat, 'STR-ABT-RC', 'Straumann RC Abutment', 'Straumann', 'RC', 'ชิ้น', 5, 8000.00)
    ON CONFLICT (sku) DO NOTHING;
  END IF;
  
  IF v_nb_supplier IS NOT NULL AND v_implant_cat IS NOT NULL THEN
    INSERT INTO products (supplier_id, category_id, sku, name, brand, size, unit, reorder_point, standard_cost)
    VALUES (v_nb_supplier, v_implant_cat, 'NB-ACT-350', 'Nobel Active Implant 3.5x10mm', 'Nobel Biocare', '3.5x10mm', 'ชิ้น', 5, 28000.00)
    ON CONFLICT (sku) DO NOTHING;
    
    INSERT INTO products (supplier_id, category_id, sku, name, brand, size, unit, reorder_point, standard_cost)
    VALUES (v_nb_supplier, v_implant_cat, 'NB-ACT-400', 'Nobel Active Implant 4.0x10mm', 'Nobel Biocare', '4.0x10mm', 'ชิ้น', 5, 28000.00)
    ON CONFLICT (sku) DO NOTHING;
    
    INSERT INTO products (supplier_id, category_id, sku, name, brand, size, unit, reorder_point, standard_cost)
    VALUES (v_nb_supplier, v_abutment_cat, 'NB-ABT-MUA', 'Nobel Multi-Unit Abutment', 'Nobel Biocare', 'MUA', 'ชิ้น', 3, 12000.00)
    ON CONFLICT (sku) DO NOTHING;
  END IF;
  
  IF v_oss_supplier IS NOT NULL AND v_implant_cat IS NOT NULL THEN
    INSERT INTO products (supplier_id, category_id, sku, name, brand, size, unit, reorder_point, standard_cost)
    VALUES (v_oss_supplier, v_implant_cat, 'OSS-TS3-408', 'Osstem TS III 4.0x8mm', 'Osstem', '4.0x8mm', 'ชิ้น', 5, 12000.00)
    ON CONFLICT (sku) DO NOTHING;
    
    INSERT INTO products (supplier_id, category_id, sku, name, brand, size, unit, reorder_point, standard_cost)
    VALUES (v_oss_supplier, v_implant_cat, 'OSS-TS3-412', 'Osstem TS III 4.0x12mm', 'Osstem', '4.0x12mm', 'ชิ้น', 5, 12000.00)
    ON CONFLICT (sku) DO NOTHING;
    
    INSERT INTO products (supplier_id, category_id, sku, name, brand, size, unit, reorder_point, standard_cost)
    VALUES (v_oss_supplier, v_implant_cat, 'OSS-TS3-510', 'Osstem TS III 5.0x10mm', 'Osstem', '5.0x10mm', 'ชิ้น', 3, 13000.00)
    ON CONFLICT (sku) DO NOTHING;
  END IF;
  
  IF v_bio_supplier IS NOT NULL AND v_bonegraft_cat IS NOT NULL THEN
    INSERT INTO products (supplier_id, category_id, sku, name, brand, size, unit, reorder_point, standard_cost)
    VALUES (v_bio_supplier, v_bonegraft_cat, 'BIO-OSS-05', 'Bio-Oss Bone Graft 0.5g', 'Geistlich', '0.5g', 'กล่อง', 5, 4500.00)
    ON CONFLICT (sku) DO NOTHING;
    
    INSERT INTO products (supplier_id, category_id, sku, name, brand, size, unit, reorder_point, standard_cost)
    VALUES (v_bio_supplier, v_bonegraft_cat, 'BIO-OSS-10', 'Bio-Oss Bone Graft 1.0g', 'Geistlich', '1.0g', 'กล่อง', 3, 7500.00)
    ON CONFLICT (sku) DO NOTHING;
    
    INSERT INTO products (supplier_id, category_id, sku, name, brand, size, unit, reorder_point, standard_cost)
    VALUES (v_bio_supplier, v_membrane_cat, 'BIO-GIDE-S', 'Bio-Gide Membrane Small', 'Geistlich', '25x25mm', 'ชิ้น', 5, 6500.00)
    ON CONFLICT (sku) DO NOTHING;
    
    INSERT INTO products (supplier_id, category_id, sku, name, brand, size, unit, reorder_point, standard_cost)
    VALUES (v_bio_supplier, v_membrane_cat, 'BIO-GIDE-L', 'Bio-Gide Membrane Large', 'Geistlich', '30x40mm', 'ชิ้น', 3, 9500.00)
    ON CONFLICT (sku) DO NOTHING;
  END IF;
END $$;

-- =====================================================
-- 2. SAMPLE STOCK ITEMS
-- =====================================================

DO $$
DECLARE
  v_product_id UUID;
  v_product_sku VARCHAR(50);
BEGIN
  -- Loop through products and add stock
  FOR v_product_id, v_product_sku IN 
    SELECT id, sku FROM products ORDER BY id
  LOOP
    -- Add 3 LOT numbers for each product
    INSERT INTO stock_items (product_id, lot_number, expiry_date, quantity, reserved_quantity, cost_price, location, status)
    VALUES (v_product_id, 'LOT-' || SUBSTRING(v_product_sku, 1, 7) || '-001', '2027-06-15'::DATE, 10, 0, 20000.00, 'A-01-01', 'active')
    ON CONFLICT (lot_number) DO NOTHING;
    
    INSERT INTO stock_items (product_id, lot_number, expiry_date, quantity, reserved_quantity, cost_price, location, status)
    VALUES (v_product_id, 'LOT-' || SUBSTRING(v_product_sku, 1, 7) || '-002', '2027-03-20'::DATE, 5, 0, 20000.00, 'A-01-02', 'active')
    ON CONFLICT (lot_number) DO NOTHING;
    
    INSERT INTO stock_items (product_id, lot_number, expiry_date, quantity, reserved_quantity, cost_price, location, status)
    VALUES (v_product_id, 'LOT-' || SUBSTRING(v_product_sku, 1, 7) || '-003', '2026-04-10'::DATE, 3, 0, 20000.00, 'B-01-01', 'active')
    ON CONFLICT (lot_number) DO NOTHING;
  END LOOP;
END $$;

-- =====================================================
-- 3. SAMPLE PATIENTS
-- =====================================================

INSERT INTO patients (hn_number, full_name, phone, email, date_of_birth, notes)
VALUES ('HN-001234', 'คุณสมศักดิ์ ใจดี', '081-234-5678', 'somsak@email.com', '1975-05-15'::DATE, 'ผู้ป่วยดูแลเป็นอย่างดี')
ON CONFLICT (hn_number) DO NOTHING;

INSERT INTO patients (hn_number, full_name, phone, email, date_of_birth, notes)
VALUES ('HN-001235', 'คุณมาลี สุขใจ', '082-345-6789', 'malee@email.com', '1982-08-20'::DATE, NULL)
ON CONFLICT (hn_number) DO NOTHING;

INSERT INTO patients (hn_number, full_name, phone, email, date_of_birth, notes)
VALUES ('HN-001236', 'คุณประสิทธิ์ มั่นคง', '083-456-7890', 'prasit@email.com', '1968-12-01'::DATE, 'แพ้ยา Penicillin')
ON CONFLICT (hn_number) DO NOTHING;

INSERT INTO patients (hn_number, full_name, phone, email, date_of_birth, notes)
VALUES ('HN-001237', 'คุณวิภา รักษ์สุข', '084-567-8901', 'wipa@email.com', '1990-03-10'::DATE, NULL)
ON CONFLICT (hn_number) DO NOTHING;

INSERT INTO patients (hn_number, full_name, phone, email, date_of_birth, notes)
VALUES ('HN-001238', 'คุณสมชาย ดีใจ', '085-678-9012', 'somchai@email.com', '1985-07-25'::DATE, NULL)
ON CONFLICT (hn_number) DO NOTHING;

INSERT INTO patients (hn_number, full_name, phone, email, date_of_birth, notes)
VALUES ('HN-001239', 'คุณนิภา แก้วใส', '086-789-0123', 'nipa@email.com', '1978-11-30'::DATE, 'เบาหวาน ความดัน')
ON CONFLICT (hn_number) DO NOTHING;

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
  -- Get single profile
  SELECT id INTO v_dentist_id FROM profiles ORDER BY created_at LIMIT 1;

  -- Get patient IDs (single each)
  SELECT id INTO v_patient1_id FROM patients WHERE hn_number = 'HN-001234' ORDER BY id LIMIT 1;
  SELECT id INTO v_patient2_id FROM patients WHERE hn_number = 'HN-001235' ORDER BY id LIMIT 1;
  SELECT id INTO v_patient3_id FROM patients WHERE hn_number = 'HN-001236' ORDER BY id LIMIT 1;
  SELECT id INTO v_patient4_id FROM patients WHERE hn_number = 'HN-001237' ORDER BY id LIMIT 1;
  SELECT id INTO v_patient5_id FROM patients WHERE hn_number = 'HN-001238' ORDER BY id LIMIT 1;

  -- Only insert if we have a dentist profile
  IF v_dentist_id IS NOT NULL AND v_patient1_id IS NOT NULL THEN
    INSERT INTO cases (case_number, patient_id, dentist_id, scheduled_date, scheduled_time, procedure_type, traffic_light, status, notes)
    VALUES ('C2026-0001', v_patient1_id, v_dentist_id, CURRENT_DATE, '09:00'::TIME, 'Implant Placement', 'green', 'scheduled', 'เตรียมของครบแล้ว')
    ON CONFLICT (case_number) DO NOTHING;
    
    INSERT INTO cases (case_number, patient_id, dentist_id, scheduled_date, scheduled_time, procedure_type, traffic_light, status, notes)
    VALUES ('C2026-0002', v_patient2_id, v_dentist_id, CURRENT_DATE, '13:00'::TIME, 'Bone Graft', 'yellow', 'scheduled', 'รอของจาก PO')
    ON CONFLICT (case_number) DO NOTHING;
    
    INSERT INTO cases (case_number, patient_id, dentist_id, scheduled_date, scheduled_time, procedure_type, traffic_light, status, notes)
    VALUES ('C2026-0003', v_patient3_id, v_dentist_id, CURRENT_DATE + INTERVAL '1 day', '10:00'::TIME, 'Implant Placement', 'red', 'scheduled', 'ยังขาดวัสดุ')
    ON CONFLICT (case_number) DO NOTHING;
    
    INSERT INTO cases (case_number, patient_id, dentist_id, scheduled_date, scheduled_time, procedure_type, traffic_light, status, notes)
    VALUES ('C2026-0004', v_patient4_id, v_dentist_id, CURRENT_DATE + INTERVAL '2 days', '14:00'::TIME, 'Sinus Lift', 'green', 'scheduled', NULL)
    ON CONFLICT (case_number) DO NOTHING;
    
    INSERT INTO cases (case_number, patient_id, dentist_id, scheduled_date, scheduled_time, procedure_type, traffic_light, status, notes)
    VALUES ('C2026-0005', v_patient5_id, v_dentist_id, CURRENT_DATE + INTERVAL '3 days', '09:30'::TIME, 'Implant Placement', 'green', 'scheduled', NULL)
    ON CONFLICT (case_number) DO NOTHING;
    
    INSERT INTO cases (case_number, patient_id, dentist_id, scheduled_date, scheduled_time, procedure_type, traffic_light, status, notes)
    VALUES ('C2026-0006', v_patient1_id, v_dentist_id, CURRENT_DATE + INTERVAL '7 days', '11:00'::TIME, 'Abutment Connection', 'green', 'scheduled', 'นัดต่อเนื่อง')
    ON CONFLICT (case_number) DO NOTHING;
    
    INSERT INTO cases (case_number, patient_id, dentist_id, scheduled_date, scheduled_time, procedure_type, traffic_light, status, notes)
    VALUES ('C2026-0007', v_patient2_id, v_dentist_id, CURRENT_DATE - INTERVAL '5 days', '10:00'::TIME, 'Implant Placement', 'green', 'completed', 'เสร็จเรียบร้อย')
    ON CONFLICT (case_number) DO NOTHING;
    
    INSERT INTO cases (case_number, patient_id, dentist_id, scheduled_date, scheduled_time, procedure_type, traffic_light, status, notes)
    VALUES ('C2026-0008', v_patient3_id, v_dentist_id, CURRENT_DATE - INTERVAL '10 days', '14:30'::TIME, 'Bone Graft', 'green', 'completed', NULL)
    ON CONFLICT (case_number) DO NOTHING;
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
BEGIN
  SELECT id INTO v_user_id FROM profiles ORDER BY created_at LIMIT 1;
  SELECT id INTO v_str_supplier FROM suppliers WHERE code = 'STR' ORDER BY id LIMIT 1;
  SELECT id INTO v_nb_supplier FROM suppliers WHERE code = 'NB' ORDER BY id LIMIT 1;
  SELECT id INTO v_oss_supplier FROM suppliers WHERE code = 'OSS' ORDER BY id LIMIT 1;

  IF v_user_id IS NOT NULL AND v_str_supplier IS NOT NULL THEN
    INSERT INTO purchase_orders (po_number, supplier_id, status, ordered_at, expected_at, total_amount, created_by)
    VALUES ('PO-2026-0001', v_str_supplier, 'sent', NOW() - INTERVAL '7 days', (CURRENT_DATE + INTERVAL '7 days')::DATE, 250000.00, v_user_id)
    ON CONFLICT (po_number) DO NOTHING;
    
    INSERT INTO purchase_orders (po_number, supplier_id, status, ordered_at, expected_at, total_amount, created_by)
    VALUES ('PO-2026-0002', v_nb_supplier, 'draft', NULL, NULL, 180000.00, v_user_id)
    ON CONFLICT (po_number) DO NOTHING;
    
    INSERT INTO purchase_orders (po_number, supplier_id, status, ordered_at, expected_at, total_amount, created_by)
    VALUES ('PO-2026-0003', v_oss_supplier, 'received', NOW() - INTERVAL '14 days', (CURRENT_DATE - INTERVAL '7 days')::DATE, 120000.00, v_user_id)
    ON CONFLICT (po_number) DO NOTHING;
    
    INSERT INTO purchase_orders (po_number, supplier_id, status, ordered_at, expected_at, total_amount, created_by)
    VALUES ('PO-2026-0004', v_str_supplier, 'partial', NOW() - INTERVAL '10 days', (CURRENT_DATE - INTERVAL '3 days')::DATE, 85000.00, v_user_id)
    ON CONFLICT (po_number) DO NOTHING;
  END IF;
END $$;

-- =====================================================
-- 6. SAMPLE NOTIFICATIONS
-- =====================================================

DO $$
DECLARE
  v_user_id UUID;
BEGIN
  SELECT id INTO v_user_id FROM profiles ORDER BY created_at LIMIT 1;

  IF v_user_id IS NOT NULL THEN
    -- Use simple insert without conflict handling for notifications
    INSERT INTO notifications (user_id, type, title, message, is_read)
    SELECT v_user_id, 'low_stock', 'สินค้าใกล้หมด', 'Nobel Active Implant 3.5x10mm เหลือ 2 ชิ้น', false
    WHERE NOT EXISTS (SELECT 1 FROM notifications WHERE title = 'สินค้าใกล้หมด' AND user_id = v_user_id);
    
    INSERT INTO notifications (user_id, type, title, message, is_read)
    SELECT v_user_id, 'expiring', 'สินค้าใกล้หมดอายุ', 'Bio-Oss Bone Graft 0.5g หมดอายุใน 60 วัน', false
    WHERE NOT EXISTS (SELECT 1 FROM notifications WHERE title = 'สินค้าใกล้หมดอายุ' AND user_id = v_user_id);
    
    INSERT INTO notifications (user_id, type, title, message, is_read)
    SELECT v_user_id, 'case', 'เคสวันนี้', 'มี 3 เคสที่นัดหมายวันนี้', true
    WHERE NOT EXISTS (SELECT 1 FROM notifications WHERE title = 'เคสวันนี้' AND user_id = v_user_id);
    
    INSERT INTO notifications (user_id, type, title, message, is_read)
    SELECT v_user_id, 'transfer', 'รอคืนของ', 'TR-2026-0001 เกินกำหนดคืน 2 วัน', true
    WHERE NOT EXISTS (SELECT 1 FROM notifications WHERE title = 'รอคืนของ' AND user_id = v_user_id);
  END IF;
END $$;

-- =====================================================
-- 7. RE-ENABLE AUDIT TRIGGERS
-- =====================================================

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

-- Done!
SELECT 'Seed data inserted successfully!' as status;
