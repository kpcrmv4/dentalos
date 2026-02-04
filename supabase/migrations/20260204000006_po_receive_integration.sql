-- =====================================================
-- DentalFlow OS - PO Receive Integration
-- =====================================================
-- เชื่อมโยง PO กับการรับของเข้าคลัง
-- Auto-allocate ของเข้ารายการจองอัตโนมัติ
-- อัพเดท Traffic Light อัตโนมัติ
-- =====================================================

-- -----------------------------------------------------
-- 1. เพิ่มฟิลด์ใน stock_items เพื่อเชื่อมกับ PO
-- -----------------------------------------------------
ALTER TABLE stock_items 
ADD COLUMN IF NOT EXISTS purchase_order_id UUID REFERENCES purchase_orders(id),
ADD COLUMN IF NOT EXISTS po_item_id UUID REFERENCES po_items(id);

CREATE INDEX IF NOT EXISTS idx_stock_items_po ON stock_items(purchase_order_id);
CREATE INDEX IF NOT EXISTS idx_stock_items_po_item ON stock_items(po_item_id);

-- -----------------------------------------------------
-- 2. Function: auto_allocate_received_stock
-- ตัดของที่รับเข้าไปยัง Reservations ที่รออัตโนมัติ (FIFO)
-- -----------------------------------------------------
CREATE OR REPLACE FUNCTION auto_allocate_received_stock(
  p_stock_item_id UUID
) RETURNS JSONB
LANGUAGE plpgsql
AS $$
DECLARE
  v_stock_item RECORD;
  v_reservation RECORD;
  v_allocated_count INTEGER := 0;
  v_remaining_quantity INTEGER;
  v_allocate_quantity INTEGER;
  v_affected_cases UUID[];
BEGIN
  -- ดึงข้อมูล stock_item
  SELECT * INTO v_stock_item
  FROM stock_items
  WHERE id = p_stock_item_id;
  
  IF NOT FOUND THEN
    RETURN jsonb_build_object(
      'success', false,
      'error', 'Stock item not found'
    );
  END IF;
  
  v_remaining_quantity := v_stock_item.available_quantity;
  
  -- ถ้าไม่มีของเหลือ ไม่ต้องทำอะไร
  IF v_remaining_quantity <= 0 THEN
    RETURN jsonb_build_object(
      'success', true,
      'allocated_count', 0,
      'message', 'No available quantity to allocate'
    );
  END IF;
  
  -- ดึง Reservations ที่รอสินค้านี้ (FIFO)
  FOR v_reservation IN
    SELECT r.*, c.surgery_date
    FROM reservations r
    JOIN cases c ON r.case_id = c.id
    WHERE r.product_id = v_stock_item.product_id
      AND r.status = 'pending'
      AND r.quantity_needed > 0
    ORDER BY 
      c.surgery_date ASC,  -- เคสที่ผ่าตัดเร็วกว่าได้ก่อน
      r.created_at ASC     -- ถ้าวันเดียวกัน ใครจองก่อนได้ก่อน
  LOOP
    -- ถ้าของหมดแล้ว ออกจาก loop
    EXIT WHEN v_remaining_quantity <= 0;
    
    -- คำนวณจำนวนที่จะจัดสรร
    v_allocate_quantity := LEAST(v_reservation.quantity_needed, v_remaining_quantity);
    
    -- สร้าง reservation_item
    INSERT INTO reservation_items (
      reservation_id,
      stock_item_id,
      quantity_allocated,
      allocated_at
    ) VALUES (
      v_reservation.id,
      p_stock_item_id,
      v_allocate_quantity,
      NOW()
    );
    
    -- อัพเดท reservation
    UPDATE reservations
    SET 
      quantity_allocated = quantity_allocated + v_allocate_quantity,
      status = CASE 
        WHEN quantity_allocated + v_allocate_quantity >= quantity_needed THEN 'confirmed'
        ELSE 'partial'
      END,
      updated_at = NOW()
    WHERE id = v_reservation.id;
    
    -- อัพเดท stock_item
    UPDATE stock_items
    SET 
      reserved_quantity = reserved_quantity + v_allocate_quantity,
      available_quantity = available_quantity - v_allocate_quantity,
      updated_at = NOW()
    WHERE id = p_stock_item_id;
    
    -- ลดจำนวนที่เหลือ
    v_remaining_quantity := v_remaining_quantity - v_allocate_quantity;
    v_allocated_count := v_allocated_count + 1;
    
    -- เก็บ case_id เพื่ออัพเดท traffic light
    v_affected_cases := array_append(v_affected_cases, v_reservation.case_id);
    
    -- แจ้งเตือนทันตแพทย์
    INSERT INTO notifications (
      user_id,
      type,
      title,
      message,
      related_entity_type,
      related_entity_id,
      priority
    )
    SELECT 
      c.dentist_id,
      'reservation_fulfilled',
      'วัสดุที่จองมาแล้ว',
      format('วัสดุ %s ที่คุณจองไว้สำหรับเคส %s มาแล้ว (จำนวน %s)', 
        p.name, pat.name, v_allocate_quantity),
      'reservation',
      v_reservation.id,
      CASE 
        WHEN c.surgery_date <= CURRENT_DATE + INTERVAL '1 day' THEN 'high'
        ELSE 'normal'
      END
    FROM cases c
    JOIN patients pat ON c.patient_id = pat.id
    JOIN products p ON v_reservation.product_id = p.id
    WHERE c.id = v_reservation.case_id;
    
  END LOOP;
  
  -- อัพเดท Traffic Light ของเคสที่ได้รับการจัดสรร
  IF array_length(v_affected_cases, 1) > 0 THEN
    PERFORM update_case_traffic_light(case_id)
    FROM unnest(v_affected_cases) AS case_id;
  END IF;
  
  RETURN jsonb_build_object(
    'success', true,
    'allocated_count', v_allocated_count,
    'affected_cases', v_affected_cases,
    'remaining_quantity', v_remaining_quantity
  );
END;
$$;

-- -----------------------------------------------------
-- 3. Function: receive_from_purchase_order
-- รับของเข้าจาก PO พร้อมอัพเดทสถานะและจัดสรรอัตโนมัติ
-- -----------------------------------------------------
CREATE OR REPLACE FUNCTION receive_from_purchase_order(
  p_po_id UUID,
  p_received_by UUID,
  p_items JSONB, -- [{ po_item_id, lot_number, expiry_date, quantity_received, location, cost_price }]
  p_invoice_number VARCHAR DEFAULT NULL
) RETURNS JSONB
LANGUAGE plpgsql
AS $$
DECLARE
  v_po RECORD;
  v_item JSONB;
  v_po_item RECORD;
  v_stock_item_id UUID;
  v_allocation_result JSONB;
  v_total_items INTEGER := 0;
  v_fully_received_items INTEGER := 0;
  v_new_stock_items UUID[] := ARRAY[]::UUID[];
  v_allocation_results JSONB[] := ARRAY[]::JSONB[];
BEGIN
  -- ตรวจสอบ PO
  SELECT * INTO v_po
  FROM purchase_orders
  WHERE id = p_po_id;
  
  IF NOT FOUND THEN
    RETURN jsonb_build_object(
      'success', false,
      'error', 'Purchase order not found'
    );
  END IF;
  
  IF v_po.status NOT IN ('sent', 'partial_received') THEN
    RETURN jsonb_build_object(
      'success', false,
      'error', format('Cannot receive from PO with status: %s', v_po.status)
    );
  END IF;
  
  -- Loop แต่ละรายการที่รับเข้า
  FOR v_item IN SELECT * FROM jsonb_array_elements(p_items)
  LOOP
    -- ดึงข้อมูล PO item
    SELECT * INTO v_po_item
    FROM po_items
    WHERE id = (v_item->>'po_item_id')::UUID;
    
    IF NOT FOUND THEN
      CONTINUE;
    END IF;
    
    -- สร้าง stock_item
    INSERT INTO stock_items (
      product_id,
      lot_number,
      expiry_date,
      quantity,
      available_quantity,
      reserved_quantity,
      used_quantity,
      location,
      cost_price,
      purchase_order_id,
      purchase_order_item_id,
      received_by,
      received_at
    ) VALUES (
      v_po_item.product_id,
      v_item->>'lot_number',
      (v_item->>'expiry_date')::DATE,
      (v_item->>'quantity_received')::INTEGER,
      (v_item->>'quantity_received')::INTEGER,
      0,
      0,
      v_item->>'location',
      COALESCE((v_item->>'cost_price')::DECIMAL, v_po_item.unit_price),
      p_po_id,
      v_po_item.id,
      p_received_by,
      NOW()
    )
    RETURNING id INTO v_stock_item_id;
    
    v_new_stock_items := array_append(v_new_stock_items, v_stock_item_id);
    
    -- อัพเดท quantity_received ใน PO item
    UPDATE po_items
    SET 
      quantity_received = quantity_received + (v_item->>'quantity_received')::INTEGER
    WHERE id = v_po_item.id;
    
    -- นับจำนวนรายการที่รับครบ
    IF v_po_item.quantity_received + (v_item->>'quantity_received')::INTEGER >= v_po_item.quantity_ordered THEN
      v_fully_received_items := v_fully_received_items + 1;
    END IF;
    
    v_total_items := v_total_items + 1;
    
    -- Auto-allocate เข้ารายการจอง
    v_allocation_result := auto_allocate_received_stock(v_stock_item_id);
    v_allocation_results := array_append(v_allocation_results, v_allocation_result);
    
  END LOOP;
  
  -- อัพเดท PO status
  DECLARE
    v_total_po_items INTEGER;
    v_fully_received_po_items INTEGER;
  BEGIN
    SELECT 
      COUNT(*),
      COUNT(*) FILTER (WHERE quantity_received >= quantity_ordered)
    INTO v_total_po_items, v_fully_received_po_items
    FROM po_items
    WHERE po_id = p_po_id;
    
    UPDATE purchase_orders
    SET 
      status = CASE
        WHEN v_fully_received_po_items >= v_total_po_items THEN 'received'
        WHEN v_fully_received_po_items > 0 THEN 'partial_received'
        ELSE status
      END,
      actual_delivery_date = CASE
        WHEN v_fully_received_po_items >= v_total_po_items THEN CURRENT_DATE
        ELSE actual_delivery_date
      END,
      updated_at = NOW()
    WHERE id = p_po_id;
  END;
  
  -- แจ้งเตือนฝ่ายคลังว่ารับของเสร็จแล้ว
  INSERT INTO notifications (
    user_id,
    type,
    title,
    message,
    related_entity_type,
    related_entity_id,
    priority
  )
  SELECT 
    pr.id,
    'po_received',
    'รับของเข้าคลังเสร็จสิ้น',
    format('รับของจาก PO %s เสร็จแล้ว (รับ %s/%s รายการ)', 
      v_po.po_number, v_total_items, 
      (SELECT COUNT(*) FROM po_items WHERE po_id = p_po_id)),
    'purchase_order',
    p_po_id,
    'normal'
  FROM profiles pr
  JOIN user_roles ur ON pr.id = ur.user_id
  WHERE ur.role_id = (SELECT id FROM roles WHERE name = 'inventory');
  
  RETURN jsonb_build_object(
    'success', true,
    'po_id', p_po_id,
    'po_number', v_po.po_number,
    'items_received', v_total_items,
    'new_stock_items', v_new_stock_items,
    'allocation_results', v_allocation_results
  );
END;
$$;

-- -----------------------------------------------------
-- 4. Trigger: after_stock_received
-- เรียก auto_allocate อัตโนมัติเมื่อรับของเข้า (ถ้าไม่ได้รับผ่าน PO)
-- -----------------------------------------------------
CREATE OR REPLACE FUNCTION trigger_auto_allocate_stock()
RETURNS TRIGGER
LANGUAGE plpgsql
AS $$
DECLARE
  v_result JSONB;
BEGIN
  -- ถ้ารับผ่าน PO จะ allocate ใน function receive_from_purchase_order แล้ว
  -- ดังนั้นเช็คว่าถ้าไม่มี purchase_order_id ค่อย allocate
  IF NEW.purchase_order_id IS NULL THEN
    v_result := auto_allocate_received_stock(NEW.id);
  END IF;
  
  RETURN NEW;
END;
$$;

CREATE TRIGGER after_stock_received
AFTER INSERT ON stock_items
FOR EACH ROW
EXECUTE FUNCTION trigger_auto_allocate_stock();

-- -----------------------------------------------------
-- 5. View: pending_purchase_orders
-- แสดง PO ที่รอรับของ
-- -----------------------------------------------------
CREATE OR REPLACE VIEW pending_purchase_orders AS
SELECT 
  po.id,
  po.po_number,
  po.order_date,
  po.expected_delivery_date,
  po.status,
  s.name AS supplier_name,
  s.code AS supplier_code,
  COUNT(poi.id) AS total_items,
  COUNT(poi.id) FILTER (WHERE poi.quantity_received >= poi.quantity_ordered) AS received_items,
  SUM(poi.quantity_ordered) AS total_quantity_ordered,
  SUM(poi.quantity_received) AS total_quantity_received,
  po.total,
  po.line_message_sent,
  CASE 
    WHEN po.expected_delivery_date < CURRENT_DATE THEN 'overdue'
    WHEN po.expected_delivery_date = CURRENT_DATE THEN 'today'
    WHEN po.expected_delivery_date <= CURRENT_DATE + INTERVAL '3 days' THEN 'soon'
    ELSE 'normal'
  END AS delivery_status
FROM purchase_orders po
JOIN suppliers s ON po.supplier_id = s.id
LEFT JOIN po_items poi ON po.id = poi.po_id
WHERE po.status IN ('sent', 'partial_received')
GROUP BY po.id, s.name, s.code
ORDER BY 
  CASE 
    WHEN po.expected_delivery_date < CURRENT_DATE THEN 1
    WHEN po.expected_delivery_date = CURRENT_DATE THEN 2
    ELSE 3
  END,
  po.expected_delivery_date ASC;

-- -----------------------------------------------------
-- 6. Function: get_po_items_for_receive
-- ดึงรายการสินค้าใน PO สำหรับหน้ารับของ
-- -----------------------------------------------------
CREATE OR REPLACE FUNCTION get_po_items_for_receive(p_po_id UUID)
RETURNS TABLE (
  po_item_id UUID,
  product_id UUID,
  product_name VARCHAR,
  product_ref_code VARCHAR,
  product_brand VARCHAR,
  product_size VARCHAR,
  quantity_ordered INTEGER,
  quantity_received INTEGER,
  quantity_pending INTEGER,
  unit_price DECIMAL,
  has_expiry BOOLEAN
) 
LANGUAGE plpgsql
AS $$
BEGIN
  RETURN QUERY
  SELECT 
    poi.id AS po_item_id,
    p.id AS product_id,
    p.name AS product_name,
    p.ref_code AS product_ref_code,
    p.brand AS product_brand,
    p.size AS product_size,
    poi.quantity_ordered,
    poi.quantity_received,
    (poi.quantity_ordered - poi.quantity_received) AS quantity_pending,
    poi.unit_price,
    c.has_expiry
  FROM po_items poi
  JOIN products p ON poi.product_id = p.id
  JOIN categories c ON p.category_id = c.id
  WHERE poi.po_id = p_po_id
    AND poi.quantity_received < poi.quantity_ordered
  ORDER BY p.name;
END;
$$;

-- -----------------------------------------------------
-- 7. RLS Policies
-- -----------------------------------------------------
-- Allow inventory role to receive stock from PO
ALTER TABLE stock_items ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Inventory can receive stock from PO"
ON stock_items FOR INSERT
TO authenticated
WITH CHECK (
  EXISTS (
    SELECT 1 FROM user_roles ur
    JOIN roles r ON ur.role_id = r.id
    WHERE ur.user_id = auth.uid()
    AND r.name IN ('inventory', 'admin')
  )
);

-- -----------------------------------------------------
-- 8. Indexes for Performance
-- -----------------------------------------------------
CREATE INDEX IF NOT EXISTS idx_reservations_pending ON reservations(product_id, status) 
WHERE status = 'pending';

CREATE INDEX IF NOT EXISTS idx_cases_surgery_date ON cases(surgery_date);

CREATE INDEX IF NOT EXISTS idx_po_items_pending ON po_items(po_id) 
WHERE quantity_received < quantity_ordered;

-- =====================================================
-- สรุป
-- =====================================================
-- ✅ เพิ่มฟิลด์เชื่อม PO ใน stock_items
-- ✅ Function receive_from_purchase_order() - รับของจาก PO
-- ✅ Function auto_allocate_received_stock() - ตัดเข้ารายการจองอัตโนมัติ (FIFO)
-- ✅ Trigger after_stock_received - Auto-allocate เมื่อรับของเข้า
-- ✅ View pending_purchase_orders - แสดง PO ที่รอรับ
-- ✅ Function get_po_items_for_receive() - ดึงรายการสำหรับรับของ
-- ✅ RLS Policies - ความปลอดภัย
-- ✅ Indexes - ประสิทธิภาพ
