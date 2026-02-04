-- =====================================================
-- DentalFlow OS - Dentist Dashboard
-- =====================================================
-- SQL Functions สำหรับดึงข้อมูลเฉพาะทันตแพทย์
-- =====================================================

-- -----------------------------------------------------
-- 1. Function: get_dentist_stats
-- ดึงสถิติภาพรวมของทันตแพทย์
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
    'pending_reservation', COUNT(*) FILTER (WHERE NOT EXISTS (
      SELECT 1 FROM reservations r WHERE r.case_id = c.id
    )),
    'ready_cases', COUNT(*) FILTER (WHERE c.traffic_light_status = 'green'),
    'partial_ready_cases', COUNT(*) FILTER (WHERE c.traffic_light_status = 'yellow'),
    'not_ready_cases', COUNT(*) FILTER (WHERE c.traffic_light_status = 'red'),
    'completed_cases', COUNT(*) FILTER (WHERE c.status = 'completed'),
    'today_cases', COUNT(*) FILTER (WHERE c.surgery_date = CURRENT_DATE),
    'tomorrow_cases', COUNT(*) FILTER (WHERE c.surgery_date = CURRENT_DATE + INTERVAL '1 day'),
    'this_week_cases', COUNT(*) FILTER (WHERE c.surgery_date BETWEEN CURRENT_DATE AND CURRENT_DATE + INTERVAL '7 days')
  ) INTO v_result
  FROM cases c
  WHERE c.dentist_id = p_dentist_id
    AND c.surgery_date BETWEEN v_start_date AND v_end_date
    AND c.status != 'cancelled';
  
  RETURN v_result;
END;
$$;

-- -----------------------------------------------------
-- 2. Function: get_new_assigned_cases
-- ดึงเคสใหม่ที่ได้รับมอบหมาย (ยังไม่ได้จองวัสดุ)
-- -----------------------------------------------------
CREATE OR REPLACE FUNCTION get_new_assigned_cases(
  p_dentist_id UUID,
  p_limit INTEGER DEFAULT 10
) RETURNS TABLE (
  case_id UUID,
  patient_name VARCHAR,
  patient_hn VARCHAR,
  surgery_date DATE,
  surgery_time TIME,
  treatment_type VARCHAR,
  tooth_number VARCHAR,
  assigned_at TIMESTAMPTZ,
  days_until_surgery INTEGER,
  has_reservation BOOLEAN
)
LANGUAGE plpgsql
AS $$
BEGIN
  RETURN QUERY
  SELECT 
    c.id AS case_id,
    p.name AS patient_name,
    p.hn AS patient_hn,
    c.surgery_date,
    c.surgery_time,
    c.treatment_type,
    c.tooth_number,
    c.created_at AS assigned_at,
    (c.surgery_date - CURRENT_DATE)::INTEGER AS days_until_surgery,
    EXISTS (SELECT 1 FROM reservations r WHERE r.case_id = c.id) AS has_reservation
  FROM cases c
  JOIN patients p ON c.patient_id = p.id
  WHERE c.dentist_id = p_dentist_id
    AND c.status = 'scheduled'
    AND c.surgery_date >= CURRENT_DATE
    AND NOT EXISTS (SELECT 1 FROM reservations r WHERE r.case_id = c.id)
  ORDER BY c.surgery_date ASC, c.surgery_time ASC
  LIMIT p_limit;
END;
$$;

-- -----------------------------------------------------
-- 3. Function: get_action_required_cases
-- ดึงเคสที่ต้องดำเนินการ
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
  traffic_light_status VARCHAR
)
LANGUAGE plpgsql
AS $$
BEGIN
  RETURN QUERY
  -- เคสที่วัสดุไม่พร้อม (red/yellow)
  SELECT 
    c.id AS case_id,
    p.name AS patient_name,
    c.surgery_date,
    'material_not_ready'::VARCHAR AS action_type,
    CASE 
      WHEN c.traffic_light_status = 'red' THEN 'วัสดุไม่พร้อม - ต้องจองหรือรอของเข้า'
      ELSE 'วัสดุบางส่วนยังไม่พร้อม'
    END AS action_description,
    CASE 
      WHEN c.surgery_date <= CURRENT_DATE + INTERVAL '2 days' THEN 'high'
      WHEN c.surgery_date <= CURRENT_DATE + INTERVAL '7 days' THEN 'medium'
      ELSE 'low'
    END AS priority,
    c.traffic_light_status
  FROM cases c
  JOIN patients p ON c.patient_id = p.id
  WHERE c.dentist_id = p_dentist_id
    AND c.status = 'scheduled'
    AND c.surgery_date >= CURRENT_DATE
    AND c.traffic_light_status IN ('red', 'yellow')
  
  UNION ALL
  
  -- เคสที่มี OOS Request รอดำเนินการ
  SELECT 
    c.id AS case_id,
    p.name AS patient_name,
    c.surgery_date,
    'oos_pending'::VARCHAR AS action_type,
    'มีคำขอวัสดุที่หมดสต็อก รอฝ่ายคลังดำเนินการ'::TEXT AS action_description,
    'medium'::VARCHAR AS priority,
    c.traffic_light_status
  FROM cases c
  JOIN patients p ON c.patient_id = p.id
  JOIN out_of_stock_requests oos ON oos.case_id = c.id
  WHERE c.dentist_id = p_dentist_id
    AND c.status = 'scheduled'
    AND oos.status = 'pending'
  
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
-- 4. Function: get_dentist_cases_calendar
-- ดึงเคสสำหรับแสดงในปฏิทิน
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
    p.name AS patient_name,
    p.hn AS patient_hn,
    c.surgery_date,
    c.surgery_time,
    c.treatment_type,
    c.tooth_number,
    c.status,
    c.traffic_light_status,
    (SELECT COUNT(*)::INTEGER FROM reservations r WHERE r.case_id = c.id) AS reservation_count,
    (SELECT COALESCE(SUM(r.quantity_needed), 0)::INTEGER FROM reservations r WHERE r.case_id = c.id) AS total_items_reserved,
    (SELECT COALESCE(SUM(r.quantity_allocated), 0)::INTEGER FROM reservations r WHERE r.case_id = c.id) AS items_ready
  FROM cases c
  JOIN patients p ON c.patient_id = p.id
  WHERE c.dentist_id = p_dentist_id
    AND c.surgery_date BETWEEN p_start_date AND p_end_date
    AND c.status != 'cancelled'
  ORDER BY c.surgery_date ASC, c.surgery_time ASC;
END;
$$;

-- -----------------------------------------------------
-- 5. Function: get_dentist_cases_by_date
-- ดึงเคสตามวันที่ (สำหรับ Timeline)
-- -----------------------------------------------------
CREATE OR REPLACE FUNCTION get_dentist_cases_by_date(
  p_dentist_id UUID,
  p_date DATE
) RETURNS TABLE (
  case_id UUID,
  patient_name VARCHAR,
  patient_hn VARCHAR,
  patient_phone VARCHAR,
  surgery_time TIME,
  treatment_type VARCHAR,
  tooth_number VARCHAR,
  status VARCHAR,
  traffic_light_status VARCHAR,
  notes TEXT,
  reservations JSONB
)
LANGUAGE plpgsql
AS $$
BEGIN
  RETURN QUERY
  SELECT 
    c.id AS case_id,
    p.name AS patient_name,
    p.hn AS patient_hn,
    p.phone AS patient_phone,
    c.surgery_time,
    c.treatment_type,
    c.tooth_number,
    c.status,
    c.traffic_light_status,
    c.notes,
    (
      SELECT COALESCE(jsonb_agg(jsonb_build_object(
        'id', r.id,
        'product_name', pr.name,
        'product_ref', pr.ref_code,
        'quantity_needed', r.quantity_needed,
        'quantity_allocated', r.quantity_allocated,
        'status', r.status
      )), '[]'::JSONB)
      FROM reservations r
      JOIN products pr ON r.product_id = pr.id
      WHERE r.case_id = c.id
    ) AS reservations
  FROM cases c
  JOIN patients p ON c.patient_id = p.id
  WHERE c.dentist_id = p_dentist_id
    AND c.surgery_date = p_date
    AND c.status != 'cancelled'
  ORDER BY c.surgery_time ASC;
END;
$$;

-- -----------------------------------------------------
-- 6. Function: get_frequently_used_products
-- ดึงวัสดุที่ใช้บ่อยที่สุด
-- -----------------------------------------------------
CREATE OR REPLACE FUNCTION get_frequently_used_products(
  p_dentist_id UUID,
  p_limit INTEGER DEFAULT 5,
  p_months INTEGER DEFAULT 6
) RETURNS TABLE (
  product_id UUID,
  product_name VARCHAR,
  product_ref VARCHAR,
  product_brand VARCHAR,
  category_name VARCHAR,
  usage_count BIGINT,
  total_quantity BIGINT,
  last_used DATE
)
LANGUAGE plpgsql
AS $$
BEGIN
  RETURN QUERY
  SELECT 
    pr.id AS product_id,
    pr.name AS product_name,
    pr.ref_code AS product_ref,
    pr.brand AS product_brand,
    cat.name AS category_name,
    COUNT(DISTINCT r.case_id) AS usage_count,
    SUM(r.quantity_used)::BIGINT AS total_quantity,
    MAX(c.surgery_date) AS last_used
  FROM reservations r
  JOIN cases c ON r.case_id = c.id
  JOIN products pr ON r.product_id = pr.id
  JOIN categories cat ON pr.category_id = cat.id
  WHERE c.dentist_id = p_dentist_id
    AND c.surgery_date >= CURRENT_DATE - (p_months || ' months')::INTERVAL
    AND r.status = 'used'
  GROUP BY pr.id, pr.name, pr.ref_code, pr.brand, cat.name
  ORDER BY usage_count DESC, total_quantity DESC
  LIMIT p_limit;
END;
$$;

-- -----------------------------------------------------
-- 7. Function: get_dentist_performance
-- ดึงสถิติประสิทธิภาพของทันตแพทย์
-- -----------------------------------------------------
CREATE OR REPLACE FUNCTION get_dentist_performance(
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
  -- Default to last 3 months
  v_start_date := COALESCE(p_start_date, CURRENT_DATE - INTERVAL '3 months');
  v_end_date := COALESCE(p_end_date, CURRENT_DATE);
  
  SELECT jsonb_build_object(
    'completed_cases', (
      SELECT COUNT(*) FROM cases 
      WHERE dentist_id = p_dentist_id 
        AND status = 'completed'
        AND surgery_date BETWEEN v_start_date AND v_end_date
    ),
    'total_reservations', (
      SELECT COUNT(*) FROM reservations r
      JOIN cases c ON r.case_id = c.id
      WHERE c.dentist_id = p_dentist_id
        AND c.surgery_date BETWEEN v_start_date AND v_end_date
    ),
    'used_as_reserved', (
      SELECT COUNT(*) FROM reservations r
      JOIN cases c ON r.case_id = c.id
      WHERE c.dentist_id = p_dentist_id
        AND c.surgery_date BETWEEN v_start_date AND v_end_date
        AND r.status = 'used'
        AND r.quantity_used = r.quantity_needed
    ),
    'usage_rate', (
      SELECT ROUND(
        (COUNT(*) FILTER (WHERE r.status = 'used' AND r.quantity_used = r.quantity_needed)::DECIMAL / 
         NULLIF(COUNT(*), 0) * 100), 1
      )
      FROM reservations r
      JOIN cases c ON r.case_id = c.id
      WHERE c.dentist_id = p_dentist_id
        AND c.surgery_date BETWEEN v_start_date AND v_end_date
        AND r.status IN ('used', 'partial_used', 'cancelled')
    ),
    'avg_reservation_lead_time', (
      SELECT ROUND(AVG(c.surgery_date - r.created_at::DATE), 1)
      FROM reservations r
      JOIN cases c ON r.case_id = c.id
      WHERE c.dentist_id = p_dentist_id
        AND c.surgery_date BETWEEN v_start_date AND v_end_date
    ),
    'oos_requests', (
      SELECT COUNT(*) FROM out_of_stock_requests oos
      JOIN cases c ON oos.case_id = c.id
      WHERE c.dentist_id = p_dentist_id
        AND oos.created_at BETWEEN v_start_date AND v_end_date
    )
  ) INTO v_result;
  
  RETURN v_result;
END;
$$;

-- -----------------------------------------------------
-- 8. Function: get_calendar_summary
-- ดึงสรุปปฏิทินตามช่วงเวลา
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
    'total_days', COUNT(DISTINCT surgery_date),
    'green_cases', COUNT(*) FILTER (WHERE traffic_light_status = 'green'),
    'yellow_cases', COUNT(*) FILTER (WHERE traffic_light_status = 'yellow'),
    'red_cases', COUNT(*) FILTER (WHERE traffic_light_status = 'red'),
    'cases_by_date', (
      SELECT jsonb_agg(jsonb_build_object(
        'date', surgery_date,
        'count', case_count,
        'green', green_count,
        'yellow', yellow_count,
        'red', red_count
      ))
      FROM (
        SELECT 
          surgery_date,
          COUNT(*) AS case_count,
          COUNT(*) FILTER (WHERE traffic_light_status = 'green') AS green_count,
          COUNT(*) FILTER (WHERE traffic_light_status = 'yellow') AS yellow_count,
          COUNT(*) FILTER (WHERE traffic_light_status = 'red') AS red_count
        FROM cases
        WHERE dentist_id = p_dentist_id
          AND surgery_date BETWEEN p_start_date AND p_end_date
          AND status != 'cancelled'
        GROUP BY surgery_date
        ORDER BY surgery_date
      ) sub
    ),
    'treatment_types', (
      SELECT jsonb_agg(jsonb_build_object(
        'type', treatment_type,
        'count', type_count
      ))
      FROM (
        SELECT treatment_type, COUNT(*) AS type_count
        FROM cases
        WHERE dentist_id = p_dentist_id
          AND surgery_date BETWEEN p_start_date AND p_end_date
          AND status != 'cancelled'
        GROUP BY treatment_type
        ORDER BY type_count DESC
      ) sub
    )
  ) INTO v_result
  FROM cases
  WHERE dentist_id = p_dentist_id
    AND surgery_date BETWEEN p_start_date AND p_end_date
    AND status != 'cancelled';
  
  RETURN v_result;
END;
$$;

-- -----------------------------------------------------
-- 9. View: dentist_today_cases
-- เคสวันนี้ของทันตแพทย์
-- -----------------------------------------------------
CREATE OR REPLACE VIEW dentist_today_cases AS
SELECT 
  c.id AS case_id,
  c.dentist_id,
  p.name AS patient_name,
  p.hn AS patient_hn,
  c.surgery_time,
  c.treatment_type,
  c.tooth_number,
  c.status,
  c.traffic_light_status,
  (
    SELECT COUNT(*) FROM reservations r WHERE r.case_id = c.id
  ) AS reservation_count
FROM cases c
JOIN patients p ON c.patient_id = p.id
WHERE c.surgery_date = CURRENT_DATE
  AND c.status != 'cancelled'
ORDER BY c.surgery_time ASC;

-- -----------------------------------------------------
-- 10. RLS Policies for Dentist
-- -----------------------------------------------------
-- Dentist can only see their own cases
CREATE POLICY "Dentist can view own cases"
ON cases FOR SELECT
TO authenticated
USING (
  dentist_id = auth.uid() OR
  EXISTS (
    SELECT 1 FROM user_roles ur
    JOIN roles r ON ur.role_id = r.id
    WHERE ur.user_id = auth.uid()
    AND r.name IN ('admin', 'cs', 'inventory')
  )
);

-- =====================================================
-- สรุป Functions ที่สร้าง
-- =====================================================
-- ✅ get_dentist_stats() - สถิติภาพรวม
-- ✅ get_new_assigned_cases() - เคสใหม่ที่ได้รับมอบหมาย
-- ✅ get_action_required_cases() - เคสที่ต้องดำเนินการ
-- ✅ get_dentist_cases_calendar() - เคสสำหรับปฏิทิน
-- ✅ get_dentist_cases_by_date() - เคสตามวันที่ (Timeline)
-- ✅ get_frequently_used_products() - วัสดุที่ใช้บ่อย
-- ✅ get_dentist_performance() - ประสิทธิภาพ
-- ✅ get_calendar_summary() - สรุปปฏิทิน
-- ✅ dentist_today_cases view - เคสวันนี้
