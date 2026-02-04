-- =====================================================
-- DentalFlow OS - Out-of-Stock Request System
-- =====================================================
-- ระบบสำหรับจัดการเมื่อทันตแพทย์ยืนยันใช้วัสดุที่หมด
-- สร้าง Back Order และแจ้งเตือนฝ่ายคลัง
-- =====================================================

-- -----------------------------------------------------
-- Table: out_of_stock_requests
-- เก็บคำขอใช้วัสดุที่หมดจากสต็อก
-- -----------------------------------------------------
CREATE TABLE IF NOT EXISTS out_of_stock_requests (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  case_id UUID NOT NULL REFERENCES cases(id),
  product_id UUID NOT NULL REFERENCES products(id),
  quantity_needed INTEGER NOT NULL,
  urgency_level VARCHAR(20) DEFAULT 'normal', -- 'critical', 'high', 'normal'
  requested_by UUID NOT NULL REFERENCES profiles(id),
  requested_at TIMESTAMPTZ DEFAULT NOW(),
  
  -- Status tracking
  status VARCHAR(20) DEFAULT 'pending', -- 'pending', 'po_created', 'ordered', 'received', 'cancelled'
  
  -- PO linkage
  purchase_order_id UUID REFERENCES purchase_orders(id),
  
  -- Resolution
  resolved_at TIMESTAMPTZ,
  resolved_by UUID REFERENCES profiles(id),
  resolution_notes TEXT,
  
  -- Alternative solution
  alternative_product_id UUID REFERENCES products(id),
  alternative_used BOOLEAN DEFAULT false,
  
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX idx_oos_requests_status ON out_of_stock_requests(status);
CREATE INDEX idx_oos_requests_case ON out_of_stock_requests(case_id);
CREATE INDEX idx_oos_requests_product ON out_of_stock_requests(product_id);
CREATE INDEX idx_oos_requests_requested_at ON out_of_stock_requests(requested_at DESC);

-- -----------------------------------------------------
-- Table: purchase_orders
-- ใบสั่งซื้อ
-- -----------------------------------------------------
CREATE TABLE IF NOT EXISTS purchase_orders (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  po_number VARCHAR(50) UNIQUE NOT NULL,
  supplier_id UUID NOT NULL REFERENCES suppliers(id),
  
  -- Order details
  order_date DATE DEFAULT CURRENT_DATE,
  expected_delivery_date DATE,
  actual_delivery_date DATE,
  
  -- Status
  status VARCHAR(20) DEFAULT 'draft', -- 'draft', 'sent', 'confirmed', 'partial_received', 'received', 'cancelled'
  
  -- LINE integration
  line_message_sent BOOLEAN DEFAULT false,
  line_message_sent_at TIMESTAMPTZ,
  line_message_id TEXT,
  
  -- Totals
  subtotal DECIMAL(10,2) DEFAULT 0,
  tax DECIMAL(10,2) DEFAULT 0,
  total DECIMAL(10,2) DEFAULT 0,
  
  -- Notes
  notes TEXT,
  internal_notes TEXT,
  
  -- Tracking
  created_by UUID NOT NULL REFERENCES profiles(id),
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX idx_po_status ON purchase_orders(status);
CREATE INDEX idx_po_supplier ON purchase_orders(supplier_id);
CREATE INDEX idx_po_expected_delivery ON purchase_orders(expected_delivery_date);

-- -----------------------------------------------------
-- Table: purchase_order_items
-- รายการสินค้าในใบสั่งซื้อ
-- -----------------------------------------------------
CREATE TABLE IF NOT EXISTS purchase_order_items (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  purchase_order_id UUID NOT NULL REFERENCES purchase_orders(id) ON DELETE CASCADE,
  product_id UUID NOT NULL REFERENCES products(id),
  
  -- Quantities
  quantity_ordered INTEGER NOT NULL,
  quantity_received INTEGER DEFAULT 0,
  
  -- Pricing
  unit_price DECIMAL(10,2),
  total_price DECIMAL(10,2),
  
  -- Linkage to OOS request
  out_of_stock_request_id UUID REFERENCES out_of_stock_requests(id),
  
  -- Notes
  notes TEXT,
  
  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX idx_po_items_po ON purchase_order_items(purchase_order_id);
CREATE INDEX idx_po_items_product ON purchase_order_items(product_id);

-- -----------------------------------------------------
-- Table: line_settings
-- การตั้งค่า LINE Messaging API
-- -----------------------------------------------------
CREATE TABLE IF NOT EXISTS line_settings (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  
  -- LINE API credentials
  channel_access_token TEXT,
  channel_secret TEXT,
  
  -- Message templates
  message_templates JSONB DEFAULT '{
    "urgent_order": "🚨 คำสั่งซื้อด่วน\nPO: {po_number}\n\nรายการ:\n{items}\n\nกรุณายืนยันและจัดส่งโดยเร็วที่สุด",
    "normal_order": "📦 คำสั่งซื้อ\nPO: {po_number}\n\nรายการ:\n{items}\n\nกำหนดส่ง: {delivery_date}",
    "order_reminder": "⏰ แจ้งเตือนคำสั่งซื้อ\nPO: {po_number}\nครบกำหนดส่ง: {delivery_date}\n\nกรุณาตรวจสอบสถานะการจัดส่ง"
  }'::jsonb,
  
  -- Default settings
  auto_send_urgent BOOLEAN DEFAULT false,
  auto_send_normal BOOLEAN DEFAULT false,
  
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Insert default settings
INSERT INTO line_settings (id) VALUES (gen_random_uuid())
ON CONFLICT DO NOTHING;

-- -----------------------------------------------------
-- Table: supplier_line_contacts
-- LINE ID ของ Supplier แต่ละราย
-- -----------------------------------------------------
CREATE TABLE IF NOT EXISTS supplier_line_contacts (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  supplier_id UUID NOT NULL REFERENCES suppliers(id) ON DELETE CASCADE,
  
  -- LINE contact info
  line_user_id TEXT,
  line_display_name VARCHAR(255),
  contact_type VARCHAR(20) DEFAULT 'primary', -- 'primary', 'secondary', 'urgent'
  
  -- Status
  is_active BOOLEAN DEFAULT true,
  verified BOOLEAN DEFAULT false,
  verified_at TIMESTAMPTZ,
  
  -- Notes
  notes TEXT,
  
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  
  UNIQUE(supplier_id, line_user_id)
);

CREATE INDEX idx_supplier_line_supplier ON supplier_line_contacts(supplier_id);

-- -----------------------------------------------------
-- Function: request_out_of_stock_item
-- ทันตแพทย์ยืนยันใช้วัสดุที่หมด → สร้าง OOS Request
-- -----------------------------------------------------
CREATE OR REPLACE FUNCTION request_out_of_stock_item(
  p_case_id UUID,
  p_product_id UUID,
  p_quantity INTEGER,
  p_urgency_level VARCHAR DEFAULT 'normal',
  p_user_id UUID
) RETURNS UUID AS $$
DECLARE
  v_request_id UUID;
  v_product_name VARCHAR(255);
  v_case_number VARCHAR(50);
  v_dentist_id UUID;
  v_inventory_users UUID[];
BEGIN
  -- Get product and case info
  SELECT p.name INTO v_product_name
  FROM products p WHERE p.id = p_product_id;
  
  SELECT c.case_number, c.dentist_id
  INTO v_case_number, v_dentist_id
  FROM cases c WHERE c.id = p_case_id;
  
  -- Create OOS request
  INSERT INTO out_of_stock_requests (
    case_id, product_id, quantity_needed, urgency_level,
    requested_by, status
  ) VALUES (
    p_case_id, p_product_id, p_quantity, p_urgency_level,
    p_user_id, 'pending'
  )
  RETURNING id INTO v_request_id;
  
  -- Get all inventory role users
  SELECT array_agg(p.id)
  INTO v_inventory_users
  FROM profiles p
  JOIN roles r ON r.id = p.role_id
  WHERE r.name = 'inventory' AND p.is_active = true;
  
  -- Send notifications to inventory team
  IF v_inventory_users IS NOT NULL THEN
    INSERT INTO notifications (
      type, title, message, data, target_user_id, priority
    )
    SELECT
      'out_of_stock_request',
      CASE 
        WHEN p_urgency_level = 'critical' THEN '🚨 ต้องการวัสดุด่วนมาก!'
        WHEN p_urgency_level = 'high' THEN '⚠️ ต้องการวัสดุด่วน'
        ELSE '📦 ต้องการวัสดุ'
      END,
      'เคส ' || v_case_number || ' ต้องการ ' || v_product_name || ' จำนวน ' || p_quantity || ' ชิ้น (สต็อกหมด)',
      jsonb_build_object(
        'request_id', v_request_id,
        'case_id', p_case_id,
        'product_id', p_product_id,
        'quantity', p_quantity,
        'urgency_level', p_urgency_level
      ),
      user_id,
      CASE 
        WHEN p_urgency_level = 'critical' THEN 'high'
        WHEN p_urgency_level = 'high' THEN 'medium'
        ELSE 'normal'
      END
    FROM unnest(v_inventory_users) AS user_id;
  END IF;
  
  -- Log history
  INSERT INTO reservation_history (
    reservation_id, action, reason, performed_by
  ) VALUES (
    NULL, 'out_of_stock_request_created',
    'Request for ' || v_product_name || ' x' || p_quantity || ' (urgency: ' || p_urgency_level || ')',
    p_user_id
  );
  
  RETURN v_request_id;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- -----------------------------------------------------
-- Function: generate_po_number
-- สร้างเลขที่ PO อัตโนมัติ
-- -----------------------------------------------------
CREATE OR REPLACE FUNCTION generate_po_number()
RETURNS VARCHAR AS $$
DECLARE
  v_year VARCHAR(4);
  v_month VARCHAR(2);
  v_sequence INTEGER;
  v_po_number VARCHAR(50);
BEGIN
  v_year := TO_CHAR(CURRENT_DATE, 'YYYY');
  v_month := TO_CHAR(CURRENT_DATE, 'MM');
  
  -- Get next sequence for this month
  SELECT COALESCE(MAX(
    CAST(SUBSTRING(po_number FROM 10) AS INTEGER)
  ), 0) + 1
  INTO v_sequence
  FROM purchase_orders
  WHERE po_number LIKE 'PO' || v_year || v_month || '%';
  
  v_po_number := 'PO' || v_year || v_month || LPAD(v_sequence::TEXT, 4, '0');
  
  RETURN v_po_number;
END;
$$ LANGUAGE plpgsql;

-- -----------------------------------------------------
-- Function: create_po_from_oos_requests
-- สร้าง PO จาก OOS Requests ที่เลือก
-- -----------------------------------------------------
CREATE OR REPLACE FUNCTION create_po_from_oos_requests(
  p_supplier_id UUID,
  p_request_ids UUID[],
  p_expected_delivery_date DATE,
  p_notes TEXT,
  p_user_id UUID
) RETURNS UUID AS $$
DECLARE
  v_po_id UUID;
  v_po_number VARCHAR(50);
  v_request RECORD;
  v_subtotal DECIMAL(10,2) := 0;
BEGIN
  -- Generate PO number
  v_po_number := generate_po_number();
  
  -- Create PO
  INSERT INTO purchase_orders (
    po_number, supplier_id, expected_delivery_date,
    notes, status, created_by
  ) VALUES (
    v_po_number, p_supplier_id, p_expected_delivery_date,
    p_notes, 'draft', p_user_id
  )
  RETURNING id INTO v_po_id;
  
  -- Add items from OOS requests
  FOR v_request IN
    SELECT 
      osr.id as request_id,
      osr.product_id,
      osr.quantity_needed,
      p.standard_cost
    FROM out_of_stock_requests osr
    JOIN products p ON p.id = osr.product_id
    WHERE osr.id = ANY(p_request_ids)
      AND osr.status = 'pending'
  LOOP
    -- Add to PO items
    INSERT INTO purchase_order_items (
      purchase_order_id, product_id, quantity_ordered,
      unit_price, total_price, out_of_stock_request_id
    ) VALUES (
      v_po_id, v_request.product_id, v_request.quantity_needed,
      v_request.standard_cost,
      v_request.quantity_needed * COALESCE(v_request.standard_cost, 0),
      v_request.request_id
    );
    
    -- Update OOS request status
    UPDATE out_of_stock_requests
    SET status = 'po_created',
        purchase_order_id = v_po_id,
        updated_at = NOW()
    WHERE id = v_request.request_id;
    
    v_subtotal := v_subtotal + (v_request.quantity_needed * COALESCE(v_request.standard_cost, 0));
  END LOOP;
  
  -- Update PO totals (assuming 7% VAT)
  UPDATE purchase_orders
  SET subtotal = v_subtotal,
      tax = v_subtotal * 0.07,
      total = v_subtotal * 1.07
  WHERE id = v_po_id;
  
  RETURN v_po_id;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- -----------------------------------------------------
-- Function: get_pending_oos_requests
-- ดึงรายการ OOS Requests ที่รอดำเนินการ
-- -----------------------------------------------------
CREATE OR REPLACE FUNCTION get_pending_oos_requests(
  p_supplier_id UUID DEFAULT NULL
)
RETURNS TABLE (
  id UUID,
  case_number VARCHAR,
  patient_name VARCHAR,
  product_name VARCHAR,
  product_ref_code VARCHAR,
  supplier_name VARCHAR,
  quantity_needed INTEGER,
  urgency_level VARCHAR,
  requested_by_name VARCHAR,
  requested_at TIMESTAMPTZ,
  days_pending INTEGER
) AS $$
BEGIN
  RETURN QUERY
  SELECT 
    osr.id,
    c.case_number,
    c.patient_name,
    p.name AS product_name,
    p.ref_code AS product_ref_code,
    s.name AS supplier_name,
    osr.quantity_needed,
    osr.urgency_level,
    prof.full_name AS requested_by_name,
    osr.requested_at,
    EXTRACT(DAY FROM NOW() - osr.requested_at)::INTEGER AS days_pending
  FROM out_of_stock_requests osr
  JOIN cases c ON c.id = osr.case_id
  JOIN products p ON p.id = osr.product_id
  JOIN suppliers s ON s.id = p.supplier_id
  JOIN profiles prof ON prof.id = osr.requested_by
  WHERE osr.status IN ('pending', 'po_created')
    AND (p_supplier_id IS NULL OR p.supplier_id = p_supplier_id)
  ORDER BY 
    CASE osr.urgency_level
      WHEN 'critical' THEN 1
      WHEN 'high' THEN 2
      ELSE 3
    END,
    osr.requested_at ASC;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- -----------------------------------------------------
-- Grant permissions
-- -----------------------------------------------------
GRANT EXECUTE ON FUNCTION request_out_of_stock_item TO authenticated;
GRANT EXECUTE ON FUNCTION create_po_from_oos_requests TO authenticated;
GRANT EXECUTE ON FUNCTION get_pending_oos_requests TO authenticated;

-- Grant table access
GRANT SELECT, INSERT, UPDATE ON out_of_stock_requests TO authenticated;
GRANT SELECT, INSERT, UPDATE ON purchase_orders TO authenticated;
GRANT SELECT, INSERT, UPDATE ON purchase_order_items TO authenticated;
GRANT SELECT, UPDATE ON line_settings TO authenticated;
GRANT SELECT, INSERT, UPDATE, DELETE ON supplier_line_contacts TO authenticated;

-- -----------------------------------------------------
-- Comments
-- -----------------------------------------------------
COMMENT ON TABLE out_of_stock_requests IS 
'คำขอใช้วัสดุที่หมดจากสต็อก เมื่อทันตแพทย์ยืนยันจะใช้';

COMMENT ON TABLE purchase_orders IS 
'ใบสั่งซื้อ (PO) เชื่อมโยงกับ LINE Messaging API';

COMMENT ON TABLE line_settings IS 
'การตั้งค่า LINE Messaging API และ Message Templates';

COMMENT ON TABLE supplier_line_contacts IS 
'LINE ID ของ Supplier แต่ละราย';

COMMENT ON FUNCTION request_out_of_stock_item IS 
'สร้างคำขอใช้วัสดุที่หมด และแจ้งเตือนฝ่ายคลังทันที';

COMMENT ON FUNCTION create_po_from_oos_requests IS 
'สร้าง PO จาก OOS Requests ที่เลือก พร้อมเชื่อมโยงกัน';
