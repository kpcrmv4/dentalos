-- =====================================================
-- DentalFlow OS - Advanced Reservation Logic
-- Version: 1.1.0
-- Created: 2026-02-04
-- =====================================================

-- =====================================================
-- 1. SCHEMA UPDATES
-- =====================================================

-- Add new columns to reservations for tracking changes
ALTER TABLE reservations ADD COLUMN IF NOT EXISTS original_quantity INTEGER;
ALTER TABLE reservations ADD COLUMN IF NOT EXISTS original_stock_item_id UUID REFERENCES stock_items(id);
ALTER TABLE reservations ADD COLUMN IF NOT EXISTS stolen_from_case_id UUID REFERENCES cases(id);
ALTER TABLE reservations ADD COLUMN IF NOT EXISTS swap_reason TEXT;
ALTER TABLE reservations ADD COLUMN IF NOT EXISTS action_notes TEXT;

-- Update reservation status to include new states
-- Status values: 'reserved', 'used', 'cancelled', 'partial_used', 'stolen'
COMMENT ON COLUMN reservations.status IS 'Status: reserved, used, cancelled, partial_used, stolen';

-- Create table to track reservation history/changes
CREATE TABLE IF NOT EXISTS reservation_history (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  reservation_id UUID NOT NULL REFERENCES reservations(id) ON DELETE CASCADE,
  action VARCHAR(50) NOT NULL, -- 'created', 'used', 'cancelled', 'partial_cancelled', 'swapped', 'stolen', 'quantity_changed'
  old_status VARCHAR(20),
  new_status VARCHAR(20),
  old_stock_item_id UUID REFERENCES stock_items(id),
  new_stock_item_id UUID REFERENCES stock_items(id),
  old_quantity INTEGER,
  new_quantity INTEGER,
  affected_case_id UUID REFERENCES cases(id), -- For stolen: the case that was affected
  reason TEXT,
  performed_by UUID NOT NULL REFERENCES profiles(id),
  performed_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_reservation_history_reservation ON reservation_history(reservation_id);
CREATE INDEX IF NOT EXISTS idx_reservation_history_action ON reservation_history(action);

-- =====================================================
-- 2. CANCEL RESERVATION FUNCTION
-- =====================================================

-- Function: Cancel a reservation (return stock)
CREATE OR REPLACE FUNCTION cancel_reservation(
  p_reservation_id UUID,
  p_reason TEXT,
  p_user_id UUID
) RETURNS BOOLEAN AS $$
DECLARE
  v_reservation RECORD;
BEGIN
  -- Get reservation details with lock
  SELECT r.*, s.product_id
  INTO v_reservation
  FROM reservations r
  JOIN stock_items s ON s.id = r.stock_item_id
  WHERE r.id = p_reservation_id
  FOR UPDATE;

  IF v_reservation IS NULL THEN
    RAISE EXCEPTION 'Reservation not found: %', p_reservation_id;
  END IF;

  IF v_reservation.status NOT IN ('reserved') THEN
    RAISE EXCEPTION 'Cannot cancel reservation with status: %', v_reservation.status;
  END IF;

  -- Return reserved quantity to stock
  UPDATE stock_items
  SET reserved_quantity = reserved_quantity - v_reservation.quantity,
      updated_at = NOW()
  WHERE id = v_reservation.stock_item_id;

  -- Update reservation status
  UPDATE reservations
  SET status = 'cancelled',
      cancelled_at = NOW(),
      cancelled_by = p_user_id,
      cancel_reason = p_reason
  WHERE id = p_reservation_id;

  -- Log history
  INSERT INTO reservation_history (
    reservation_id, action, old_status, new_status,
    old_quantity, new_quantity, reason, performed_by
  ) VALUES (
    p_reservation_id, 'cancelled', 'reserved', 'cancelled',
    v_reservation.quantity, 0, p_reason, p_user_id
  );

  -- Update traffic light for the case
  PERFORM update_case_traffic_light(v_reservation.case_id);

  RETURN TRUE;
END;
$$ LANGUAGE plpgsql;

-- =====================================================
-- 3. PARTIAL USE/CANCEL FUNCTION
-- =====================================================

-- Function: Partially use reservation (use some, return the rest)
CREATE OR REPLACE FUNCTION partial_use_reservation(
  p_reservation_id UUID,
  p_quantity_used INTEGER,
  p_photo_url TEXT,
  p_reason TEXT,
  p_user_id UUID
) RETURNS UUID AS $$
DECLARE
  v_reservation RECORD;
  v_case_material_id UUID;
  v_quantity_returned INTEGER;
BEGIN
  -- Get reservation details with lock
  SELECT r.*, s.product_id, s.lot_number
  INTO v_reservation
  FROM reservations r
  JOIN stock_items s ON s.id = r.stock_item_id
  WHERE r.id = p_reservation_id
  FOR UPDATE;

  IF v_reservation IS NULL THEN
    RAISE EXCEPTION 'Reservation not found: %', p_reservation_id;
  END IF;

  IF v_reservation.status != 'reserved' THEN
    RAISE EXCEPTION 'Reservation is not in reserved status';
  END IF;

  IF p_quantity_used <= 0 THEN
    RAISE EXCEPTION 'Quantity used must be greater than 0';
  END IF;

  IF p_quantity_used > v_reservation.quantity THEN
    RAISE EXCEPTION 'Cannot use more than reserved quantity';
  END IF;

  v_quantity_returned := v_reservation.quantity - p_quantity_used;

  -- Update stock: deduct used, return unused
  UPDATE stock_items
  SET quantity = quantity - p_quantity_used,
      reserved_quantity = reserved_quantity - v_reservation.quantity, -- Remove all reserved
      updated_at = NOW()
  WHERE id = v_reservation.stock_item_id;

  -- Update reservation
  UPDATE reservations
  SET status = CASE WHEN p_quantity_used < v_reservation.quantity THEN 'partial_used' ELSE 'used' END,
      quantity = p_quantity_used,
      original_quantity = v_reservation.quantity,
      used_at = NOW(),
      used_by = p_user_id,
      action_notes = p_reason
  WHERE id = p_reservation_id;

  -- Create case material record
  INSERT INTO case_materials (
    case_id, reservation_id, product_id, lot_number,
    quantity_used, photo_url, notes, used_by
  )
  VALUES (
    v_reservation.case_id, p_reservation_id, v_reservation.product_id,
    v_reservation.lot_number, p_quantity_used, p_photo_url, p_reason, p_user_id
  )
  RETURNING id INTO v_case_material_id;

  -- Log history
  INSERT INTO reservation_history (
    reservation_id, action, old_status, new_status,
    old_quantity, new_quantity, reason, performed_by
  ) VALUES (
    p_reservation_id, 
    CASE WHEN v_quantity_returned > 0 THEN 'partial_used' ELSE 'used' END,
    'reserved',
    CASE WHEN v_quantity_returned > 0 THEN 'partial_used' ELSE 'used' END,
    v_reservation.quantity, p_quantity_used, p_reason, p_user_id
  );

  RETURN v_case_material_id;
END;
$$ LANGUAGE plpgsql;

-- =====================================================
-- 4. SWAP STOCK ITEM FUNCTION
-- =====================================================

-- Function: Swap reservation to different stock item
CREATE OR REPLACE FUNCTION swap_reservation_stock(
  p_reservation_id UUID,
  p_new_stock_item_id UUID,
  p_new_quantity INTEGER,
  p_reason TEXT,
  p_user_id UUID
) RETURNS BOOLEAN AS $$
DECLARE
  v_reservation RECORD;
  v_new_stock RECORD;
  v_available INTEGER;
BEGIN
  -- Get current reservation with lock
  SELECT r.*, s.product_id as old_product_id
  INTO v_reservation
  FROM reservations r
  JOIN stock_items s ON s.id = r.stock_item_id
  WHERE r.id = p_reservation_id
  FOR UPDATE;

  IF v_reservation IS NULL THEN
    RAISE EXCEPTION 'Reservation not found: %', p_reservation_id;
  END IF;

  IF v_reservation.status != 'reserved' THEN
    RAISE EXCEPTION 'Can only swap reservations with status reserved';
  END IF;

  -- Get new stock item with lock
  SELECT *, (quantity - reserved_quantity) as available
  INTO v_new_stock
  FROM stock_items
  WHERE id = p_new_stock_item_id
  FOR UPDATE;

  IF v_new_stock IS NULL THEN
    RAISE EXCEPTION 'New stock item not found: %', p_new_stock_item_id;
  END IF;

  IF v_new_stock.available < p_new_quantity THEN
    RAISE EXCEPTION 'Insufficient stock. Available: %, Requested: %', v_new_stock.available, p_new_quantity;
  END IF;

  -- Return reserved quantity to old stock
  UPDATE stock_items
  SET reserved_quantity = reserved_quantity - v_reservation.quantity,
      updated_at = NOW()
  WHERE id = v_reservation.stock_item_id;

  -- Reserve from new stock
  UPDATE stock_items
  SET reserved_quantity = reserved_quantity + p_new_quantity,
      updated_at = NOW()
  WHERE id = p_new_stock_item_id;

  -- Update reservation
  UPDATE reservations
  SET stock_item_id = p_new_stock_item_id,
      quantity = p_new_quantity,
      original_stock_item_id = COALESCE(original_stock_item_id, v_reservation.stock_item_id),
      original_quantity = COALESCE(original_quantity, v_reservation.quantity),
      swap_reason = p_reason
  WHERE id = p_reservation_id;

  -- Log history
  INSERT INTO reservation_history (
    reservation_id, action, old_status, new_status,
    old_stock_item_id, new_stock_item_id,
    old_quantity, new_quantity, reason, performed_by
  ) VALUES (
    p_reservation_id, 'swapped', 'reserved', 'reserved',
    v_reservation.stock_item_id, p_new_stock_item_id,
    v_reservation.quantity, p_new_quantity, p_reason, p_user_id
  );

  -- Update traffic light
  PERFORM update_case_traffic_light(v_reservation.case_id);

  RETURN TRUE;
END;
$$ LANGUAGE plpgsql;

-- =====================================================
-- 5. STEAL FROM ANOTHER CASE FUNCTION
-- =====================================================

-- Function: Steal/transfer reservation from another case
CREATE OR REPLACE FUNCTION steal_reservation(
  p_target_case_id UUID,
  p_source_reservation_id UUID,
  p_quantity INTEGER,
  p_reason TEXT,
  p_user_id UUID
) RETURNS UUID AS $$
DECLARE
  v_source_reservation RECORD;
  v_new_reservation_id UUID;
  v_source_case_id UUID;
  v_dentist_id UUID;
  v_patient_name VARCHAR(255);
  v_target_case_number VARCHAR(50);
BEGIN
  -- Get source reservation with lock
  SELECT r.*, s.product_id, c.dentist_id, c.case_number as source_case_number,
         p.full_name as patient_name
  INTO v_source_reservation
  FROM reservations r
  JOIN stock_items s ON s.id = r.stock_item_id
  JOIN cases c ON c.id = r.case_id
  JOIN patients p ON p.id = c.patient_id
  WHERE r.id = p_source_reservation_id
  FOR UPDATE;

  IF v_source_reservation IS NULL THEN
    RAISE EXCEPTION 'Source reservation not found';
  END IF;

  IF v_source_reservation.status != 'reserved' THEN
    RAISE EXCEPTION 'Can only steal from reserved status';
  END IF;

  IF p_quantity > v_source_reservation.quantity THEN
    RAISE EXCEPTION 'Cannot steal more than reserved quantity';
  END IF;

  v_source_case_id := v_source_reservation.case_id;
  v_dentist_id := v_source_reservation.dentist_id;

  -- Get target case number
  SELECT case_number INTO v_target_case_number FROM cases WHERE id = p_target_case_id;

  -- If stealing full quantity, update the existing reservation
  IF p_quantity = v_source_reservation.quantity THEN
    -- Move entire reservation to new case
    UPDATE reservations
    SET case_id = p_target_case_id,
        stolen_from_case_id = v_source_case_id,
        action_notes = p_reason
    WHERE id = p_source_reservation_id;

    v_new_reservation_id := p_source_reservation_id;

    -- Log history for source
    INSERT INTO reservation_history (
      reservation_id, action, old_status, new_status,
      affected_case_id, reason, performed_by
    ) VALUES (
      p_source_reservation_id, 'stolen', 'reserved', 'reserved',
      v_source_case_id, p_reason, p_user_id
    );

  ELSE
    -- Partial steal: reduce source, create new for target
    
    -- Reduce source reservation quantity
    UPDATE reservations
    SET quantity = quantity - p_quantity
    WHERE id = p_source_reservation_id;

    -- Reduce reserved quantity in stock (will be re-added by new reservation)
    UPDATE stock_items
    SET reserved_quantity = reserved_quantity - p_quantity
    WHERE id = v_source_reservation.stock_item_id;

    -- Create new reservation for target case
    INSERT INTO reservations (
      case_id, stock_item_id, quantity, status,
      reserved_by, stolen_from_case_id, action_notes
    ) VALUES (
      p_target_case_id, v_source_reservation.stock_item_id, p_quantity,
      'reserved', p_user_id, v_source_case_id, p_reason
    )
    RETURNING id INTO v_new_reservation_id;

    -- Re-add reserved quantity
    UPDATE stock_items
    SET reserved_quantity = reserved_quantity + p_quantity
    WHERE id = v_source_reservation.stock_item_id;

    -- Log history for source (partial)
    INSERT INTO reservation_history (
      reservation_id, action, old_status, new_status,
      old_quantity, new_quantity, affected_case_id, reason, performed_by
    ) VALUES (
      p_source_reservation_id, 'quantity_reduced_by_steal', 'reserved', 'reserved',
      v_source_reservation.quantity, v_source_reservation.quantity - p_quantity,
      p_target_case_id, p_reason, p_user_id
    );

    -- Log history for new reservation
    INSERT INTO reservation_history (
      reservation_id, action, old_status, new_status,
      new_quantity, affected_case_id, reason, performed_by
    ) VALUES (
      v_new_reservation_id, 'created_from_steal', NULL, 'reserved',
      p_quantity, v_source_case_id, p_reason, p_user_id
    );
  END IF;

  -- Update traffic light for source case (may turn red)
  PERFORM update_case_traffic_light(v_source_case_id);

  -- Update traffic light for target case
  PERFORM update_case_traffic_light(p_target_case_id);

  -- Send notification to dentist of source case
  INSERT INTO notifications (
    type, title, message, data, target_user_id
  ) VALUES (
    'reservation_stolen',
    'วัสดุถูกโอนไปเคสอื่น',
    'วัสดุจากเคส ' || v_source_reservation.source_case_number || ' (' || v_source_reservation.patient_name || ') ถูกโอนไปเคส ' || v_target_case_number || ' เหตุผล: ' || p_reason,
    jsonb_build_object(
      'source_case_id', v_source_case_id,
      'target_case_id', p_target_case_id,
      'reservation_id', v_new_reservation_id,
      'quantity', p_quantity
    ),
    v_dentist_id
  );

  RETURN v_new_reservation_id;
END;
$$ LANGUAGE plpgsql;

-- =====================================================
-- 6. USE UNRESERVED STOCK FUNCTION
-- =====================================================

-- Function: Use stock directly without prior reservation
CREATE OR REPLACE FUNCTION use_unreserved_stock(
  p_case_id UUID,
  p_stock_item_id UUID,
  p_quantity INTEGER,
  p_photo_url TEXT,
  p_reason TEXT,
  p_user_id UUID
) RETURNS UUID AS $$
DECLARE
  v_stock RECORD;
  v_available INTEGER;
  v_reservation_id UUID;
  v_case_material_id UUID;
BEGIN
  -- Get stock item with lock
  SELECT s.*, p.id as product_id
  INTO v_stock
  FROM stock_items s
  JOIN products p ON p.id = s.product_id
  WHERE s.id = p_stock_item_id
  FOR UPDATE;

  IF v_stock IS NULL THEN
    RAISE EXCEPTION 'Stock item not found';
  END IF;

  v_available := v_stock.quantity - v_stock.reserved_quantity;

  IF v_available < p_quantity THEN
    RAISE EXCEPTION 'Insufficient unreserved stock. Available: %, Requested: %', v_available, p_quantity;
  END IF;

  -- Create a reservation record (for audit trail)
  INSERT INTO reservations (
    case_id, stock_item_id, quantity, status,
    reserved_by, reserved_at, used_at, used_by, action_notes
  ) VALUES (
    p_case_id, p_stock_item_id, p_quantity, 'used',
    p_user_id, NOW(), NOW(), p_user_id, 'Direct use without prior reservation: ' || p_reason
  )
  RETURNING id INTO v_reservation_id;

  -- Deduct stock directly (no reserved_quantity involved)
  UPDATE stock_items
  SET quantity = quantity - p_quantity,
      updated_at = NOW()
  WHERE id = p_stock_item_id;

  -- Create case material record
  INSERT INTO case_materials (
    case_id, reservation_id, product_id, lot_number,
    quantity_used, photo_url, notes, used_by
  )
  VALUES (
    p_case_id, v_reservation_id, v_stock.product_id,
    v_stock.lot_number, p_quantity, p_photo_url, p_reason, p_user_id
  )
  RETURNING id INTO v_case_material_id;

  -- Log history
  INSERT INTO reservation_history (
    reservation_id, action, new_status, new_quantity, reason, performed_by
  ) VALUES (
    v_reservation_id, 'direct_use', 'used', p_quantity, p_reason, p_user_id
  );

  RETURN v_case_material_id;
END;
$$ LANGUAGE plpgsql;

-- =====================================================
-- 7. ENHANCED TRAFFIC LIGHT UPDATE
-- =====================================================

-- Drop and recreate with enhanced logic
CREATE OR REPLACE FUNCTION update_case_traffic_light(p_case_id UUID)
RETURNS void AS $$
DECLARE
  v_total_reserved INTEGER;
  v_total_available INTEGER;
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
  SELECT EXISTS(
    SELECT 1 
    FROM reservations r
    JOIN stock_items s ON s.id = r.stock_item_id
    WHERE r.case_id = p_case_id
      AND r.status = 'reserved'
      AND (s.quantity - s.reserved_quantity + r.quantity) < r.quantity
  ) INTO v_has_shortage;

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
-- 8. TRIGGER TO UPDATE TRAFFIC LIGHT ON STOCK CHANGES
-- =====================================================

-- Function to update all affected cases when stock changes
CREATE OR REPLACE FUNCTION update_affected_cases_traffic_light()
RETURNS TRIGGER AS $$
DECLARE
  v_case_id UUID;
BEGIN
  -- Find all cases that have reservations for this stock item
  FOR v_case_id IN
    SELECT DISTINCT r.case_id
    FROM reservations r
    WHERE r.stock_item_id = COALESCE(NEW.id, OLD.id)
      AND r.status = 'reserved'
  LOOP
    PERFORM update_case_traffic_light(v_case_id);
  END LOOP;

  RETURN COALESCE(NEW, OLD);
END;
$$ LANGUAGE plpgsql;

-- Trigger on stock_items changes
DROP TRIGGER IF EXISTS trigger_update_cases_on_stock_change ON stock_items;
CREATE TRIGGER trigger_update_cases_on_stock_change
  AFTER UPDATE OF quantity, reserved_quantity ON stock_items
  FOR EACH ROW
  EXECUTE FUNCTION update_affected_cases_traffic_light();

-- =====================================================
-- 9. HELPER FUNCTION: GET AVAILABLE STOCK FOR SWAP
-- =====================================================

-- Function to get available stock items for swapping
CREATE OR REPLACE FUNCTION get_available_stock_for_swap(
  p_product_id UUID,
  p_exclude_stock_item_id UUID DEFAULT NULL,
  p_min_quantity INTEGER DEFAULT 1
)
RETURNS TABLE (
  stock_item_id UUID,
  lot_number VARCHAR(100),
  expiry_date DATE,
  available_quantity INTEGER,
  cost_price DECIMAL(10,2)
) AS $$
BEGIN
  RETURN QUERY
  SELECT 
    s.id,
    s.lot_number,
    s.expiry_date,
    (s.quantity - s.reserved_quantity)::INTEGER as available_quantity,
    s.cost_price
  FROM stock_items s
  WHERE s.product_id = p_product_id
    AND s.status = 'active'
    AND (s.quantity - s.reserved_quantity) >= p_min_quantity
    AND (p_exclude_stock_item_id IS NULL OR s.id != p_exclude_stock_item_id)
  ORDER BY s.expiry_date ASC NULLS LAST, s.created_at ASC;
END;
$$ LANGUAGE plpgsql;

-- =====================================================
-- 10. RLS POLICIES FOR NEW TABLE
-- =====================================================

ALTER TABLE reservation_history ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Authenticated can read reservation history" ON reservation_history
  FOR SELECT TO authenticated USING (true);

CREATE POLICY "System can insert reservation history" ON reservation_history
  FOR INSERT WITH CHECK (true);
