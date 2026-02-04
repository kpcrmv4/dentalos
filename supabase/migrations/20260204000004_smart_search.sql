-- =====================================================
-- DentalFlow OS - Smart Product Search Functions
-- =====================================================
-- ฟังก์ชันสำหรับค้นหาสินค้าแบบ Smart Search
-- พร้อมแนะนำวัสดุคล้ายกันโดยเรียงตาม FEFO
-- =====================================================

-- -----------------------------------------------------
-- Function: search_products_with_stock
-- ค้นหาสินค้าพร้อมข้อมูลสต็อกและวันหมดอายุ
-- เรียงลำดับตาม FEFO (First Expiry First Out)
-- -----------------------------------------------------
CREATE OR REPLACE FUNCTION search_products_with_stock(
  p_search_term TEXT DEFAULT NULL,
  p_category_id UUID DEFAULT NULL,
  p_supplier_id UUID DEFAULT NULL,
  p_limit INT DEFAULT 20
)
RETURNS TABLE (
  id UUID,
  name VARCHAR,
  display_name VARCHAR,
  brand VARCHAR,
  ref_code VARCHAR,
  category_id UUID,
  category_name VARCHAR,
  supplier_name VARCHAR,
  attributes JSONB,
  stock_items JSONB,
  total_available INT,
  earliest_expiry DATE,
  days_until_expiry INT
)
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
  RETURN QUERY
  WITH product_stock AS (
    SELECT 
      p.id AS product_id,
      COALESCE(
        jsonb_agg(
          jsonb_build_object(
            'id', si.id,
            'product_id', si.product_id,
            'lot_number', si.lot_number,
            'expiry_date', si.expiry_date,
            'quantity', si.quantity,
            'reserved_quantity', si.reserved_quantity,
            'available', si.quantity - si.reserved_quantity
          ) ORDER BY si.expiry_date ASC NULLS LAST
        ) FILTER (WHERE si.id IS NOT NULL AND si.quantity > 0 AND si.status = 'active'),
        '[]'::jsonb
      ) AS stock_items,
      COALESCE(SUM(si.quantity - si.reserved_quantity) FILTER (WHERE si.status = 'active'), 0)::INT AS total_avail,
      MIN(si.expiry_date) FILTER (WHERE si.status = 'active' AND si.quantity > 0) AS min_expiry
    FROM products p
    LEFT JOIN stock_items si ON si.product_id = p.id
    WHERE p.is_active = true
    GROUP BY p.id
  ),
  product_attrs AS (
    SELECT 
      pa.product_id,
      jsonb_object_agg(pa.attribute_key, pa.attribute_value) AS attrs
    FROM product_attributes pa
    GROUP BY pa.product_id
  )
  SELECT 
    p.id,
    p.name,
    p.display_name,
    p.brand,
    p.ref_code,
    p.category_id,
    c.name AS category_name,
    s.name AS supplier_name,
    COALESCE(pa.attrs, '{}'::jsonb) AS attributes,
    ps.stock_items,
    ps.total_avail AS total_available,
    ps.min_expiry AS earliest_expiry,
    CASE 
      WHEN ps.min_expiry IS NOT NULL THEN 
        (ps.min_expiry - CURRENT_DATE)::INT
      ELSE NULL
    END AS days_until_expiry
  FROM products p
  LEFT JOIN categories c ON c.id = p.category_id
  LEFT JOIN suppliers s ON s.id = p.supplier_id
  LEFT JOIN product_stock ps ON ps.product_id = p.id
  LEFT JOIN product_attrs pa ON pa.product_id = p.id
  WHERE p.is_active = true
    AND (p_category_id IS NULL OR p.category_id = p_category_id)
    AND (p_supplier_id IS NULL OR p.supplier_id = p_supplier_id)
    AND (
      p_search_term IS NULL 
      OR p_search_term = ''
      OR p.name ILIKE '%' || p_search_term || '%'
      OR p.display_name ILIKE '%' || p_search_term || '%'
      OR p.ref_code ILIKE '%' || p_search_term || '%'
      OR p.brand ILIKE '%' || p_search_term || '%'
      OR p.sku ILIKE '%' || p_search_term || '%'
      OR c.name ILIKE '%' || p_search_term || '%'
      OR s.name ILIKE '%' || p_search_term || '%'
      -- Search in attributes
      OR EXISTS (
        SELECT 1 FROM product_attributes pa2 
        WHERE pa2.product_id = p.id 
        AND pa2.attribute_value ILIKE '%' || p_search_term || '%'
      )
    )
  ORDER BY 
    -- Prioritize items with stock
    CASE WHEN ps.total_avail > 0 THEN 0 ELSE 1 END,
    -- Then by expiry date (FEFO)
    ps.min_expiry ASC NULLS LAST,
    -- Then by name
    p.name ASC
  LIMIT p_limit;
END;
$$;

-- -----------------------------------------------------
-- Function: find_similar_products
-- ค้นหาสินค้าที่คล้ายกันโดยพิจารณาจาก:
-- 1. หมวดหมู่เดียวกัน
-- 2. Attributes ที่คล้ายกัน (เช่น Platform เดียวกัน)
-- 3. Brand เดียวกัน
-- เรียงตามวันหมดอายุ (ใกล้หมดอายุก่อน)
-- -----------------------------------------------------
CREATE OR REPLACE FUNCTION find_similar_products(
  p_product_id UUID,
  p_limit INT DEFAULT 5
)
RETURNS TABLE (
  id UUID,
  name VARCHAR,
  display_name VARCHAR,
  brand VARCHAR,
  ref_code VARCHAR,
  category_id UUID,
  category_name VARCHAR,
  supplier_name VARCHAR,
  attributes JSONB,
  stock_items JSONB,
  total_available INT,
  earliest_expiry DATE,
  days_until_expiry INT,
  similarity_score NUMERIC,
  similarity_reason TEXT
)
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  v_source_category_id UUID;
  v_source_brand VARCHAR;
  v_source_attrs JSONB;
BEGIN
  -- Get source product info
  SELECT 
    p.category_id, 
    p.brand,
    COALESCE(
      (SELECT jsonb_object_agg(pa.attribute_key, pa.attribute_value) 
       FROM product_attributes pa WHERE pa.product_id = p.id),
      '{}'::jsonb
    )
  INTO v_source_category_id, v_source_brand, v_source_attrs
  FROM products p
  WHERE p.id = p_product_id;

  IF v_source_category_id IS NULL THEN
    RETURN;
  END IF;

  RETURN QUERY
  WITH product_stock AS (
    SELECT 
      p.id AS product_id,
      COALESCE(
        jsonb_agg(
          jsonb_build_object(
            'id', si.id,
            'product_id', si.product_id,
            'lot_number', si.lot_number,
            'expiry_date', si.expiry_date,
            'quantity', si.quantity,
            'reserved_quantity', si.reserved_quantity,
            'available', si.quantity - si.reserved_quantity
          ) ORDER BY si.expiry_date ASC NULLS LAST
        ) FILTER (WHERE si.id IS NOT NULL AND si.quantity > 0 AND si.status = 'active'),
        '[]'::jsonb
      ) AS stock_items,
      COALESCE(SUM(si.quantity - si.reserved_quantity) FILTER (WHERE si.status = 'active'), 0)::INT AS total_avail,
      MIN(si.expiry_date) FILTER (WHERE si.status = 'active' AND si.quantity > 0) AS min_expiry
    FROM products p
    LEFT JOIN stock_items si ON si.product_id = p.id
    WHERE p.is_active = true
    GROUP BY p.id
  ),
  product_attrs AS (
    SELECT 
      pa.product_id,
      jsonb_object_agg(pa.attribute_key, pa.attribute_value) AS attrs
    FROM product_attributes pa
    GROUP BY pa.product_id
  ),
  similarity_calc AS (
    SELECT 
      p.id,
      p.name,
      p.display_name,
      p.brand,
      p.ref_code,
      p.category_id,
      c.name AS category_name,
      s.name AS supplier_name,
      COALESCE(pa.attrs, '{}'::jsonb) AS attributes,
      ps.stock_items,
      ps.total_avail AS total_available,
      ps.min_expiry AS earliest_expiry,
      -- Calculate similarity score
      (
        -- Same category: +0.4
        CASE WHEN p.category_id = v_source_category_id THEN 0.4 ELSE 0 END +
        -- Same brand: +0.2
        CASE WHEN p.brand = v_source_brand THEN 0.2 ELSE 0 END +
        -- Same platform (for implants): +0.2
        CASE WHEN pa.attrs->>'platform' = v_source_attrs->>'platform' 
             AND pa.attrs->>'platform' IS NOT NULL THEN 0.2 ELSE 0 END +
        -- Same diameter: +0.1
        CASE WHEN pa.attrs->>'diameter' = v_source_attrs->>'diameter' 
             AND pa.attrs->>'diameter' IS NOT NULL THEN 0.1 ELSE 0 END +
        -- Has stock bonus: +0.1
        CASE WHEN ps.total_avail > 0 THEN 0.1 ELSE 0 END
      ) AS sim_score,
      -- Build similarity reason
      ARRAY_REMOVE(ARRAY[
        CASE WHEN p.category_id = v_source_category_id THEN 'หมวดหมู่เดียวกัน' END,
        CASE WHEN p.brand = v_source_brand THEN 'แบรนด์เดียวกัน' END,
        CASE WHEN pa.attrs->>'platform' = v_source_attrs->>'platform' 
             AND pa.attrs->>'platform' IS NOT NULL THEN 'Platform เดียวกัน' END,
        CASE WHEN pa.attrs->>'diameter' = v_source_attrs->>'diameter' 
             AND pa.attrs->>'diameter' IS NOT NULL THEN 'ขนาดเดียวกัน' END
      ], NULL) AS reasons
    FROM products p
    LEFT JOIN categories c ON c.id = p.category_id
    LEFT JOIN suppliers s ON s.id = p.supplier_id
    LEFT JOIN product_stock ps ON ps.product_id = p.id
    LEFT JOIN product_attrs pa ON pa.product_id = p.id
    WHERE p.is_active = true
      AND p.id != p_product_id
      AND p.category_id = v_source_category_id
      AND ps.total_avail > 0  -- Only show items with stock
  )
  SELECT 
    sc.id,
    sc.name,
    sc.display_name,
    sc.brand,
    sc.ref_code,
    sc.category_id,
    sc.category_name,
    sc.supplier_name,
    sc.attributes,
    sc.stock_items,
    sc.total_available,
    sc.earliest_expiry,
    CASE 
      WHEN sc.earliest_expiry IS NOT NULL THEN 
        (sc.earliest_expiry - CURRENT_DATE)::INT
      ELSE NULL
    END AS days_until_expiry,
    sc.sim_score AS similarity_score,
    array_to_string(sc.reasons, ', ') AS similarity_reason
  FROM similarity_calc sc
  WHERE sc.sim_score > 0
  ORDER BY 
    -- Prioritize by expiry date (FEFO) - items expiring soon first
    sc.earliest_expiry ASC NULLS LAST,
    -- Then by similarity score
    sc.sim_score DESC,
    -- Then by name
    sc.name ASC
  LIMIT p_limit;
END;
$$;

-- -----------------------------------------------------
-- Function: get_fefo_stock_recommendation
-- แนะนำสต็อกที่ควรใช้ก่อนตาม FEFO
-- สำหรับสินค้าที่ระบุ
-- -----------------------------------------------------
CREATE OR REPLACE FUNCTION get_fefo_stock_recommendation(
  p_product_id UUID,
  p_quantity_needed INT DEFAULT 1
)
RETURNS TABLE (
  stock_id UUID,
  lot_number VARCHAR,
  expiry_date DATE,
  available INT,
  recommended_qty INT,
  days_until_expiry INT,
  urgency_level TEXT
)
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  v_remaining INT := p_quantity_needed;
BEGIN
  RETURN QUERY
  WITH stock_ordered AS (
    SELECT 
      si.id,
      si.lot_number,
      si.expiry_date,
      (si.quantity - si.reserved_quantity) AS avail,
      ROW_NUMBER() OVER (ORDER BY si.expiry_date ASC NULLS LAST) AS rn
    FROM stock_items si
    WHERE si.product_id = p_product_id
      AND si.status = 'active'
      AND si.quantity > si.reserved_quantity
    ORDER BY si.expiry_date ASC NULLS LAST
  ),
  recommendations AS (
    SELECT 
      so.id AS stock_id,
      so.lot_number,
      so.expiry_date,
      so.avail AS available,
      LEAST(so.avail, GREATEST(0, p_quantity_needed - COALESCE(
        (SELECT SUM(so2.avail) FROM stock_ordered so2 WHERE so2.rn < so.rn), 0
      )::INT))::INT AS recommended_qty,
      CASE 
        WHEN so.expiry_date IS NOT NULL THEN (so.expiry_date - CURRENT_DATE)::INT
        ELSE NULL
      END AS days_until_expiry
    FROM stock_ordered so
  )
  SELECT 
    r.stock_id,
    r.lot_number,
    r.expiry_date,
    r.available,
    r.recommended_qty,
    r.days_until_expiry,
    CASE 
      WHEN r.days_until_expiry IS NULL THEN 'normal'
      WHEN r.days_until_expiry <= 30 THEN 'critical'
      WHEN r.days_until_expiry <= 90 THEN 'warning'
      ELSE 'normal'
    END AS urgency_level
  FROM recommendations r
  WHERE r.recommended_qty > 0
  ORDER BY r.expiry_date ASC NULLS LAST;
END;
$$;

-- -----------------------------------------------------
-- Function: search_products_autocomplete
-- ค้นหาสินค้าแบบ Autocomplete สำหรับ dropdown
-- รองรับการพิมพ์บางส่วน เช่น "4.1" หรือ "RC"
-- -----------------------------------------------------
CREATE OR REPLACE FUNCTION search_products_autocomplete(
  p_search_term TEXT,
  p_category_id UUID DEFAULT NULL,
  p_limit INT DEFAULT 10
)
RETURNS TABLE (
  id UUID,
  display_text TEXT,
  ref_code VARCHAR,
  brand VARCHAR,
  category_name VARCHAR,
  total_available INT,
  earliest_expiry DATE,
  match_type TEXT
)
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
  RETURN QUERY
  WITH product_stock AS (
    SELECT 
      p.id AS product_id,
      COALESCE(SUM(si.quantity - si.reserved_quantity) FILTER (WHERE si.status = 'active'), 0)::INT AS total_avail,
      MIN(si.expiry_date) FILTER (WHERE si.status = 'active' AND si.quantity > 0) AS min_expiry
    FROM products p
    LEFT JOIN stock_items si ON si.product_id = p.id
    WHERE p.is_active = true
    GROUP BY p.id
  ),
  matches AS (
    SELECT 
      p.id,
      COALESCE(p.display_name, p.name) AS display_text,
      p.ref_code,
      p.brand,
      c.name AS category_name,
      ps.total_avail,
      ps.min_expiry,
      CASE 
        WHEN p.ref_code ILIKE p_search_term || '%' THEN 'ref_exact'
        WHEN p.ref_code ILIKE '%' || p_search_term || '%' THEN 'ref_partial'
        WHEN p.display_name ILIKE p_search_term || '%' THEN 'name_exact'
        WHEN p.display_name ILIKE '%' || p_search_term || '%' THEN 'name_partial'
        WHEN p.name ILIKE '%' || p_search_term || '%' THEN 'name_partial'
        WHEN p.brand ILIKE '%' || p_search_term || '%' THEN 'brand'
        WHEN EXISTS (
          SELECT 1 FROM product_attributes pa 
          WHERE pa.product_id = p.id 
          AND pa.attribute_value ILIKE '%' || p_search_term || '%'
        ) THEN 'attribute'
        ELSE 'other'
      END AS match_type,
      CASE 
        WHEN p.ref_code ILIKE p_search_term || '%' THEN 1
        WHEN p.ref_code ILIKE '%' || p_search_term || '%' THEN 2
        WHEN p.display_name ILIKE p_search_term || '%' THEN 3
        WHEN p.display_name ILIKE '%' || p_search_term || '%' THEN 4
        WHEN p.name ILIKE '%' || p_search_term || '%' THEN 5
        WHEN p.brand ILIKE '%' || p_search_term || '%' THEN 6
        ELSE 7
      END AS match_rank
    FROM products p
    LEFT JOIN categories c ON c.id = p.category_id
    LEFT JOIN product_stock ps ON ps.product_id = p.id
    WHERE p.is_active = true
      AND (p_category_id IS NULL OR p.category_id = p_category_id)
      AND (
        p.name ILIKE '%' || p_search_term || '%'
        OR p.display_name ILIKE '%' || p_search_term || '%'
        OR p.ref_code ILIKE '%' || p_search_term || '%'
        OR p.brand ILIKE '%' || p_search_term || '%'
        OR p.sku ILIKE '%' || p_search_term || '%'
        OR EXISTS (
          SELECT 1 FROM product_attributes pa 
          WHERE pa.product_id = p.id 
          AND pa.attribute_value ILIKE '%' || p_search_term || '%'
        )
      )
  )
  SELECT 
    m.id,
    m.display_text,
    m.ref_code,
    m.brand,
    m.category_name,
    m.total_avail AS total_available,
    m.min_expiry AS earliest_expiry,
    m.match_type
  FROM matches m
  ORDER BY 
    m.match_rank ASC,
    CASE WHEN m.total_avail > 0 THEN 0 ELSE 1 END,
    m.min_expiry ASC NULLS LAST,
    m.display_text ASC
  LIMIT p_limit;
END;
$$;

-- -----------------------------------------------------
-- Grant permissions
-- -----------------------------------------------------
GRANT EXECUTE ON FUNCTION search_products_with_stock TO authenticated;
GRANT EXECUTE ON FUNCTION find_similar_products TO authenticated;
GRANT EXECUTE ON FUNCTION get_fefo_stock_recommendation TO authenticated;
GRANT EXECUTE ON FUNCTION search_products_autocomplete TO authenticated;

-- -----------------------------------------------------
-- Comments
-- -----------------------------------------------------
COMMENT ON FUNCTION search_products_with_stock IS 
'ค้นหาสินค้าพร้อมข้อมูลสต็อก เรียงตาม FEFO (First Expiry First Out)';

COMMENT ON FUNCTION find_similar_products IS 
'ค้นหาสินค้าที่คล้ายกัน พิจารณาจากหมวดหมู่, Platform, Brand เรียงตามวันหมดอายุ';

COMMENT ON FUNCTION get_fefo_stock_recommendation IS 
'แนะนำสต็อกที่ควรใช้ก่อนตาม FEFO พร้อมระบุระดับความเร่งด่วน';

COMMENT ON FUNCTION search_products_autocomplete IS 
'ค้นหาสินค้าแบบ Autocomplete รองรับการพิมพ์บางส่วน';
