-- =====================================================
-- FIX: Traffic Light Logic
-- =====================================================
-- Problem: Cases without reservations show green (ready) instead of red (not ready)
-- Solution: Add check for cases with no reservations
--
-- New Logic:
-- - GREEN: Has reservations AND all materials are available
-- - YELLOW: Has reservations AND some materials are in-transit (PO sent)
-- - RED: Has reservations but materials are short OR No reservations at all
-- =====================================================

-- Drop existing function and recreate with correct logic
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

  -- If no reservations, case is NOT ready (red)
  IF v_reservation_count = 0 THEN
    v_traffic_light := 'red';
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

-- =====================================================
-- Also fix daily_update_traffic_lights function
-- =====================================================

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

    -- If no reservations, case is NOT ready (red)
    IF v_reservation_count = 0 THEN
      v_new_status := 'red';
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
      RETURN NEXT;
    END IF;
  END LOOP;
END;
$$ LANGUAGE plpgsql;

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
