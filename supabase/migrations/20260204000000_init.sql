-- =====================================================
-- DentalFlow OS - Initial Database Schema
-- Version: 1.0.0
-- Created: 2026-02-04
-- =====================================================

-- Enable UUID extension
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- =====================================================
-- 1. USERS & AUTHENTICATION
-- =====================================================

-- Roles lookup table
CREATE TABLE roles (
  id SERIAL PRIMARY KEY,
  name VARCHAR(50) NOT NULL UNIQUE,
  display_name VARCHAR(100) NOT NULL,
  permissions JSONB DEFAULT '{}',
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Insert default roles
INSERT INTO roles (name, display_name, permissions) VALUES
  ('admin', 'ผู้บริหาร', '{"all": true}'),
  ('dentist', 'ทันตแพทย์', '{"cases": true, "reservations": true}'),
  ('assistant', 'ผู้ช่วยทันตแพทย์', '{"cases": "read", "stock_deduction": true}'),
  ('inventory', 'ฝ่ายคลัง', '{"inventory": true, "procurement": true}'),
  ('cs', 'Customer Service', '{"cases": "read", "calendar": true}');

-- User profiles (extends Supabase auth.users)
CREATE TABLE profiles (
  id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  role_id INTEGER REFERENCES roles(id) DEFAULT 5,
  full_name VARCHAR(255) NOT NULL,
  avatar_url TEXT,
  phone VARCHAR(20),
  is_active BOOLEAN DEFAULT true,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Trigger to create profile on signup
CREATE OR REPLACE FUNCTION handle_new_user()
RETURNS TRIGGER AS $$
BEGIN
  INSERT INTO profiles (id, full_name, role_id)
  VALUES (
    NEW.id,
    COALESCE(NEW.raw_user_meta_data->>'full_name', NEW.email),
    COALESCE((NEW.raw_user_meta_data->>'role_id')::int, 5)
  );
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION handle_new_user();

-- =====================================================
-- 2. INVENTORY MANAGEMENT
-- =====================================================

-- Categories (hierarchical)
CREATE TABLE categories (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name VARCHAR(100) NOT NULL,
  parent_id UUID REFERENCES categories(id),
  sort_order INTEGER DEFAULT 0,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Insert default categories
INSERT INTO categories (name, sort_order) VALUES
  ('Implant', 1),
  ('Abutment', 2),
  ('Bone Graft', 3),
  ('Membrane', 4),
  ('Surgical Kit', 5),
  ('อื่นๆ', 99);

-- Suppliers
CREATE TABLE suppliers (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  code VARCHAR(20) UNIQUE,
  name VARCHAR(255) NOT NULL,
  contact_name VARCHAR(255),
  phone VARCHAR(50),
  email VARCHAR(255),
  address TEXT,
  lead_time_days INTEGER DEFAULT 7,
  payment_terms VARCHAR(100),
  score DECIMAL(3,2) DEFAULT 5.00,
  is_active BOOLEAN DEFAULT true,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Insert sample suppliers
INSERT INTO suppliers (code, name, contact_name, lead_time_days) VALUES
  ('STR', 'Straumann', 'คุณสมศักดิ์', 14),
  ('NB', 'Nobel Biocare', 'คุณวิภา', 14),
  ('OSS', 'Osstem', 'คุณพิชัย', 7),
  ('BIO', 'Bio-Oss', 'คุณมาลี', 10);

-- Products (Master data)
CREATE TABLE products (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  supplier_id UUID REFERENCES suppliers(id),
  category_id UUID REFERENCES categories(id),
  sku VARCHAR(50),
  ref_code VARCHAR(50),
  name VARCHAR(255) NOT NULL,
  brand VARCHAR(100),
  model VARCHAR(100),
  size VARCHAR(50),
  unit VARCHAR(50) DEFAULT 'ชิ้น',
  reorder_point INTEGER DEFAULT 5,
  standard_cost DECIMAL(10,2),
  is_active BOOLEAN DEFAULT true,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Create index for duplicate checking
CREATE INDEX idx_products_search ON products (supplier_id, LOWER(name));

-- Stock Items (Actual inventory with LOT tracking)
CREATE TABLE stock_items (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  product_id UUID NOT NULL REFERENCES products(id),
  lot_number VARCHAR(100) NOT NULL,
  expiry_date DATE,
  quantity INTEGER NOT NULL DEFAULT 0,
  reserved_quantity INTEGER NOT NULL DEFAULT 0,
  cost_price DECIMAL(10,2),
  location VARCHAR(100),
  received_at TIMESTAMPTZ DEFAULT NOW(),
  received_by UUID REFERENCES profiles(id),
  invoice_number VARCHAR(100),
  status VARCHAR(20) DEFAULT 'active',
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),

  CONSTRAINT valid_quantities CHECK (
    quantity >= 0 AND
    reserved_quantity >= 0 AND
    reserved_quantity <= quantity
  )
);

-- Create index for FEFO queries
CREATE INDEX idx_stock_items_fefo ON stock_items (product_id, expiry_date ASC, created_at ASC)
  WHERE status = 'active' AND quantity > reserved_quantity;

-- =====================================================
-- 3. PATIENTS & CASES
-- =====================================================

-- Patients
CREATE TABLE patients (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  hn_number VARCHAR(50) UNIQUE,
  full_name VARCHAR(255) NOT NULL,
  phone VARCHAR(50),
  email VARCHAR(255),
  date_of_birth DATE,
  allergies TEXT,
  notes TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Cases (Appointments/Surgeries)
CREATE TABLE cases (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  case_number VARCHAR(50) UNIQUE,
  patient_id UUID NOT NULL REFERENCES patients(id),
  dentist_id UUID NOT NULL REFERENCES profiles(id),
  assistant_id UUID REFERENCES profiles(id),
  scheduled_date DATE NOT NULL,
  scheduled_time TIME,
  procedure_type VARCHAR(100),
  traffic_light VARCHAR(10) DEFAULT 'red',
  status VARCHAR(20) DEFAULT 'scheduled',
  notes TEXT,
  created_by UUID REFERENCES profiles(id),
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Indexes for calendar queries
CREATE INDEX idx_cases_calendar ON cases (scheduled_date, status);
CREATE INDEX idx_cases_dentist ON cases (dentist_id, scheduled_date);
CREATE INDEX idx_cases_traffic ON cases (traffic_light) WHERE status = 'scheduled';

-- =====================================================
-- 4. RESERVATIONS
-- =====================================================

-- Reservations (Material booking for cases)
CREATE TABLE reservations (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  case_id UUID NOT NULL REFERENCES cases(id) ON DELETE CASCADE,
  stock_item_id UUID NOT NULL REFERENCES stock_items(id),
  quantity INTEGER NOT NULL DEFAULT 1,
  status VARCHAR(20) DEFAULT 'reserved',
  reserved_by UUID NOT NULL REFERENCES profiles(id),
  reserved_at TIMESTAMPTZ DEFAULT NOW(),
  used_at TIMESTAMPTZ,
  used_by UUID REFERENCES profiles(id),
  cancelled_at TIMESTAMPTZ,
  cancelled_by UUID REFERENCES profiles(id),
  cancel_reason TEXT
);

-- Case Materials (Actual usage with photo evidence)
CREATE TABLE case_materials (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  case_id UUID NOT NULL REFERENCES cases(id),
  reservation_id UUID REFERENCES reservations(id),
  product_id UUID NOT NULL REFERENCES products(id),
  lot_number VARCHAR(100) NOT NULL,
  quantity_used INTEGER NOT NULL DEFAULT 1,
  photo_url TEXT NOT NULL,
  notes TEXT,
  used_at TIMESTAMPTZ DEFAULT NOW(),
  used_by UUID NOT NULL REFERENCES profiles(id)
);

-- =====================================================
-- 5. PROCUREMENT
-- =====================================================

-- Purchase Orders
CREATE TABLE purchase_orders (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  po_number VARCHAR(50) UNIQUE NOT NULL,
  supplier_id UUID NOT NULL REFERENCES suppliers(id),
  status VARCHAR(20) DEFAULT 'draft',
  ordered_at TIMESTAMPTZ,
  expected_at DATE,
  received_at TIMESTAMPTZ,
  invoice_number VARCHAR(100),
  total_amount DECIMAL(12,2),
  notes TEXT,
  created_by UUID REFERENCES profiles(id),
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- PO Line Items
CREATE TABLE po_items (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  po_id UUID NOT NULL REFERENCES purchase_orders(id) ON DELETE CASCADE,
  product_id UUID NOT NULL REFERENCES products(id),
  quantity_ordered INTEGER NOT NULL,
  quantity_received INTEGER DEFAULT 0,
  unit_price DECIMAL(10,2),
  status VARCHAR(20) DEFAULT 'pending',
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- =====================================================
-- 6. AUDIT & NOTIFICATIONS
-- =====================================================

-- Audit Logs
CREATE TABLE audit_logs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  table_name VARCHAR(100) NOT NULL,
  record_id UUID NOT NULL,
  action VARCHAR(20) NOT NULL,
  old_values JSONB,
  new_values JSONB,
  user_id UUID REFERENCES profiles(id),
  user_name VARCHAR(255),
  ip_address INET,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX idx_audit_logs_table ON audit_logs (table_name, record_id);
CREATE INDEX idx_audit_logs_user ON audit_logs (user_id, created_at DESC);

-- Notifications
CREATE TABLE notifications (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES profiles(id),
  type VARCHAR(50) NOT NULL,
  title VARCHAR(255) NOT NULL,
  message TEXT,
  data JSONB,
  is_read BOOLEAN DEFAULT false,
  read_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX idx_notifications_user ON notifications (user_id, is_read, created_at DESC);

-- =====================================================
-- 7. FUNCTIONS
-- =====================================================

-- Function: Reserve stock for a case
CREATE OR REPLACE FUNCTION reserve_stock(
  p_case_id UUID,
  p_product_id UUID,
  p_quantity INTEGER,
  p_user_id UUID
) RETURNS UUID AS $$
DECLARE
  v_stock_item_id UUID;
  v_available INTEGER;
  v_reservation_id UUID;
BEGIN
  -- Find best LOT using FEFO
  SELECT id, (quantity - reserved_quantity) INTO v_stock_item_id, v_available
  FROM stock_items
  WHERE product_id = p_product_id
    AND status = 'active'
    AND (quantity - reserved_quantity) >= p_quantity
  ORDER BY expiry_date ASC NULLS LAST, created_at ASC
  FOR UPDATE
  LIMIT 1;

  IF v_stock_item_id IS NULL THEN
    RAISE EXCEPTION 'Insufficient stock for product %', p_product_id;
  END IF;

  -- Update reserved quantity
  UPDATE stock_items
  SET reserved_quantity = reserved_quantity + p_quantity,
      updated_at = NOW()
  WHERE id = v_stock_item_id;

  -- Create reservation record
  INSERT INTO reservations (case_id, stock_item_id, quantity, reserved_by)
  VALUES (p_case_id, v_stock_item_id, p_quantity, p_user_id)
  RETURNING id INTO v_reservation_id;

  -- Update case traffic light
  PERFORM update_case_traffic_light(p_case_id);

  RETURN v_reservation_id;
END;
$$ LANGUAGE plpgsql;

-- Function: Use reserved stock
CREATE OR REPLACE FUNCTION use_reserved_stock(
  p_reservation_id UUID,
  p_photo_url TEXT,
  p_user_id UUID
) RETURNS UUID AS $$
DECLARE
  v_reservation RECORD;
  v_case_material_id UUID;
BEGIN
  SELECT r.*, s.product_id, s.lot_number
  INTO v_reservation
  FROM reservations r
  JOIN stock_items s ON s.id = r.stock_item_id
  WHERE r.id = p_reservation_id
  FOR UPDATE;

  IF v_reservation IS NULL THEN
    RAISE EXCEPTION 'Reservation not found';
  END IF;

  IF v_reservation.status != 'reserved' THEN
    RAISE EXCEPTION 'Reservation is not in reserved status';
  END IF;

  -- Update reservation status
  UPDATE reservations
  SET status = 'used',
      used_at = NOW(),
      used_by = p_user_id
  WHERE id = p_reservation_id;

  -- Deduct physical stock
  UPDATE stock_items
  SET quantity = quantity - v_reservation.quantity,
      reserved_quantity = reserved_quantity - v_reservation.quantity,
      updated_at = NOW()
  WHERE id = v_reservation.stock_item_id;

  -- Create case material record
  INSERT INTO case_materials (
    case_id, reservation_id, product_id, lot_number,
    quantity_used, photo_url, used_by
  )
  VALUES (
    v_reservation.case_id, p_reservation_id, v_reservation.product_id,
    v_reservation.lot_number, v_reservation.quantity, p_photo_url, p_user_id
  )
  RETURNING id INTO v_case_material_id;

  RETURN v_case_material_id;
END;
$$ LANGUAGE plpgsql;

-- Function: Update case traffic light
CREATE OR REPLACE FUNCTION update_case_traffic_light(p_case_id UUID)
RETURNS void AS $$
DECLARE
  v_has_shortage BOOLEAN;
  v_has_intransit BOOLEAN;
  v_traffic_light VARCHAR(10);
BEGIN
  -- Check for shortages
  SELECT EXISTS(
    SELECT 1 FROM reservations r
    JOIN stock_items s ON s.id = r.stock_item_id
    WHERE r.case_id = p_case_id
      AND r.status = 'reserved'
      AND s.quantity < r.quantity
  ) INTO v_has_shortage;

  -- Check for in-transit items
  SELECT EXISTS(
    SELECT 1 FROM reservations r
    JOIN stock_items s ON s.id = r.stock_item_id
    JOIN po_items pi ON pi.product_id = s.product_id
    JOIN purchase_orders po ON po.id = pi.po_id
    WHERE r.case_id = p_case_id
      AND r.status = 'reserved'
      AND po.status = 'sent'
  ) INTO v_has_intransit;

  -- Determine traffic light
  IF v_has_shortage THEN
    v_traffic_light := 'red';
  ELSIF v_has_intransit THEN
    v_traffic_light := 'yellow';
  ELSE
    v_traffic_light := 'green';
  END IF;

  UPDATE cases
  SET traffic_light = v_traffic_light,
      updated_at = NOW()
  WHERE id = p_case_id;
END;
$$ LANGUAGE plpgsql;

-- =====================================================
-- 8. ROW LEVEL SECURITY
-- =====================================================

-- Enable RLS
ALTER TABLE profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE stock_items ENABLE ROW LEVEL SECURITY;
ALTER TABLE cases ENABLE ROW LEVEL SECURITY;
ALTER TABLE reservations ENABLE ROW LEVEL SECURITY;
ALTER TABLE products ENABLE ROW LEVEL SECURITY;
ALTER TABLE suppliers ENABLE ROW LEVEL SECURITY;
ALTER TABLE patients ENABLE ROW LEVEL SECURITY;
ALTER TABLE categories ENABLE ROW LEVEL SECURITY;
ALTER TABLE purchase_orders ENABLE ROW LEVEL SECURITY;
ALTER TABLE po_items ENABLE ROW LEVEL SECURITY;

-- Helper function
CREATE OR REPLACE FUNCTION get_user_role()
RETURNS INTEGER AS $$
  SELECT role_id FROM profiles WHERE id = auth.uid();
$$ LANGUAGE sql SECURITY DEFINER;

-- Profiles policies
CREATE POLICY "Users can view all profiles"
  ON profiles FOR SELECT TO authenticated USING (true);

CREATE POLICY "Users can update own profile"
  ON profiles FOR UPDATE TO authenticated
  USING (id = auth.uid());

-- Universal read policies for authenticated users
CREATE POLICY "Authenticated can read products" ON products FOR SELECT TO authenticated USING (true);
CREATE POLICY "Authenticated can read suppliers" ON suppliers FOR SELECT TO authenticated USING (true);
CREATE POLICY "Authenticated can read categories" ON categories FOR SELECT TO authenticated USING (true);
CREATE POLICY "Authenticated can read stock" ON stock_items FOR SELECT TO authenticated USING (true);
CREATE POLICY "Authenticated can read cases" ON cases FOR SELECT TO authenticated USING (true);
CREATE POLICY "Authenticated can read patients" ON patients FOR SELECT TO authenticated USING (true);
CREATE POLICY "Authenticated can read reservations" ON reservations FOR SELECT TO authenticated USING (true);
CREATE POLICY "Authenticated can read POs" ON purchase_orders FOR SELECT TO authenticated USING (true);
CREATE POLICY "Authenticated can read PO items" ON po_items FOR SELECT TO authenticated USING (true);

-- Admin/Inventory can manage inventory
CREATE POLICY "Admin/Inventory can manage stock" ON stock_items
  FOR ALL TO authenticated
  USING (get_user_role() IN (1, 4))
  WITH CHECK (get_user_role() IN (1, 4));

CREATE POLICY "Admin/Inventory can manage products" ON products
  FOR ALL TO authenticated
  USING (get_user_role() IN (1, 4))
  WITH CHECK (get_user_role() IN (1, 4));

-- Dentist can create reservations
CREATE POLICY "Dentist can create reservations" ON reservations
  FOR INSERT TO authenticated
  WITH CHECK (get_user_role() IN (1, 2));

-- Assistant can update reservations to used
CREATE POLICY "Assistant can use reservations" ON reservations
  FOR UPDATE TO authenticated
  USING (get_user_role() IN (1, 3))
  WITH CHECK (status = 'used');

-- Admin can do everything
CREATE POLICY "Admin full access profiles" ON profiles FOR ALL TO authenticated USING (get_user_role() = 1);
CREATE POLICY "Admin full access cases" ON cases FOR ALL TO authenticated USING (get_user_role() = 1) WITH CHECK (get_user_role() = 1);
CREATE POLICY "Admin full access patients" ON patients FOR ALL TO authenticated USING (get_user_role() = 1) WITH CHECK (get_user_role() = 1);
CREATE POLICY "Admin full access suppliers" ON suppliers FOR ALL TO authenticated USING (get_user_role() = 1) WITH CHECK (get_user_role() = 1);
CREATE POLICY "Admin full access categories" ON categories FOR ALL TO authenticated USING (get_user_role() = 1) WITH CHECK (get_user_role() = 1);
CREATE POLICY "Admin full access POs" ON purchase_orders FOR ALL TO authenticated USING (get_user_role() = 1) WITH CHECK (get_user_role() = 1);
CREATE POLICY "Admin full access PO items" ON po_items FOR ALL TO authenticated USING (get_user_role() = 1) WITH CHECK (get_user_role() = 1);

-- Dentist can create/update cases
CREATE POLICY "Dentist can manage own cases" ON cases
  FOR ALL TO authenticated
  USING (get_user_role() = 2 AND dentist_id = auth.uid())
  WITH CHECK (get_user_role() = 2 AND dentist_id = auth.uid());

-- Inventory can manage procurement
CREATE POLICY "Inventory can manage POs" ON purchase_orders
  FOR ALL TO authenticated
  USING (get_user_role() = 4)
  WITH CHECK (get_user_role() = 4);

CREATE POLICY "Inventory can manage PO items" ON po_items
  FOR ALL TO authenticated
  USING (get_user_role() = 4)
  WITH CHECK (get_user_role() = 4);

-- =====================================================
-- 9. STORAGE BUCKET
-- =====================================================

-- Create storage bucket for photos (run in Supabase dashboard)
-- INSERT INTO storage.buckets (id, name, public) VALUES ('photos', 'photos', false);
