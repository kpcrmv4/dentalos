-- =====================================================
-- DentalFlow OS - Product Attributes & Category Templates
-- Version: 1.2.0
-- Created: 2026-02-04
-- =====================================================

-- =====================================================
-- 1. UPDATE CATEGORIES TABLE
-- =====================================================

-- Add columns for hierarchical categories and settings
ALTER TABLE categories ADD COLUMN IF NOT EXISTS code VARCHAR(20);
ALTER TABLE categories ADD COLUMN IF NOT EXISTS description TEXT;
ALTER TABLE categories ADD COLUMN IF NOT EXISTS has_expiry BOOLEAN DEFAULT true;
ALTER TABLE categories ADD COLUMN IF NOT EXISTS icon VARCHAR(50);

-- Update existing categories
UPDATE categories SET code = 'IMP', has_expiry = true, icon = 'implant' WHERE name = 'Implant';
UPDATE categories SET code = 'ABT', has_expiry = false, icon = 'abutment' WHERE name = 'Abutment';
UPDATE categories SET code = 'BG', has_expiry = true, icon = 'bone' WHERE name = 'Bone Graft';
UPDATE categories SET code = 'MEM', has_expiry = true, icon = 'membrane' WHERE name = 'Membrane';
UPDATE categories SET code = 'KIT', has_expiry = false, icon = 'kit' WHERE name = 'Surgical Kit';

-- Insert subcategories
INSERT INTO categories (name, code, parent_id, has_expiry, sort_order) VALUES
  -- Implant subcategories
  ('Bone Level', 'IMP-BL', (SELECT id FROM categories WHERE code = 'IMP'), true, 1),
  ('Tissue Level', 'IMP-TL', (SELECT id FROM categories WHERE code = 'IMP'), true, 2),
  ('Narrow Diameter', 'IMP-ND', (SELECT id FROM categories WHERE code = 'IMP'), true, 3),
  
  -- Abutment subcategories
  ('Healing Abutment', 'ABT-HA', (SELECT id FROM categories WHERE code = 'ABT'), false, 1),
  ('Temporary Abutment', 'ABT-TA', (SELECT id FROM categories WHERE code = 'ABT'), false, 2),
  ('Final Abutment', 'ABT-FA', (SELECT id FROM categories WHERE code = 'ABT'), false, 3),
  
  -- Bone Graft subcategories
  ('Xenograft', 'BG-XG', (SELECT id FROM categories WHERE code = 'BG'), true, 1),
  ('Allograft', 'BG-AG', (SELECT id FROM categories WHERE code = 'BG'), true, 2),
  ('Synthetic', 'BG-SY', (SELECT id FROM categories WHERE code = 'BG'), true, 3),
  
  -- Membrane subcategories
  ('Resorbable', 'MEM-RS', (SELECT id FROM categories WHERE code = 'MEM'), true, 1),
  ('Non-resorbable', 'MEM-NR', (SELECT id FROM categories WHERE code = 'MEM'), true, 2)
ON CONFLICT DO NOTHING;

-- =====================================================
-- 2. CATEGORY ATTRIBUTE TEMPLATES
-- =====================================================

-- Define what attributes each category should have
CREATE TABLE IF NOT EXISTS category_attribute_templates (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  category_id UUID NOT NULL REFERENCES categories(id) ON DELETE CASCADE,
  attribute_key VARCHAR(50) NOT NULL,
  attribute_label VARCHAR(100) NOT NULL,
  attribute_type VARCHAR(20) NOT NULL DEFAULT 'text', -- 'text', 'number', 'select', 'multi_select'
  options JSONB, -- For select types: ["3.3", "4.1", "4.8"]
  unit VARCHAR(20), -- 'mm', 'g', etc.
  is_required BOOLEAN DEFAULT false,
  is_searchable BOOLEAN DEFAULT true,
  sort_order INTEGER DEFAULT 0,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  
  UNIQUE(category_id, attribute_key)
);

-- =====================================================
-- 3. INSERT ATTRIBUTE TEMPLATES FOR EACH CATEGORY
-- =====================================================

-- Get category IDs
DO $$
DECLARE
  v_implant_id UUID;
  v_implant_bl_id UUID;
  v_abutment_id UUID;
  v_abutment_ha_id UUID;
  v_bone_graft_id UUID;
  v_bone_graft_xg_id UUID;
  v_membrane_id UUID;
  v_membrane_rs_id UUID;
BEGIN
  SELECT id INTO v_implant_id FROM categories WHERE code = 'IMP';
  SELECT id INTO v_implant_bl_id FROM categories WHERE code = 'IMP-BL';
  SELECT id INTO v_abutment_id FROM categories WHERE code = 'ABT';
  SELECT id INTO v_abutment_ha_id FROM categories WHERE code = 'ABT-HA';
  SELECT id INTO v_bone_graft_id FROM categories WHERE code = 'BG';
  SELECT id INTO v_bone_graft_xg_id FROM categories WHERE code = 'BG-XG';
  SELECT id INTO v_membrane_id FROM categories WHERE code = 'MEM';
  SELECT id INTO v_membrane_rs_id FROM categories WHERE code = 'MEM-RS';

  -- Implant attributes (apply to parent, inherited by children)
  INSERT INTO category_attribute_templates (category_id, attribute_key, attribute_label, attribute_type, options, unit, is_required, sort_order) VALUES
    (v_implant_id, 'diameter', 'Diameter (Ø)', 'select', '["3.3", "3.5", "4.1", "4.8", "5.5", "6.5"]', 'mm', true, 1),
    (v_implant_id, 'length', 'Length', 'select', '["6", "8", "10", "12", "14", "16"]', 'mm', true, 2),
    (v_implant_id, 'platform', 'Platform', 'select', '["NC", "RC", "WN", "NP", "RP", "WP"]', NULL, true, 3),
    (v_implant_id, 'surface', 'Surface', 'select', '["SLA", "SLActive", "TiUnite", "OsseoSpeed", "Resorbable Blast Media"]', NULL, false, 4),
    (v_implant_id, 'material', 'Material', 'select', '["Titanium Grade 4", "Roxolid", "Titanium Grade 5"]', NULL, false, 5),
    (v_implant_id, 'connection', 'Connection Type', 'select', '["Internal", "External", "Conical", "Loxim"]', NULL, false, 6),
    (v_implant_id, 'shape', 'Shape', 'select', '["Tapered", "Parallel", "Cylindrical"]', NULL, false, 7)
  ON CONFLICT (category_id, attribute_key) DO NOTHING;

  -- Abutment attributes
  INSERT INTO category_attribute_templates (category_id, attribute_key, attribute_label, attribute_type, options, unit, is_required, sort_order) VALUES
    (v_abutment_id, 'platform', 'Platform', 'select', '["NC", "RC", "WN", "NP", "RP", "WP"]', NULL, true, 1),
    (v_abutment_id, 'height', 'Gingival Height', 'select', '["1", "2", "3", "4", "5", "6", "7"]', 'mm', true, 2),
    (v_abutment_id, 'angle', 'Angle', 'select', '["Straight", "15°", "17°", "25°", "30°"]', NULL, false, 3),
    (v_abutment_id, 'diameter', 'Diameter', 'select', '["3.5", "4.5", "5.5", "6.5", "7.5"]', 'mm', false, 4),
    (v_abutment_id, 'material', 'Material', 'select', '["Titanium", "Zirconia", "PEEK"]', NULL, false, 5)
  ON CONFLICT (category_id, attribute_key) DO NOTHING;

  -- Bone Graft attributes
  INSERT INTO category_attribute_templates (category_id, attribute_key, attribute_label, attribute_type, options, unit, is_required, sort_order) VALUES
    (v_bone_graft_id, 'weight', 'Weight', 'select', '["0.25", "0.5", "1", "2", "4"]', 'g', true, 1),
    (v_bone_graft_id, 'particle_size', 'Particle Size', 'select', '["S (Small)", "M (Medium)", "L (Large)", "Mixed"]', NULL, false, 2),
    (v_bone_graft_id, 'origin', 'Origin', 'select', '["Bovine", "Porcine", "Equine", "Synthetic", "Human"]', NULL, false, 3),
    (v_bone_graft_id, 'form', 'Form', 'select', '["Granules", "Block", "Putty", "Gel"]', NULL, false, 4)
  ON CONFLICT (category_id, attribute_key) DO NOTHING;

  -- Membrane attributes
  INSERT INTO category_attribute_templates (category_id, attribute_key, attribute_label, attribute_type, options, unit, is_required, sort_order) VALUES
    (v_membrane_id, 'width', 'Width', 'select', '["15", "20", "25", "30", "40"]', 'mm', true, 1),
    (v_membrane_id, 'height', 'Height/Length', 'select', '["20", "25", "30", "40", "50"]', 'mm', true, 2),
    (v_membrane_id, 'type', 'Type', 'select', '["Collagen", "PTFE", "d-PTFE", "Titanium Mesh"]', NULL, false, 3),
    (v_membrane_id, 'resorption_time', 'Resorption Time', 'select', '["4-6 weeks", "8-12 weeks", "16-24 weeks", "Non-resorbable"]', NULL, false, 4)
  ON CONFLICT (category_id, attribute_key) DO NOTHING;

END $$;

-- =====================================================
-- 4. PRODUCT ATTRIBUTES TABLE (EAV)
-- =====================================================

CREATE TABLE IF NOT EXISTS product_attributes (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  product_id UUID NOT NULL REFERENCES products(id) ON DELETE CASCADE,
  attribute_key VARCHAR(50) NOT NULL,
  attribute_value VARCHAR(255) NOT NULL,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  
  UNIQUE(product_id, attribute_key)
);

CREATE INDEX IF NOT EXISTS idx_product_attributes_product ON product_attributes(product_id);
CREATE INDEX IF NOT EXISTS idx_product_attributes_key_value ON product_attributes(attribute_key, attribute_value);

-- =====================================================
-- 5. UPDATE PRODUCTS TABLE
-- =====================================================

-- Add display_name for formatted product name
ALTER TABLE products ADD COLUMN IF NOT EXISTS display_name VARCHAR(500);
ALTER TABLE products ADD COLUMN IF NOT EXISTS search_text TEXT; -- For full-text search

-- Function to generate display name from attributes
CREATE OR REPLACE FUNCTION generate_product_display_name(p_product_id UUID)
RETURNS TEXT AS $$
DECLARE
  v_product RECORD;
  v_attrs JSONB;
  v_display_name TEXT;
  v_category_code VARCHAR(20);
BEGIN
  -- Get product info
  SELECT p.*, c.code as category_code, c.name as category_name
  INTO v_product
  FROM products p
  JOIN categories c ON c.id = p.category_id
  WHERE p.id = p_product_id;

  IF v_product IS NULL THEN
    RETURN NULL;
  END IF;

  -- Get attributes as JSON
  SELECT jsonb_object_agg(attribute_key, attribute_value)
  INTO v_attrs
  FROM product_attributes
  WHERE product_id = p_product_id;

  v_category_code := v_product.category_code;

  -- Build display name based on category
  IF v_category_code LIKE 'IMP%' THEN
    -- Implant: Brand Model Ø4.1x10mm RC SLActive
    v_display_name := COALESCE(v_product.brand, '') || ' ' ||
                      COALESCE(v_product.model, v_product.name) || ' ' ||
                      'Ø' || COALESCE(v_attrs->>'diameter', '') || 'x' || 
                      COALESCE(v_attrs->>'length', '') || 'mm ' ||
                      COALESCE(v_attrs->>'platform', '') || ' ' ||
                      COALESCE(v_attrs->>'surface', '');
                      
  ELSIF v_category_code LIKE 'ABT%' THEN
    -- Abutment: Brand Type Platform H3mm 15°
    v_display_name := COALESCE(v_product.brand, '') || ' ' ||
                      COALESCE(v_product.name, '') || ' ' ||
                      COALESCE(v_attrs->>'platform', '') || ' ' ||
                      'H' || COALESCE(v_attrs->>'height', '') || 'mm ' ||
                      COALESCE(v_attrs->>'angle', '');
                      
  ELSIF v_category_code LIKE 'BG%' THEN
    -- Bone Graft: Brand Name 0.5g L
    v_display_name := COALESCE(v_product.brand, '') || ' ' ||
                      COALESCE(v_product.name, '') || ' ' ||
                      COALESCE(v_attrs->>'weight', '') || 'g ' ||
                      COALESCE(v_attrs->>'particle_size', '');
                      
  ELSIF v_category_code LIKE 'MEM%' THEN
    -- Membrane: Brand Name 25x30mm
    v_display_name := COALESCE(v_product.brand, '') || ' ' ||
                      COALESCE(v_product.name, '') || ' ' ||
                      COALESCE(v_attrs->>'width', '') || 'x' ||
                      COALESCE(v_attrs->>'height', '') || 'mm';
  ELSE
    v_display_name := COALESCE(v_product.brand, '') || ' ' || COALESCE(v_product.name, '');
  END IF;

  -- Clean up extra spaces
  v_display_name := TRIM(REGEXP_REPLACE(v_display_name, '\s+', ' ', 'g'));

  RETURN v_display_name;
END;
$$ LANGUAGE plpgsql;

-- Function to update search text
CREATE OR REPLACE FUNCTION update_product_search_text(p_product_id UUID)
RETURNS void AS $$
DECLARE
  v_product RECORD;
  v_attrs TEXT;
  v_search_text TEXT;
BEGIN
  SELECT p.*, s.name as supplier_name, c.name as category_name
  INTO v_product
  FROM products p
  LEFT JOIN suppliers s ON s.id = p.supplier_id
  LEFT JOIN categories c ON c.id = p.category_id
  WHERE p.id = p_product_id;

  -- Concatenate all attribute values
  SELECT string_agg(attribute_value, ' ')
  INTO v_attrs
  FROM product_attributes
  WHERE product_id = p_product_id;

  -- Build search text
  v_search_text := LOWER(
    COALESCE(v_product.name, '') || ' ' ||
    COALESCE(v_product.brand, '') || ' ' ||
    COALESCE(v_product.model, '') || ' ' ||
    COALESCE(v_product.ref_code, '') || ' ' ||
    COALESCE(v_product.sku, '') || ' ' ||
    COALESCE(v_product.supplier_name, '') || ' ' ||
    COALESCE(v_product.category_name, '') || ' ' ||
    COALESCE(v_attrs, '')
  );

  UPDATE products
  SET display_name = generate_product_display_name(p_product_id),
      search_text = v_search_text,
      updated_at = NOW()
  WHERE id = p_product_id;
END;
$$ LANGUAGE plpgsql;

-- Trigger to update search text when attributes change
CREATE OR REPLACE FUNCTION trigger_update_product_search()
RETURNS TRIGGER AS $$
BEGIN
  IF TG_OP = 'DELETE' THEN
    PERFORM update_product_search_text(OLD.product_id);
    RETURN OLD;
  ELSE
    PERFORM update_product_search_text(NEW.product_id);
    RETURN NEW;
  END IF;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trigger_product_attributes_search ON product_attributes;
CREATE TRIGGER trigger_product_attributes_search
  AFTER INSERT OR UPDATE OR DELETE ON product_attributes
  FOR EACH ROW EXECUTE FUNCTION trigger_update_product_search();

-- =====================================================
-- 6. SEARCH FUNCTION
-- =====================================================

-- Function to search products with filters
CREATE OR REPLACE FUNCTION search_products(
  p_search_term TEXT DEFAULT NULL,
  p_category_id UUID DEFAULT NULL,
  p_supplier_id UUID DEFAULT NULL,
  p_attributes JSONB DEFAULT NULL, -- {"diameter": "4.1", "platform": "RC"}
  p_limit INTEGER DEFAULT 50,
  p_offset INTEGER DEFAULT 0
)
RETURNS TABLE (
  product_id UUID,
  display_name TEXT,
  brand VARCHAR(100),
  ref_code VARCHAR(50),
  category_name VARCHAR(100),
  supplier_name VARCHAR(255),
  attributes JSONB,
  available_stock INTEGER
) AS $$
BEGIN
  RETURN QUERY
  WITH product_attrs AS (
    SELECT 
      pa.product_id,
      jsonb_object_agg(pa.attribute_key, pa.attribute_value) as attrs
    FROM product_attributes pa
    GROUP BY pa.product_id
  ),
  stock_summary AS (
    SELECT 
      si.product_id,
      SUM(si.quantity - si.reserved_quantity)::INTEGER as available
    FROM stock_items si
    WHERE si.status = 'active'
    GROUP BY si.product_id
  )
  SELECT 
    p.id,
    COALESCE(p.display_name, p.name)::TEXT,
    p.brand,
    p.ref_code,
    c.name,
    s.name,
    COALESCE(pa.attrs, '{}'::JSONB),
    COALESCE(ss.available, 0)
  FROM products p
  LEFT JOIN categories c ON c.id = p.category_id
  LEFT JOIN suppliers s ON s.id = p.supplier_id
  LEFT JOIN product_attrs pa ON pa.product_id = p.id
  LEFT JOIN stock_summary ss ON ss.product_id = p.id
  WHERE p.is_active = true
    AND (p_search_term IS NULL OR p.search_text ILIKE '%' || LOWER(p_search_term) || '%')
    AND (p_category_id IS NULL OR p.category_id = p_category_id OR 
         p.category_id IN (SELECT id FROM categories WHERE parent_id = p_category_id))
    AND (p_supplier_id IS NULL OR p.supplier_id = p_supplier_id)
    AND (p_attributes IS NULL OR pa.attrs @> p_attributes)
  ORDER BY p.display_name
  LIMIT p_limit
  OFFSET p_offset;
END;
$$ LANGUAGE plpgsql;

-- =====================================================
-- 7. CHECK DUPLICATE FUNCTION
-- =====================================================

-- Function to check for duplicate products
CREATE OR REPLACE FUNCTION check_duplicate_product(
  p_ref_code VARCHAR(50),
  p_supplier_id UUID,
  p_category_id UUID,
  p_attributes JSONB,
  p_exclude_id UUID DEFAULT NULL
)
RETURNS TABLE (
  product_id UUID,
  display_name TEXT,
  ref_code VARCHAR(50),
  match_type VARCHAR(20) -- 'exact_ref', 'similar_attrs'
) AS $$
BEGIN
  RETURN QUERY
  
  -- Check exact REF match
  SELECT 
    p.id,
    COALESCE(p.display_name, p.name)::TEXT,
    p.ref_code,
    'exact_ref'::VARCHAR(20)
  FROM products p
  WHERE p.ref_code = p_ref_code
    AND p.is_active = true
    AND (p_exclude_id IS NULL OR p.id != p_exclude_id)
    
  UNION ALL
  
  -- Check similar attributes match
  SELECT 
    p.id,
    COALESCE(p.display_name, p.name)::TEXT,
    p.ref_code,
    'similar_attrs'::VARCHAR(20)
  FROM products p
  JOIN (
    SELECT product_id, jsonb_object_agg(attribute_key, attribute_value) as attrs
    FROM product_attributes
    GROUP BY product_id
  ) pa ON pa.product_id = p.id
  WHERE p.supplier_id = p_supplier_id
    AND p.category_id = p_category_id
    AND pa.attrs @> p_attributes
    AND p.is_active = true
    AND (p_exclude_id IS NULL OR p.id != p_exclude_id)
    AND p.ref_code != COALESCE(p_ref_code, '');
END;
$$ LANGUAGE plpgsql;

-- =====================================================
-- 8. RLS POLICIES
-- =====================================================

ALTER TABLE category_attribute_templates ENABLE ROW LEVEL SECURITY;
ALTER TABLE product_attributes ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Authenticated can read category templates" ON category_attribute_templates
  FOR SELECT TO authenticated USING (true);

CREATE POLICY "Admin can manage category templates" ON category_attribute_templates
  FOR ALL TO authenticated
  USING (get_user_role() = 1)
  WITH CHECK (get_user_role() = 1);

CREATE POLICY "Authenticated can read product attributes" ON product_attributes
  FOR SELECT TO authenticated USING (true);

CREATE POLICY "Admin/Inventory can manage product attributes" ON product_attributes
  FOR ALL TO authenticated
  USING (get_user_role() IN (1, 4))
  WITH CHECK (get_user_role() IN (1, 4));

-- =====================================================
-- 9. SAMPLE DATA
-- =====================================================

-- Insert sample Straumann products with attributes
DO $$
DECLARE
  v_straumann_id UUID;
  v_implant_bl_id UUID;
  v_product_id UUID;
BEGIN
  SELECT id INTO v_straumann_id FROM suppliers WHERE code = 'STR';
  SELECT id INTO v_implant_bl_id FROM categories WHERE code = 'IMP-BL';

  -- Product 1: Straumann BLT 4.1x8 RC SLActive
  INSERT INTO products (supplier_id, category_id, ref_code, name, brand, model)
  VALUES (v_straumann_id, v_implant_bl_id, '021.5308', 'Bone Level Tapered Implant', 'Straumann', 'BLT')
  ON CONFLICT DO NOTHING
  RETURNING id INTO v_product_id;

  IF v_product_id IS NOT NULL THEN
    INSERT INTO product_attributes (product_id, attribute_key, attribute_value) VALUES
      (v_product_id, 'diameter', '4.1'),
      (v_product_id, 'length', '8'),
      (v_product_id, 'platform', 'RC'),
      (v_product_id, 'surface', 'SLActive'),
      (v_product_id, 'material', 'Roxolid'),
      (v_product_id, 'connection', 'Loxim')
    ON CONFLICT DO NOTHING;
    
    PERFORM update_product_search_text(v_product_id);
  END IF;

  -- Product 2: Straumann BLT 4.1x10 RC SLA
  INSERT INTO products (supplier_id, category_id, ref_code, name, brand, model)
  VALUES (v_straumann_id, v_implant_bl_id, '021.5510', 'Bone Level Tapered Implant', 'Straumann', 'BLT')
  ON CONFLICT DO NOTHING
  RETURNING id INTO v_product_id;

  IF v_product_id IS NOT NULL THEN
    INSERT INTO product_attributes (product_id, attribute_key, attribute_value) VALUES
      (v_product_id, 'diameter', '4.1'),
      (v_product_id, 'length', '10'),
      (v_product_id, 'platform', 'RC'),
      (v_product_id, 'surface', 'SLA'),
      (v_product_id, 'material', 'Roxolid'),
      (v_product_id, 'connection', 'Loxim')
    ON CONFLICT DO NOTHING;
    
    PERFORM update_product_search_text(v_product_id);
  END IF;

END $$;
