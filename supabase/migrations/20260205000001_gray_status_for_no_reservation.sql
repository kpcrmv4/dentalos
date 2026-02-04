-- =====================================================
-- ADD: Gray Status for Cases Without Reservations
-- =====================================================
-- Problem: Cases without reservations show red (not ready) which is confusing
-- Solution: Add 'gray' status to indicate "pending reservation" vs "material shortage"
--
-- New Traffic Light Logic:
-- - GREEN: Has reservations AND all materials are available
-- - YELLOW: Has reservations AND some materials are in-transit (PO sent)
-- - RED: Has reservations but materials are short
-- - GRAY: No reservations yet (pending reservation)
-- =====================================================

-- Drop existing functions first to avoid return type conflicts
DROP FUNCTION IF EXISTS update_case_traffic_light(UUID);
DROP FUNCTION IF EXISTS daily_update_traffic_lights();
DROP FUNCTION IF EXISTS get_dentist_stats(UUID, DATE, DATE);
DROP FUNCTION IF EXISTS get_action_required_cases(UUID, INTEGER);
DROP FUNCTION IF EXISTS get_dentist_cases_calendar(UUID, DATE, DATE);
DROP FUNCTION IF EXISTS get_calendar_summary(UUID, DATE, DATE);

-- -----------------------------------------------------
-- 1. Update update_case_traffic_light function
-- -----------------------------------------------------
CREATE OR REPLACE FUNCTION update_case_traffic_light(p_case_id UUID)
RETURNS void AS $$
DECLARE
  v_reservation_count INTEGER;
  v_has_shortage BOOLEAN;
  v_has_intransit BOOLEAN;
  v_traffic_light VARCHAR(10);
  v_old_traffic_light VARCHAR(10);
  v_dentist_id UUID;
  v_case_number VARCHAR(50);
BEGIN
  -- Get current traffic light
  SELECT traffic_light, dentist_id, case_number 
  INTO v_old_traffic_light, v_dentist_id, v_case_number
  FROM cases WHERE id = p_case_id;

  -- Count reservations for this case
  SELECT COUNT(*) 
  INTO v_reservation_count
  FROM reservations r
  WHERE r.case_id = p_case_id
    AND r.status = 'reserved';

  -- If no reservations, case is GRAY (pending reservation)
  IF v_reservation_count = 0 THEN
    v_traffic_light := 'gray';
  ELSE
    -- Check if any reserved items don't have enough physical stock
    SELECT EXISTS(
      SELECT 1 
      FROM reservations r
      JOIN stock_items s ON s.id = r.stock_item_id
      WHERE r.case_id = p_case_id
        AND r.status = 'reserved'
        AND s.quantity < r.quantity
    ) INTO v_has_shortage;

    -- Also check if reserved_quantity exceeds available
    IF NOT v_has_shortage THEN
      SELECT EXISTS(
        SELECT 1 
        FROM reservations r
        JOIN stock_items s ON s.id = r.stock_item_id
        WHERE r.case_id = p_case_id
          AND r.status = 'reserved'
          AND (s.quantity - s.reserved_quantity + r.quantity) < r.quantity
      ) INTO v_has_shortage;
    END IF;

    -- Check for in-transit items (PO sent but not received)
    SELECT EXISTS(
      SELECT 1 
      FROM reservations r
      JOIN stock_items s ON s.id = r.stock_item_id
      JOIN po_items pi ON pi.product_id = s.product_id
      JOIN purchase_orders po ON po.id = pi.po_id
      WHERE r.case_id = p_case_id
        AND r.status = 'reserved'
        AND po.status = 'sent'
        AND pi.quantity_received < pi.quantity_ordered
    ) INTO v_has_intransit;

    -- Determine traffic light
    IF v_has_shortage THEN
      v_traffic_light := 'red';
    ELSIF v_has_intransit THEN
      v_traffic_light := 'yellow';
    ELSE
      v_traffic_light := 'green';
    END IF;
  END IF;

  -- Update case
  UPDATE cases
  SET traffic_light = v_traffic_light,
      updated_at = NOW()
  WHERE id = p_case_id;

  -- Send notification if traffic light changed to red (from green or yellow)
  IF v_traffic_light = 'red' AND v_old_traffic_light IN ('green', 'yellow') THEN
    INSERT INTO notifications (
      type, title, message, data, target_user_id
    ) VALUES (
      'traffic_light_red',
      'สถานะวัสดุเปลี่ยนเป็นสีแดง',
      'เคส ' || v_case_number || ' มีปัญหาเรื่องวัสดุ กรุณาตรวจสอบ',
      jsonb_build_object('case_id', p_case_id, 'case_number', v_case_number),
      v_dentist_id
    );
  END IF;
END;
$$ LANGUAGE plpgsql;

-- -----------------------------------------------------
-- 2. Update daily_update_traffic_lights function
-- -----------------------------------------------------
CREATE OR REPLACE FUNCTION daily_update_traffic_lights()
RETURNS TABLE (
  case_id UUID,
  case_number VARCHAR,
  old_status VARCHAR,
  new_status VARCHAR
) AS $$
DECLARE
  v_case RECORD;
  v_new_status VARCHAR(10);
  v_reservation_count INTEGER;
  v_has_shortage BOOLEAN;
  v_has_intransit BOOLEAN;
BEGIN
  -- Loop through all scheduled cases
  FOR v_case IN
    SELECT c.id, c.case_number, c.traffic_light, c.scheduled_date
    FROM cases c
    WHERE c.status IN ('scheduled', 'confirmed')
      AND c.scheduled_date >= CURRENT_DATE
    ORDER BY c.scheduled_date
  LOOP
    -- Count reservations for this case
    SELECT COUNT(*) 
    INTO v_reservation_count
    FROM reservations r
    WHERE r.case_id = v_case.id
      AND r.status = 'reserved';

    -- If no reservations, case is GRAY (pending reservation)
    IF v_reservation_count = 0 THEN
      v_new_status := 'gray';
    ELSE
      -- Check for shortages
      SELECT EXISTS(
        SELECT 1 
        FROM reservations r
        JOIN stock_items s ON s.id = r.stock_item_id
        WHERE r.case_id = v_case.id
          AND r.status = 'reserved'
          AND s.quantity < r.quantity
      ) INTO v_has_shortage;

      -- Check for in-transit
      SELECT EXISTS(
        SELECT 1 
        FROM reservations r
        JOIN stock_items s ON s.id = r.stock_item_id
        JOIN po_items pi ON pi.product_id = s.product_id
        JOIN purchase_orders po ON po.id = pi.po_id
        WHERE r.case_id = v_case.id
          AND r.status = 'reserved'
          AND po.status = 'sent'
          AND pi.quantity_received < pi.quantity_ordered
      ) INTO v_has_intransit;

      -- Determine status
      IF v_has_shortage THEN
        v_new_status := 'red';
      ELSIF v_has_intransit THEN
        v_new_status := 'yellow';
      ELSE
        v_new_status := 'green';
      END IF;
    END IF;

    -- Update if changed
    IF v_case.traffic_light IS DISTINCT FROM v_new_status THEN
      UPDATE cases
      SET traffic_light = v_new_status,
          updated_at = NOW()
      WHERE id = v_case.id;

      -- Return the change
      case_id := v_case.id;
      case_number := v_case.case_number;
      old_status := v_case.traffic_light;
      new_status := v_new_status;
      RETURN NEXT;
    END IF;
  END LOOP;
END;
$$ LANGUAGE plpgsql;

-- -----------------------------------------------------
-- 3. Update get_dentist_stats function
-- -----------------------------------------------------
CREATE OR REPLACE FUNCTION get_dentist_stats(
  p_dentist_id UUID,
  p_start_date DATE DEFAULT NULL,
  p_end_date DATE DEFAULT NULL
) RETURNS JSONB
LANGUAGE plpgsql
AS $$
DECLARE
  v_start_date DATE;
  v_end_date DATE;
  v_result JSONB;
BEGIN
  -- Default to current month if not specified
  v_start_date := COALESCE(p_start_date, DATE_TRUNC('month', CURRENT_DATE)::DATE);
  v_end_date := COALESCE(p_end_date, (DATE_TRUNC('month', CURRENT_DATE) + INTERVAL '1 month - 1 day')::DATE);
  
  SELECT jsonb_build_object(
    'total_cases', COUNT(*),
    'pending_reservation', COUNT(*) FILTER (WHERE c.traffic_light = 'gray' OR NOT EXISTS (
      SELECT 1 FROM reservations r WHERE r.case_id = c.id
    )),
    'ready_cases', COUNT(*) FILTER (WHERE c.traffic_light = 'green'),
    'partial_ready_cases', COUNT(*) FILTER (WHERE c.traffic_light = 'yellow'),
    'not_ready_cases', COUNT(*) FILTER (WHERE c.traffic_light = 'red'),
    'no_reservation_cases', COUNT(*) FILTER (WHERE c.traffic_light = 'gray'),
    'completed_cases', COUNT(*) FILTER (WHERE c.status = 'completed'),
    'today_cases', COUNT(*) FILTER (WHERE c.scheduled_date = CURRENT_DATE),
    'tomorrow_cases', COUNT(*) FILTER (WHERE c.scheduled_date = CURRENT_DATE + INTERVAL '1 day'),
    'this_week_cases', COUNT(*) FILTER (WHERE c.scheduled_date BETWEEN CURRENT_DATE AND CURRENT_DATE + INTERVAL '7 days')
  ) INTO v_result
  FROM cases c
  WHERE c.dentist_id = p_dentist_id
    AND c.scheduled_date BETWEEN v_start_date AND v_end_date
    AND c.status != 'cancelled';
  
  RETURN v_result;
END;
$$;

-- -----------------------------------------------------
-- 4. Update get_action_required_cases function
-- -----------------------------------------------------
CREATE OR REPLACE FUNCTION get_action_required_cases(
  p_dentist_id UUID,
  p_limit INTEGER DEFAULT 10
) RETURNS TABLE (
  case_id UUID,
  patient_name VARCHAR,
  surgery_date DATE,
  action_type VARCHAR,
  action_description TEXT,
  priority VARCHAR,
  traffic_light VARCHAR
)
LANGUAGE plpgsql
AS $$
BEGIN
  RETURN QUERY
  -- เคสที่ยังไม่ได้จองวัสดุ (gray)
  SELECT 
    c.id AS case_id,
    p.full_name AS patient_name,
    c.scheduled_date,
    'no_reservation'::VARCHAR AS action_type,
    'ยังไม่ได้จองวัสดุ - กรุณาจองวัสดุ'::TEXT AS action_description,
    CASE 
      WHEN c.scheduled_date <= CURRENT_DATE + INTERVAL '2 days' THEN 'high'
      WHEN c.scheduled_date <= CURRENT_DATE + INTERVAL '7 days' THEN 'medium'
      ELSE 'low'
    END AS priority,
    c.traffic_light
  FROM cases c
  JOIN patients p ON c.patient_id = p.id
  WHERE c.dentist_id = p_dentist_id
    AND c.status = 'scheduled'
    AND c.scheduled_date >= CURRENT_DATE
    AND c.traffic_light = 'gray'
  
  UNION ALL
  
  -- เคสที่วัสดุไม่พร้อม (red)
  SELECT 
    c.id AS case_id,
    p.full_name AS patient_name,
    c.scheduled_date,
    'material_shortage'::VARCHAR AS action_type,
    'วัสดุไม่เพียงพอ - ต้องรอของเข้าหรือสั่งซื้อ'::TEXT AS action_description,
    CASE 
      WHEN c.scheduled_date <= CURRENT_DATE + INTERVAL '2 days' THEN 'high'
      WHEN c.scheduled_date <= CURRENT_DATE + INTERVAL '7 days' THEN 'medium'
      ELSE 'low'
    END AS priority,
    c.traffic_light
  FROM cases c
  JOIN patients p ON c.patient_id = p.id
  WHERE c.dentist_id = p_dentist_id
    AND c.status = 'scheduled'
    AND c.scheduled_date >= CURRENT_DATE
    AND c.traffic_light = 'red'
  
  UNION ALL
  
  -- เคสที่วัสดุบางส่วนยังไม่พร้อม (yellow)
  SELECT 
    c.id AS case_id,
    p.full_name AS patient_name,
    c.scheduled_date,
    'material_in_transit'::VARCHAR AS action_type,
    'วัสดุบางส่วนกำลังจัดส่ง - รอรับของ'::TEXT AS action_description,
    CASE 
      WHEN c.scheduled_date <= CURRENT_DATE + INTERVAL '2 days' THEN 'high'
      WHEN c.scheduled_date <= CURRENT_DATE + INTERVAL '7 days' THEN 'medium'
      ELSE 'low'
    END AS priority,
    c.traffic_light
  FROM cases c
  JOIN patients p ON c.patient_id = p.id
  WHERE c.dentist_id = p_dentist_id
    AND c.status = 'scheduled'
    AND c.scheduled_date >= CURRENT_DATE
    AND c.traffic_light = 'yellow'
  
  ORDER BY 
    CASE priority
      WHEN 'high' THEN 1
      WHEN 'medium' THEN 2
      ELSE 3
    END,
    surgery_date ASC
  LIMIT p_limit;
END;
$$;

-- -----------------------------------------------------
-- 5. Update get_dentist_cases_calendar function
-- -----------------------------------------------------
CREATE OR REPLACE FUNCTION get_dentist_cases_calendar(
  p_dentist_id UUID,
  p_start_date DATE,
  p_end_date DATE
) RETURNS TABLE (
  case_id UUID,
  patient_name VARCHAR,
  patient_hn VARCHAR,
  surgery_date DATE,
  surgery_time TIME,
  treatment_type VARCHAR,
  tooth_number VARCHAR,
  status VARCHAR,
  traffic_light_status VARCHAR,
  reservation_count INTEGER,
  total_items_reserved INTEGER,
  items_ready INTEGER
)
LANGUAGE plpgsql
AS $$
BEGIN
  RETURN QUERY
  SELECT 
    c.id AS case_id,
    p.full_name AS patient_name,
    p.hn_number AS patient_hn,
    c.scheduled_date,
    c.scheduled_time,
    c.procedure_type AS treatment_type,
    c.tooth_number,
    c.status,
    c.traffic_light AS traffic_light_status,
    (SELECT COUNT(*)::INTEGER FROM reservations r WHERE r.case_id = c.id) AS reservation_count,
    (SELECT COALESCE(SUM(r.quantity), 0)::INTEGER FROM reservations r WHERE r.case_id = c.id) AS total_items_reserved,
    (SELECT COALESCE(SUM(r.quantity), 0)::INTEGER FROM reservations r WHERE r.case_id = c.id AND r.status = 'reserved') AS items_ready
  FROM cases c
  JOIN patients p ON c.patient_id = p.id
  WHERE c.dentist_id = p_dentist_id
    AND c.scheduled_date BETWEEN p_start_date AND p_end_date
    AND c.status != 'cancelled'
  ORDER BY c.scheduled_date ASC, c.scheduled_time ASC;
END;
$$;

-- -----------------------------------------------------
-- 6. Update get_calendar_summary function
-- -----------------------------------------------------
CREATE OR REPLACE FUNCTION get_calendar_summary(
  p_dentist_id UUID,
  p_start_date DATE,
  p_end_date DATE
) RETURNS JSONB
LANGUAGE plpgsql
AS $$
DECLARE
  v_result JSONB;
BEGIN
  SELECT jsonb_build_object(
    'total_cases', COUNT(*),
    'total_days', COUNT(DISTINCT c.scheduled_date),
    'green_cases', COUNT(*) FILTER (WHERE c.traffic_light = 'green'),
    'yellow_cases', COUNT(*) FILTER (WHERE c.traffic_light = 'yellow'),
    'red_cases', COUNT(*) FILTER (WHERE c.traffic_light = 'red'),
    'gray_cases', COUNT(*) FILTER (WHERE c.traffic_light = 'gray'),
    'cases_by_date', (
      SELECT COALESCE(jsonb_agg(
        jsonb_build_object(
          'date', d.date,
          'count', d.cnt,
          'green', d.green_cnt,
          'yellow', d.yellow_cnt,
          'red', d.red_cnt,
          'gray', d.gray_cnt
        )
      ), '[]'::JSONB)
      FROM (
        SELECT 
          c2.scheduled_date AS date,
          COUNT(*) AS cnt,
          COUNT(*) FILTER (WHERE c2.traffic_light = 'green') AS green_cnt,
          COUNT(*) FILTER (WHERE c2.traffic_light = 'yellow') AS yellow_cnt,
          COUNT(*) FILTER (WHERE c2.traffic_light = 'red') AS red_cnt,
          COUNT(*) FILTER (WHERE c2.traffic_light = 'gray') AS gray_cnt
        FROM cases c2
        WHERE c2.dentist_id = p_dentist_id
          AND c2.scheduled_date BETWEEN p_start_date AND p_end_date
          AND c2.status != 'cancelled'
        GROUP BY c2.scheduled_date
        ORDER BY c2.scheduled_date
      ) d
    ),
    'treatment_types', (
      SELECT COALESCE(jsonb_agg(
        jsonb_build_object(
          'type', t.procedure_type,
          'count', t.cnt
        )
      ), '[]'::JSONB)
      FROM (
        SELECT 
          c3.procedure_type,
          COUNT(*) AS cnt
        FROM cases c3
        WHERE c3.dentist_id = p_dentist_id
          AND c3.scheduled_date BETWEEN p_start_date AND p_end_date
          AND c3.status != 'cancelled'
        GROUP BY c3.procedure_type
        ORDER BY cnt DESC
      ) t
    )
  ) INTO v_result
  FROM cases c
  WHERE c.dentist_id = p_dentist_id
    AND c.scheduled_date BETWEEN p_start_date AND p_end_date
    AND c.status != 'cancelled';
  
  RETURN v_result;
END;
$$;

-- =====================================================
-- Run update on all existing cases to fix current data
-- =====================================================
DO $$
DECLARE
  v_case_id UUID;
BEGIN
  FOR v_case_id IN
    SELECT id FROM cases WHERE status IN ('scheduled', 'confirmed')
  LOOP
    PERFORM update_case_traffic_light(v_case_id);
  END LOOP;
END;
$$;

-- Grant permissions
GRANT EXECUTE ON FUNCTION update_case_traffic_light(UUID) TO authenticated;
GRANT EXECUTE ON FUNCTION daily_update_traffic_lights() TO authenticated;
GRANT EXECUTE ON FUNCTION get_dentist_stats(UUID, DATE, DATE) TO authenticated;
GRANT EXECUTE ON FUNCTION get_action_required_cases(UUID, INTEGER) TO authenticated;
GRANT EXECUTE ON FUNCTION get_dentist_cases_calendar(UUID, DATE, DATE) TO authenticated;
GRANT EXECUTE ON FUNCTION get_calendar_summary(UUID, DATE, DATE) TO authenticated;
