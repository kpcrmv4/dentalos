-- =============================================
-- Daily Maintenance Functions
-- รันทุกวันเวลา 06:00 น. (UTC+7) = 23:00 UTC (วันก่อนหน้า)
-- =============================================

-- Set timezone to Asia/Bangkok
SET timezone = 'Asia/Bangkok';

-- =============================================
-- 1. Function: อัพเดท Traffic Light ทุกเคส
-- =============================================
CREATE OR REPLACE FUNCTION daily_update_traffic_lights()
RETURNS TABLE (
  case_id UUID,
  case_number TEXT,
  old_status TEXT,
  new_status TEXT,
  days_until_surgery INT
) AS $$
DECLARE
  v_case RECORD;
  v_new_status TEXT;
  v_total_reserved INT;
  v_total_available INT;
BEGIN
  -- Loop through all scheduled cases
  FOR v_case IN 
    SELECT c.id, c.case_number, c.traffic_light, c.scheduled_date
    FROM cases c
    WHERE c.status = 'scheduled'
      AND c.scheduled_date >= CURRENT_DATE
    ORDER BY c.scheduled_date
  LOOP
    -- Calculate reservation status
    SELECT 
      COALESCE(SUM(ri.quantity), 0),
      COALESCE(SUM(
        CASE WHEN si.id IS NOT NULL 
        THEN LEAST(ri.quantity, si.quantity - si.reserved_quantity + ri.quantity)
        ELSE 0 END
      ), 0)
    INTO v_total_reserved, v_total_available
    FROM reservation_items ri
    JOIN reservations r ON r.id = ri.reservation_id
    LEFT JOIN stock_items si ON si.id = ri.stock_item_id
    WHERE r.case_id = v_case.id
      AND r.status IN ('pending', 'confirmed');

    -- Determine new traffic light status
    IF v_total_reserved = 0 THEN
      -- No reservations yet
      IF v_case.scheduled_date <= CURRENT_DATE + INTERVAL '2 days' THEN
        v_new_status := 'red';
      ELSE
        v_new_status := 'yellow';
      END IF;
    ELSIF v_total_available >= v_total_reserved THEN
      -- All items available
      v_new_status := 'green';
    ELSIF v_total_available > 0 THEN
      -- Partial availability
      v_new_status := 'yellow';
    ELSE
      -- No items available
      v_new_status := 'red';
    END IF;

    -- Update if changed
    IF v_case.traffic_light != v_new_status THEN
      UPDATE cases 
      SET traffic_light = v_new_status,
          updated_at = NOW()
      WHERE id = v_case.id;

      -- Return the change
      case_id := v_case.id;
      case_number := v_case.case_number;
      old_status := v_case.traffic_light;
      new_status := v_new_status;
      days_until_surgery := (v_case.scheduled_date - CURRENT_DATE)::INT;
      RETURN NEXT;
    END IF;
  END LOOP;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- =============================================
-- 2. Function: สร้าง Notifications สำหรับเคสวันนี้
-- =============================================
CREATE OR REPLACE FUNCTION daily_notify_today_cases()
RETURNS TABLE (
  notification_id UUID,
  user_id UUID,
  notification_type TEXT,
  case_number TEXT
) AS $$
DECLARE
  v_case RECORD;
  v_notif_id UUID;
BEGIN
  -- Notify dentists about their cases today
  FOR v_case IN 
    SELECT c.id, c.case_number, c.dentist_id, c.traffic_light, c.scheduled_time,
           p.name as patient_name
    FROM cases c
    JOIN patients p ON p.id = c.patient_id
    WHERE c.scheduled_date = CURRENT_DATE
      AND c.status = 'scheduled'
    ORDER BY c.scheduled_time
  LOOP
    -- Create notification for dentist
    INSERT INTO notifications (
      user_id, type, title, message, priority, related_type, related_id
    ) VALUES (
      v_case.dentist_id,
      'case_today',
      'เคสวันนี้: ' || v_case.case_number,
      'คนไข้ ' || v_case.patient_name || ' เวลา ' || 
        COALESCE(TO_CHAR(v_case.scheduled_time, 'HH24:MI'), 'ไม่ระบุ') ||
        CASE WHEN v_case.traffic_light = 'red' THEN ' ⚠️ วัสดุยังไม่พร้อม!'
             WHEN v_case.traffic_light = 'yellow' THEN ' ⚡ วัสดุพร้อมบางส่วน'
             ELSE ' ✅ วัสดุพร้อม' END,
      CASE WHEN v_case.traffic_light = 'red' THEN 'high'
           WHEN v_case.traffic_light = 'yellow' THEN 'medium'
           ELSE 'low' END,
      'case',
      v_case.id
    )
    RETURNING id INTO v_notif_id;

    notification_id := v_notif_id;
    user_id := v_case.dentist_id;
    notification_type := 'case_today';
    case_number := v_case.case_number;
    RETURN NEXT;
  END LOOP;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- =============================================
-- 3. Function: แจ้งเตือนเคสที่วัสดุไม่พร้อม → ฝ่ายคลัง
-- =============================================
CREATE OR REPLACE FUNCTION daily_notify_inventory_issues()
RETURNS TABLE (
  notification_id UUID,
  issue_type TEXT,
  case_count INT,
  details TEXT
) AS $$
DECLARE
  v_inventory_users UUID[];
  v_user_id UUID;
  v_notif_id UUID;
  v_red_cases INT;
  v_yellow_cases INT;
  v_case_list TEXT;
BEGIN
  -- Get all inventory role users
  SELECT ARRAY_AGG(u.id) INTO v_inventory_users
  FROM users u
  JOIN roles r ON r.id = u.role_id
  WHERE r.name = 'inventory';

  -- Count cases with issues in next 3 days
  SELECT 
    COUNT(*) FILTER (WHERE traffic_light = 'red'),
    COUNT(*) FILTER (WHERE traffic_light = 'yellow')
  INTO v_red_cases, v_yellow_cases
  FROM cases
  WHERE scheduled_date BETWEEN CURRENT_DATE AND CURRENT_DATE + INTERVAL '3 days'
    AND status = 'scheduled';

  -- Get case list for red cases
  SELECT STRING_AGG(case_number || ' (' || scheduled_date || ')', ', ')
  INTO v_case_list
  FROM cases
  WHERE scheduled_date BETWEEN CURRENT_DATE AND CURRENT_DATE + INTERVAL '3 days'
    AND status = 'scheduled'
    AND traffic_light = 'red'
  LIMIT 5;

  -- Notify inventory users if there are issues
  IF v_red_cases > 0 OR v_yellow_cases > 0 THEN
    FOREACH v_user_id IN ARRAY v_inventory_users
    LOOP
      INSERT INTO notifications (
        user_id, type, title, message, priority
      ) VALUES (
        v_user_id,
        'inventory_alert',
        '⚠️ เคสที่ต้องเตรียมของ (3 วันข้างหน้า)',
        'เคสสีแดง: ' || v_red_cases || ' เคส, สีเหลือง: ' || v_yellow_cases || ' เคส' ||
          CASE WHEN v_case_list IS NOT NULL THEN E'\nเคสด่วน: ' || v_case_list ELSE '' END,
        CASE WHEN v_red_cases > 0 THEN 'high' ELSE 'medium' END
      )
      RETURNING id INTO v_notif_id;

      notification_id := v_notif_id;
      issue_type := 'cases_not_ready';
      case_count := v_red_cases + v_yellow_cases;
      details := v_case_list;
      RETURN NEXT;
    END LOOP;
  END IF;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- =============================================
-- 4. Function: แจ้งเตือนวัสดุใกล้หมดอายุ
-- =============================================
CREATE OR REPLACE FUNCTION daily_notify_expiring_items()
RETURNS TABLE (
  notification_id UUID,
  product_name TEXT,
  lot_number TEXT,
  expiry_date DATE,
  days_until_expiry INT,
  quantity INT
) AS $$
DECLARE
  v_inventory_users UUID[];
  v_user_id UUID;
  v_notif_id UUID;
  v_item RECORD;
  v_expiring_count INT;
  v_expired_count INT;
  v_summary TEXT;
BEGIN
  -- Get inventory users
  SELECT ARRAY_AGG(u.id) INTO v_inventory_users
  FROM users u
  JOIN roles r ON r.id = u.role_id
  WHERE r.name IN ('inventory', 'admin');

  -- Count expiring items
  SELECT 
    COUNT(*) FILTER (WHERE expiry_date BETWEEN CURRENT_DATE AND CURRENT_DATE + INTERVAL '30 days'),
    COUNT(*) FILTER (WHERE expiry_date < CURRENT_DATE)
  INTO v_expiring_count, v_expired_count
  FROM stock_items
  WHERE status = 'active'
    AND quantity > 0
    AND expiry_date IS NOT NULL;

  -- Create summary notification
  IF v_expiring_count > 0 OR v_expired_count > 0 THEN
    v_summary := '';
    IF v_expired_count > 0 THEN
      v_summary := '🔴 หมดอายุแล้ว: ' || v_expired_count || ' รายการ';
    END IF;
    IF v_expiring_count > 0 THEN
      IF v_summary != '' THEN v_summary := v_summary || E'\n'; END IF;
      v_summary := v_summary || '🟡 ใกล้หมดอายุ (30 วัน): ' || v_expiring_count || ' รายการ';
    END IF;

    FOREACH v_user_id IN ARRAY v_inventory_users
    LOOP
      INSERT INTO notifications (
        user_id, type, title, message, priority
      ) VALUES (
        v_user_id,
        'expiry_alert',
        '⏰ แจ้งเตือนวัสดุหมดอายุ',
        v_summary,
        CASE WHEN v_expired_count > 0 THEN 'high' ELSE 'medium' END
      )
      RETURNING id INTO v_notif_id;
    END LOOP;
  END IF;

  -- Return details of expiring items
  FOR v_item IN
    SELECT 
      p.name as product_name,
      si.lot_number,
      si.expiry_date,
      (si.expiry_date - CURRENT_DATE)::INT as days_until,
      si.quantity
    FROM stock_items si
    JOIN products p ON p.id = si.product_id
    WHERE si.status = 'active'
      AND si.quantity > 0
      AND si.expiry_date IS NOT NULL
      AND si.expiry_date <= CURRENT_DATE + INTERVAL '30 days'
    ORDER BY si.expiry_date
    LIMIT 20
  LOOP
    notification_id := v_notif_id;
    product_name := v_item.product_name;
    lot_number := v_item.lot_number;
    expiry_date := v_item.expiry_date;
    days_until_expiry := v_item.days_until;
    quantity := v_item.quantity;
    RETURN NEXT;
  END LOOP;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- =============================================
-- 5. Function: แจ้งเตือน PO ที่เกินกำหนดรับ
-- =============================================
CREATE OR REPLACE FUNCTION daily_notify_overdue_po()
RETURNS TABLE (
  notification_id UUID,
  po_number TEXT,
  supplier_name TEXT,
  expected_date DATE,
  days_overdue INT
) AS $$
DECLARE
  v_inventory_users UUID[];
  v_user_id UUID;
  v_notif_id UUID;
  v_po RECORD;
  v_overdue_count INT;
BEGIN
  -- Get inventory users
  SELECT ARRAY_AGG(u.id) INTO v_inventory_users
  FROM users u
  JOIN roles r ON r.id = u.role_id
  WHERE r.name IN ('inventory', 'admin');

  -- Count overdue POs
  SELECT COUNT(*) INTO v_overdue_count
  FROM purchase_orders po
  WHERE po.status IN ('sent', 'confirmed')
    AND po.expected_delivery_date < CURRENT_DATE;

  -- Notify if there are overdue POs
  IF v_overdue_count > 0 THEN
    FOREACH v_user_id IN ARRAY v_inventory_users
    LOOP
      INSERT INTO notifications (
        user_id, type, title, message, priority
      ) VALUES (
        v_user_id,
        'po_overdue',
        '📦 PO เกินกำหนดรับ: ' || v_overdue_count || ' รายการ',
        'กรุณาติดตาม Supplier เพื่อเร่งรับของ',
        'high'
      )
      RETURNING id INTO v_notif_id;
    END LOOP;
  END IF;

  -- Return overdue PO details
  FOR v_po IN
    SELECT 
      po.po_number,
      s.name as supplier_name,
      po.expected_delivery_date,
      (CURRENT_DATE - po.expected_delivery_date)::INT as days_overdue
    FROM purchase_orders po
    JOIN suppliers s ON s.id = po.supplier_id
    WHERE po.status IN ('sent', 'confirmed')
      AND po.expected_delivery_date < CURRENT_DATE
    ORDER BY po.expected_delivery_date
  LOOP
    notification_id := v_notif_id;
    po_number := v_po.po_number;
    supplier_name := v_po.supplier_name;
    expected_date := v_po.expected_delivery_date;
    days_overdue := v_po.days_overdue;
    RETURN NEXT;
  END LOOP;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- =============================================
-- 6. Function: ตรวจสอบ Dead Stock
-- =============================================
CREATE OR REPLACE FUNCTION daily_check_dead_stock()
RETURNS TABLE (
  product_id UUID,
  product_name TEXT,
  total_quantity INT,
  last_used_date DATE,
  days_since_last_use INT
) AS $$
BEGIN
  RETURN QUERY
  SELECT 
    p.id as product_id,
    p.name as product_name,
    COALESCE(SUM(si.quantity), 0)::INT as total_quantity,
    MAX(su.used_at)::DATE as last_used_date,
    (CURRENT_DATE - COALESCE(MAX(su.used_at)::DATE, p.created_at::DATE))::INT as days_since_last_use
  FROM products p
  LEFT JOIN stock_items si ON si.product_id = p.id AND si.status = 'active'
  LEFT JOIN stock_usage su ON su.stock_item_id = si.id
  WHERE p.is_active = true
  GROUP BY p.id, p.name, p.created_at
  HAVING COALESCE(SUM(si.quantity), 0) > 0
    AND (CURRENT_DATE - COALESCE(MAX(su.used_at)::DATE, p.created_at::DATE)) > 90
  ORDER BY days_since_last_use DESC;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- =============================================
-- 7. Master Function: รันทุก Daily Tasks
-- =============================================
CREATE OR REPLACE FUNCTION run_daily_maintenance()
RETURNS JSONB AS $$
DECLARE
  v_result JSONB;
  v_traffic_light_changes INT;
  v_today_notifications INT;
  v_inventory_notifications INT;
  v_expiry_notifications INT;
  v_po_notifications INT;
  v_dead_stock_count INT;
BEGIN
  -- 1. Update traffic lights
  SELECT COUNT(*) INTO v_traffic_light_changes
  FROM daily_update_traffic_lights();

  -- 2. Notify today's cases
  SELECT COUNT(*) INTO v_today_notifications
  FROM daily_notify_today_cases();

  -- 3. Notify inventory issues
  SELECT COUNT(*) INTO v_inventory_notifications
  FROM daily_notify_inventory_issues();

  -- 4. Notify expiring items
  SELECT COUNT(*) INTO v_expiry_notifications
  FROM daily_notify_expiring_items();

  -- 5. Notify overdue POs
  SELECT COUNT(*) INTO v_po_notifications
  FROM daily_notify_overdue_po();

  -- 6. Check dead stock
  SELECT COUNT(*) INTO v_dead_stock_count
  FROM daily_check_dead_stock();

  -- Build result
  v_result := jsonb_build_object(
    'executed_at', NOW(),
    'timezone', 'Asia/Bangkok',
    'results', jsonb_build_object(
      'traffic_light_changes', v_traffic_light_changes,
      'today_case_notifications', v_today_notifications,
      'inventory_alert_notifications', v_inventory_notifications,
      'expiry_alert_notifications', v_expiry_notifications,
      'po_overdue_notifications', v_po_notifications,
      'dead_stock_items', v_dead_stock_count
    )
  );

  -- Log the maintenance run
  INSERT INTO audit_logs (
    table_name, record_id, action, old_data, new_data, performed_by
  ) VALUES (
    'system', gen_random_uuid(), 'daily_maintenance', NULL, v_result, NULL
  );

  RETURN v_result;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- =============================================
-- Grant permissions
-- =============================================
GRANT EXECUTE ON FUNCTION daily_update_traffic_lights() TO authenticated;
GRANT EXECUTE ON FUNCTION daily_notify_today_cases() TO authenticated;
GRANT EXECUTE ON FUNCTION daily_notify_inventory_issues() TO authenticated;
GRANT EXECUTE ON FUNCTION daily_notify_expiring_items() TO authenticated;
GRANT EXECUTE ON FUNCTION daily_notify_overdue_po() TO authenticated;
GRANT EXECUTE ON FUNCTION daily_check_dead_stock() TO authenticated;
GRANT EXECUTE ON FUNCTION run_daily_maintenance() TO authenticated, service_role;
