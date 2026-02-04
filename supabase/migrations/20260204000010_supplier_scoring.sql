-- =============================================
-- Supplier Scoring System
-- คำนวณคะแนน Supplier จาก Delivery Performance
-- =============================================

-- Add delivery tracking columns to purchase_orders if not exists
ALTER TABLE purchase_orders ADD COLUMN IF NOT EXISTS expected_delivery_date DATE;
ALTER TABLE purchase_orders ADD COLUMN IF NOT EXISTS actual_delivery_date DATE;
ALTER TABLE purchase_orders ADD COLUMN IF NOT EXISTS delivery_status TEXT CHECK (delivery_status IN ('pending', 'on_time', 'late', 'early'));

-- Create supplier_delivery_history table for detailed tracking
CREATE TABLE IF NOT EXISTS supplier_delivery_history (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  supplier_id UUID NOT NULL REFERENCES suppliers(id) ON DELETE CASCADE,
  purchase_order_id UUID REFERENCES purchase_orders(id) ON DELETE SET NULL,
  expected_date DATE NOT NULL,
  actual_date DATE,
  days_difference INTEGER, -- negative = early, positive = late
  delivery_status TEXT CHECK (delivery_status IN ('pending', 'on_time', 'late', 'early')),
  quality_rating INTEGER CHECK (quality_rating BETWEEN 1 AND 5), -- 1-5 stars
  notes TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  created_by UUID REFERENCES profiles(id)
);

-- Create index for faster queries
CREATE INDEX IF NOT EXISTS idx_supplier_delivery_history_supplier ON supplier_delivery_history(supplier_id);
CREATE INDEX IF NOT EXISTS idx_supplier_delivery_history_status ON supplier_delivery_history(delivery_status);
CREATE INDEX IF NOT EXISTS idx_supplier_delivery_history_date ON supplier_delivery_history(created_at DESC);

-- Enable RLS
ALTER TABLE supplier_delivery_history ENABLE ROW LEVEL SECURITY;

-- RLS Policies
CREATE POLICY "Users can view supplier delivery history"
  ON supplier_delivery_history FOR SELECT
  USING (true);

CREATE POLICY "Authenticated users can insert delivery history"
  ON supplier_delivery_history FOR INSERT
  WITH CHECK (auth.uid() IS NOT NULL);

CREATE POLICY "Authenticated users can update delivery history"
  ON supplier_delivery_history FOR UPDATE
  USING (auth.uid() IS NOT NULL);

-- =============================================
-- Function: Calculate Supplier Score
-- คำนวณคะแนนจาก:
-- 1. On-time delivery rate (60%)
-- 2. Average quality rating (30%)
-- 3. Total orders completed (10% - bonus for reliability)
-- =============================================
CREATE OR REPLACE FUNCTION calculate_supplier_score(p_supplier_id UUID)
RETURNS DECIMAL(3,2) AS $$
DECLARE
  v_total_deliveries INTEGER;
  v_on_time_deliveries INTEGER;
  v_on_time_rate DECIMAL;
  v_avg_quality DECIMAL;
  v_reliability_bonus DECIMAL;
  v_final_score DECIMAL;
BEGIN
  -- Get delivery statistics
  SELECT 
    COUNT(*),
    COUNT(*) FILTER (WHERE delivery_status IN ('on_time', 'early')),
    COALESCE(AVG(quality_rating), 4.0)
  INTO v_total_deliveries, v_on_time_deliveries, v_avg_quality
  FROM supplier_delivery_history
  WHERE supplier_id = p_supplier_id
    AND delivery_status IS NOT NULL;

  -- If no delivery history, return default score
  IF v_total_deliveries = 0 THEN
    RETURN 3.00;
  END IF;

  -- Calculate on-time rate (0-1)
  v_on_time_rate := v_on_time_deliveries::DECIMAL / v_total_deliveries;

  -- Calculate reliability bonus based on total orders (max 0.5)
  v_reliability_bonus := LEAST(v_total_deliveries::DECIMAL / 100, 0.5);

  -- Calculate final score (1-5 scale)
  -- On-time rate: 60% weight (max 3 points)
  -- Quality rating: 30% weight (max 1.5 points)
  -- Reliability bonus: 10% weight (max 0.5 points)
  v_final_score := (v_on_time_rate * 3.0) + (v_avg_quality / 5.0 * 1.5) + v_reliability_bonus;

  -- Ensure score is between 1 and 5
  v_final_score := GREATEST(1.00, LEAST(5.00, v_final_score));

  RETURN ROUND(v_final_score, 2);
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- =============================================
-- Function: Update All Supplier Scores
-- รันเป็น batch job ทุกวัน
-- =============================================
CREATE OR REPLACE FUNCTION update_all_supplier_scores()
RETURNS TABLE (
  supplier_id UUID,
  supplier_name TEXT,
  old_score DECIMAL,
  new_score DECIMAL
) AS $$
DECLARE
  v_supplier RECORD;
  v_new_score DECIMAL;
BEGIN
  FOR v_supplier IN 
    SELECT id, name, score FROM suppliers WHERE is_active = true
  LOOP
    v_new_score := calculate_supplier_score(v_supplier.id);
    
    IF v_new_score != v_supplier.score THEN
      UPDATE suppliers 
      SET score = v_new_score, updated_at = NOW()
      WHERE id = v_supplier.id;
      
      supplier_id := v_supplier.id;
      supplier_name := v_supplier.name;
      old_score := v_supplier.score;
      new_score := v_new_score;
      RETURN NEXT;
    END IF;
  END LOOP;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- =============================================
-- Function: Record Delivery and Update Score
-- เรียกเมื่อรับของจาก PO
-- =============================================
CREATE OR REPLACE FUNCTION record_delivery(
  p_supplier_id UUID,
  p_purchase_order_id UUID,
  p_expected_date DATE,
  p_actual_date DATE,
  p_quality_rating INTEGER DEFAULT 4,
  p_notes TEXT DEFAULT NULL
)
RETURNS UUID AS $$
DECLARE
  v_days_diff INTEGER;
  v_status TEXT;
  v_history_id UUID;
BEGIN
  -- Calculate days difference
  v_days_diff := p_actual_date - p_expected_date;
  
  -- Determine delivery status
  IF v_days_diff < -1 THEN
    v_status := 'early';
  ELSIF v_days_diff <= 1 THEN
    v_status := 'on_time'; -- Allow 1 day tolerance
  ELSE
    v_status := 'late';
  END IF;

  -- Insert delivery history
  INSERT INTO supplier_delivery_history (
    supplier_id, purchase_order_id, expected_date, actual_date,
    days_difference, delivery_status, quality_rating, notes, created_by
  ) VALUES (
    p_supplier_id, p_purchase_order_id, p_expected_date, p_actual_date,
    v_days_diff, v_status, p_quality_rating, p_notes, auth.uid()
  )
  RETURNING id INTO v_history_id;

  -- Update PO delivery info
  IF p_purchase_order_id IS NOT NULL THEN
    UPDATE purchase_orders
    SET actual_delivery_date = p_actual_date,
        delivery_status = v_status,
        updated_at = NOW()
    WHERE id = p_purchase_order_id;
  END IF;

  -- Update supplier score
  UPDATE suppliers
  SET score = calculate_supplier_score(p_supplier_id),
      updated_at = NOW()
  WHERE id = p_supplier_id;

  RETURN v_history_id;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- =============================================
-- Function: Get Supplier Performance Summary
-- ดึงข้อมูลสรุป performance ของ supplier
-- =============================================
CREATE OR REPLACE FUNCTION get_supplier_performance(p_supplier_id UUID)
RETURNS JSON AS $$
DECLARE
  v_result JSON;
BEGIN
  SELECT json_build_object(
    'supplier_id', s.id,
    'supplier_name', s.name,
    'current_score', s.score,
    'lead_time_days', s.lead_time_days,
    'total_deliveries', COUNT(h.id),
    'on_time_count', COUNT(*) FILTER (WHERE h.delivery_status = 'on_time'),
    'early_count', COUNT(*) FILTER (WHERE h.delivery_status = 'early'),
    'late_count', COUNT(*) FILTER (WHERE h.delivery_status = 'late'),
    'on_time_rate', ROUND(
      CASE WHEN COUNT(h.id) > 0 
        THEN COUNT(*) FILTER (WHERE h.delivery_status IN ('on_time', 'early'))::DECIMAL / COUNT(h.id) * 100
        ELSE 0 
      END, 1
    ),
    'avg_quality_rating', ROUND(COALESCE(AVG(h.quality_rating), 0), 1),
    'avg_days_late', ROUND(COALESCE(AVG(h.days_difference) FILTER (WHERE h.days_difference > 0), 0), 1),
    'last_delivery_date', MAX(h.actual_date),
    'recent_deliveries', (
      SELECT json_agg(json_build_object(
        'date', rh.actual_date,
        'status', rh.delivery_status,
        'quality', rh.quality_rating,
        'days_diff', rh.days_difference
      ) ORDER BY rh.actual_date DESC)
      FROM (
        SELECT * FROM supplier_delivery_history 
        WHERE supplier_id = p_supplier_id 
        ORDER BY created_at DESC 
        LIMIT 10
      ) rh
    )
  ) INTO v_result
  FROM suppliers s
  LEFT JOIN supplier_delivery_history h ON h.supplier_id = s.id
  WHERE s.id = p_supplier_id
  GROUP BY s.id, s.name, s.score, s.lead_time_days;

  RETURN v_result;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- =============================================
-- Function: Get All Suppliers with Performance
-- ดึงรายการ suppliers พร้อมข้อมูล performance
-- =============================================
CREATE OR REPLACE FUNCTION get_suppliers_with_performance()
RETURNS TABLE (
  id UUID,
  code TEXT,
  name TEXT,
  contact_name TEXT,
  phone TEXT,
  email TEXT,
  lead_time_days INTEGER,
  score DECIMAL,
  is_active BOOLEAN,
  total_deliveries BIGINT,
  on_time_rate DECIMAL,
  avg_quality DECIMAL
) AS $$
BEGIN
  RETURN QUERY
  SELECT 
    s.id,
    s.code,
    s.name,
    s.contact_name,
    s.phone,
    s.email,
    s.lead_time_days,
    s.score,
    s.is_active,
    COUNT(h.id) as total_deliveries,
    ROUND(
      CASE WHEN COUNT(h.id) > 0 
        THEN COUNT(*) FILTER (WHERE h.delivery_status IN ('on_time', 'early'))::DECIMAL / COUNT(h.id) * 100
        ELSE 0 
      END, 1
    ) as on_time_rate,
    ROUND(COALESCE(AVG(h.quality_rating), 0), 1) as avg_quality
  FROM suppliers s
  LEFT JOIN supplier_delivery_history h ON h.supplier_id = s.id
  WHERE s.is_active = true
  GROUP BY s.id, s.code, s.name, s.contact_name, s.phone, s.email, s.lead_time_days, s.score, s.is_active
  ORDER BY s.score DESC, s.name;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- =============================================
-- Trigger: Auto-record delivery when PO is received
-- =============================================
CREATE OR REPLACE FUNCTION trigger_record_po_delivery()
RETURNS TRIGGER AS $$
BEGIN
  -- Only trigger when status changes to 'received'
  IF NEW.status = 'received' AND (OLD.status IS NULL OR OLD.status != 'received') THEN
    -- Record delivery if expected date is set
    IF NEW.expected_delivery_date IS NOT NULL THEN
      PERFORM record_delivery(
        NEW.supplier_id,
        NEW.id,
        NEW.expected_delivery_date,
        COALESCE(NEW.actual_delivery_date, CURRENT_DATE),
        4, -- Default quality rating
        'Auto-recorded from PO receive'
      );
    END IF;
  END IF;
  
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Create trigger
DROP TRIGGER IF EXISTS trg_record_po_delivery ON purchase_orders;
CREATE TRIGGER trg_record_po_delivery
  AFTER UPDATE ON purchase_orders
  FOR EACH ROW
  EXECUTE FUNCTION trigger_record_po_delivery();

-- =============================================
-- Insert sample delivery history for existing suppliers
-- =============================================
DO $$
DECLARE
  v_supplier RECORD;
  v_date DATE;
  v_days_diff INTEGER;
  v_status TEXT;
BEGIN
  -- Only insert if table is empty
  IF NOT EXISTS (SELECT 1 FROM supplier_delivery_history LIMIT 1) THEN
    FOR v_supplier IN SELECT id FROM suppliers WHERE is_active = true LOOP
      -- Insert 10 random delivery records for each supplier
      FOR i IN 1..10 LOOP
        v_date := CURRENT_DATE - (random() * 180)::INTEGER;
        v_days_diff := (random() * 7 - 2)::INTEGER; -- -2 to +5 days
        
        IF v_days_diff < -1 THEN
          v_status := 'early';
        ELSIF v_days_diff <= 1 THEN
          v_status := 'on_time';
        ELSE
          v_status := 'late';
        END IF;
        
        INSERT INTO supplier_delivery_history (
          supplier_id, expected_date, actual_date, days_difference, 
          delivery_status, quality_rating, notes
        ) VALUES (
          v_supplier.id,
          v_date - v_days_diff,
          v_date,
          v_days_diff,
          v_status,
          3 + (random() * 2)::INTEGER, -- 3-5 stars
          'Sample delivery record'
        );
      END LOOP;
    END LOOP;
    
    -- Update all supplier scores
    PERFORM update_all_supplier_scores();
  END IF;
END $$;
