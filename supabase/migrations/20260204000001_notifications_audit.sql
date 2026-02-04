-- =============================================
-- Notifications Table - Add missing columns
-- =============================================
-- Note: notifications table already exists in init.sql with user_id column
-- We need to add target_user_id and target_roles columns

-- Add new columns to existing notifications table
ALTER TABLE notifications ADD COLUMN IF NOT EXISTS target_roles TEXT[] DEFAULT NULL;
ALTER TABLE notifications ADD COLUMN IF NOT EXISTS target_user_id UUID REFERENCES profiles(id) ON DELETE CASCADE DEFAULT NULL;

-- Create indexes for new columns
CREATE INDEX IF NOT EXISTS idx_notifications_target_user ON notifications(target_user_id);
CREATE INDEX IF NOT EXISTS idx_notifications_is_read ON notifications(is_read);
CREATE INDEX IF NOT EXISTS idx_notifications_created_at ON notifications(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_notifications_target_roles ON notifications USING GIN(target_roles);

-- Drop existing policies if they exist
DROP POLICY IF EXISTS "Users can read own notifications" ON notifications;
DROP POLICY IF EXISTS "Users can update own notifications" ON notifications;
DROP POLICY IF EXISTS "Users can delete own notifications" ON notifications;
DROP POLICY IF EXISTS "Service can insert notifications" ON notifications;

-- RLS Policies for notifications
ALTER TABLE notifications ENABLE ROW LEVEL SECURITY;

-- Users can read notifications targeted to them or their role
CREATE POLICY "Users can read own notifications" ON notifications
  FOR SELECT
  USING (
    user_id = auth.uid() OR
    target_user_id = auth.uid() OR
    target_roles && ARRAY[(SELECT r.name::TEXT FROM roles r JOIN profiles p ON p.role_id = r.id WHERE p.id = auth.uid())] OR
    (target_user_id IS NULL AND target_roles IS NULL AND user_id IS NULL)
  );

-- Users can update (mark as read) their own notifications
CREATE POLICY "Users can update own notifications" ON notifications
  FOR UPDATE
  USING (
    user_id = auth.uid() OR
    target_user_id = auth.uid() OR
    target_roles && ARRAY[(SELECT r.name::TEXT FROM roles r JOIN profiles p ON p.role_id = r.id WHERE p.id = auth.uid())]
  );

-- Users can delete their own notifications
CREATE POLICY "Users can delete own notifications" ON notifications
  FOR DELETE
  USING (
    user_id = auth.uid() OR
    target_user_id = auth.uid() OR
    target_roles && ARRAY[(SELECT r.name::TEXT FROM roles r JOIN profiles p ON p.role_id = r.id WHERE p.id = auth.uid())]
  );

-- Service role can insert notifications
CREATE POLICY "Service can insert notifications" ON notifications
  FOR INSERT
  WITH CHECK (true);

-- =============================================
-- Audit Trail Table
-- =============================================
CREATE TABLE IF NOT EXISTS audit_logs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  table_name VARCHAR(100) NOT NULL,
  record_id UUID NOT NULL,
  action VARCHAR(20) NOT NULL CHECK (action IN ('INSERT', 'UPDATE', 'DELETE')),
  old_data JSONB DEFAULT NULL,
  new_data JSONB DEFAULT NULL,
  changed_fields TEXT[] DEFAULT NULL,
  user_id UUID REFERENCES profiles(id) ON DELETE SET NULL,
  user_name VARCHAR(255),
  ip_address INET,
  user_agent TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Indexes for audit logs
CREATE INDEX IF NOT EXISTS idx_audit_logs_table_name ON audit_logs(table_name);
CREATE INDEX IF NOT EXISTS idx_audit_logs_record_id ON audit_logs(record_id);
CREATE INDEX IF NOT EXISTS idx_audit_logs_user_id ON audit_logs(user_id);
CREATE INDEX IF NOT EXISTS idx_audit_logs_created_at ON audit_logs(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_audit_logs_action ON audit_logs(action);

-- RLS for audit logs (admin only)
ALTER TABLE audit_logs ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Admins can read audit logs" ON audit_logs;
CREATE POLICY "Admins can read audit logs" ON audit_logs
  FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM profiles p
      JOIN roles r ON p.role_id = r.id
      WHERE p.id = auth.uid() AND r.name = 'admin'
    )
  );

-- =============================================
-- Audit Trigger Function
-- =============================================
CREATE OR REPLACE FUNCTION audit_trigger_func()
RETURNS TRIGGER AS $$
DECLARE
  old_data JSONB;
  new_data JSONB;
  changed_fields TEXT[];
  current_user_id UUID;
  current_user_name VARCHAR(255);
BEGIN
  -- Get current user info
  current_user_id := auth.uid();
  SELECT full_name INTO current_user_name FROM profiles WHERE id = current_user_id;

  IF TG_OP = 'INSERT' THEN
    new_data := to_jsonb(NEW);
    INSERT INTO audit_logs (table_name, record_id, action, new_data, user_id, user_name)
    VALUES (TG_TABLE_NAME, NEW.id, 'INSERT', new_data, current_user_id, current_user_name);
    RETURN NEW;
    
  ELSIF TG_OP = 'UPDATE' THEN
    old_data := to_jsonb(OLD);
    new_data := to_jsonb(NEW);
    
    -- Find changed fields
    SELECT array_agg(key) INTO changed_fields
    FROM jsonb_each(new_data) AS n(key, value)
    WHERE old_data->key IS DISTINCT FROM new_data->key;
    
    INSERT INTO audit_logs (table_name, record_id, action, old_data, new_data, changed_fields, user_id, user_name)
    VALUES (TG_TABLE_NAME, NEW.id, 'UPDATE', old_data, new_data, changed_fields, current_user_id, current_user_name);
    RETURN NEW;
    
  ELSIF TG_OP = 'DELETE' THEN
    old_data := to_jsonb(OLD);
    INSERT INTO audit_logs (table_name, record_id, action, old_data, user_id, user_name)
    VALUES (TG_TABLE_NAME, OLD.id, 'DELETE', old_data, current_user_id, current_user_name);
    RETURN OLD;
  END IF;
  
  RETURN NULL;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- =============================================
-- Apply Audit Triggers to Important Tables
-- =============================================

-- Stock Items
DROP TRIGGER IF EXISTS audit_stock_items ON stock_items;
CREATE TRIGGER audit_stock_items
  AFTER INSERT OR UPDATE OR DELETE ON stock_items
  FOR EACH ROW EXECUTE FUNCTION audit_trigger_func();

-- Reservations
DROP TRIGGER IF EXISTS audit_reservations ON reservations;
CREATE TRIGGER audit_reservations
  AFTER INSERT OR UPDATE OR DELETE ON reservations
  FOR EACH ROW EXECUTE FUNCTION audit_trigger_func();

-- Purchase Orders
DROP TRIGGER IF EXISTS audit_purchase_orders ON purchase_orders;
CREATE TRIGGER audit_purchase_orders
  AFTER INSERT OR UPDATE OR DELETE ON purchase_orders
  FOR EACH ROW EXECUTE FUNCTION audit_trigger_func();

-- Cases
DROP TRIGGER IF EXISTS audit_cases ON cases;
CREATE TRIGGER audit_cases
  AFTER INSERT OR UPDATE OR DELETE ON cases
  FOR EACH ROW EXECUTE FUNCTION audit_trigger_func();

-- Products
DROP TRIGGER IF EXISTS audit_products ON products;
CREATE TRIGGER audit_products
  AFTER INSERT OR UPDATE OR DELETE ON products
  FOR EACH ROW EXECUTE FUNCTION audit_trigger_func();

-- =============================================
-- Stock Receive Table (for tracking stock receives)
-- =============================================
CREATE TABLE IF NOT EXISTS stock_receives (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  invoice_number VARCHAR(100) NOT NULL,
  supplier_id UUID NOT NULL REFERENCES suppliers(id),
  received_date DATE NOT NULL DEFAULT CURRENT_DATE,
  total_amount DECIMAL(12, 2) DEFAULT 0,
  notes TEXT,
  received_by UUID REFERENCES profiles(id),
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS stock_receive_items (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  stock_receive_id UUID NOT NULL REFERENCES stock_receives(id) ON DELETE CASCADE,
  product_id UUID NOT NULL REFERENCES products(id),
  quantity INTEGER NOT NULL DEFAULT 1,
  unit_cost DECIMAL(10, 2) NOT NULL DEFAULT 0,
  lot_number VARCHAR(100),
  expiry_date DATE,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Indexes
CREATE INDEX IF NOT EXISTS idx_stock_receives_invoice ON stock_receives(invoice_number);
CREATE INDEX IF NOT EXISTS idx_stock_receives_supplier ON stock_receives(supplier_id);
CREATE INDEX IF NOT EXISTS idx_stock_receives_date ON stock_receives(received_date DESC);
CREATE INDEX IF NOT EXISTS idx_stock_receive_items_receive ON stock_receive_items(stock_receive_id);

-- RLS
ALTER TABLE stock_receives ENABLE ROW LEVEL SECURITY;
ALTER TABLE stock_receive_items ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Authenticated users can read stock receives" ON stock_receives;
CREATE POLICY "Authenticated users can read stock receives" ON stock_receives
  FOR SELECT USING (auth.uid() IS NOT NULL);

DROP POLICY IF EXISTS "Inventory and admin can insert stock receives" ON stock_receives;
CREATE POLICY "Inventory and admin can insert stock receives" ON stock_receives
  FOR INSERT WITH CHECK (
    EXISTS (
      SELECT 1 FROM profiles p
      JOIN roles r ON p.role_id = r.id
      WHERE p.id = auth.uid() AND r.name IN ('inventory', 'admin')
    )
  );

DROP POLICY IF EXISTS "Authenticated users can read stock receive items" ON stock_receive_items;
CREATE POLICY "Authenticated users can read stock receive items" ON stock_receive_items
  FOR SELECT USING (auth.uid() IS NOT NULL);

DROP POLICY IF EXISTS "Inventory and admin can insert stock receive items" ON stock_receive_items;
CREATE POLICY "Inventory and admin can insert stock receive items" ON stock_receive_items
  FOR INSERT WITH CHECK (
    EXISTS (
      SELECT 1 FROM profiles p
      JOIN roles r ON p.role_id = r.id
      WHERE p.id = auth.uid() AND r.name IN ('inventory', 'admin')
    )
  );

-- =============================================
-- Add last_movement_at to stock_items
-- =============================================
ALTER TABLE stock_items ADD COLUMN IF NOT EXISTS last_movement_at TIMESTAMPTZ;

-- Update last_movement_at when reservation status changes to 'used'
CREATE OR REPLACE FUNCTION update_stock_last_movement()
RETURNS TRIGGER AS $$
BEGIN
  IF NEW.status = 'used' AND (OLD.status IS NULL OR OLD.status != 'used') THEN
    UPDATE stock_items SET last_movement_at = NOW() WHERE id = NEW.stock_item_id;
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trigger_update_stock_last_movement ON reservations;
CREATE TRIGGER trigger_update_stock_last_movement
  AFTER UPDATE ON reservations
  FOR EACH ROW EXECUTE FUNCTION update_stock_last_movement();

-- =============================================
-- Add photo_evidence to cases
-- =============================================
ALTER TABLE cases ADD COLUMN IF NOT EXISTS photo_evidence TEXT;
ALTER TABLE cases ADD COLUMN IF NOT EXISTS completed_at TIMESTAMPTZ;

-- =============================================
-- Add ref_code to products
-- =============================================
ALTER TABLE products ADD COLUMN IF NOT EXISTS ref_code VARCHAR(100);
CREATE INDEX IF NOT EXISTS idx_products_ref_code ON products(ref_code);

-- =============================================
-- Notification Helper Functions
-- =============================================

-- Function to create notification for low stock
CREATE OR REPLACE FUNCTION notify_low_stock()
RETURNS TRIGGER AS $$
DECLARE
  product_name VARCHAR(255);
  reorder_point INTEGER;
BEGIN
  IF NEW.quantity <= (SELECT p.reorder_point FROM products p WHERE p.id = NEW.product_id) THEN
    SELECT name, reorder_point INTO product_name, reorder_point
    FROM products WHERE id = NEW.product_id;
    
    INSERT INTO notifications (type, title, message, data, target_roles)
    VALUES (
      'stock_low',
      'สินค้าใกล้หมด',
      product_name || ' เหลือ ' || NEW.quantity || ' ชิ้น (ต่ำกว่าจุดสั่งซื้อ ' || reorder_point || ')',
      jsonb_build_object('product_id', NEW.product_id, 'product_name', product_name, 'quantity', NEW.quantity),
      ARRAY['inventory', 'admin']
    );
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trigger_notify_low_stock ON stock_items;
CREATE TRIGGER trigger_notify_low_stock
  AFTER UPDATE OF quantity ON stock_items
  FOR EACH ROW
  WHEN (NEW.quantity < OLD.quantity)
  EXECUTE FUNCTION notify_low_stock();

-- Function to notify dentist when case is assigned
CREATE OR REPLACE FUNCTION notify_case_assigned()
RETURNS TRIGGER AS $$
DECLARE
  patient_name VARCHAR(255);
  case_date DATE;
BEGIN
  IF NEW.dentist_id IS NOT NULL AND (OLD.dentist_id IS NULL OR OLD.dentist_id != NEW.dentist_id) THEN
    SELECT full_name INTO patient_name FROM patients WHERE id = NEW.patient_id;
    
    INSERT INTO notifications (type, title, message, data, target_user_id)
    VALUES (
      'case_assigned',
      'มอบหมายเคสใหม่',
      'คุณได้รับมอบหมายเคส ' || NEW.case_number || ' (' || patient_name || ') กำหนดวันที่ ' || 
        to_char(NEW.scheduled_date, 'DD Mon YYYY'),
      jsonb_build_object('case_id', NEW.id, 'case_number', NEW.case_number, 'patient_name', patient_name),
      NEW.dentist_id
    );
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trigger_notify_case_assigned ON cases;
CREATE TRIGGER trigger_notify_case_assigned
  AFTER UPDATE OF dentist_id ON cases
  FOR EACH ROW EXECUTE FUNCTION notify_case_assigned();

-- Also trigger on insert if dentist is assigned
CREATE OR REPLACE FUNCTION notify_case_assigned_on_insert()
RETURNS TRIGGER AS $$
DECLARE
  patient_name VARCHAR(255);
BEGIN
  IF NEW.dentist_id IS NOT NULL THEN
    SELECT full_name INTO patient_name FROM patients WHERE id = NEW.patient_id;
    
    INSERT INTO notifications (type, title, message, data, target_user_id)
    VALUES (
      'case_assigned',
      'มอบหมายเคสใหม่',
      'คุณได้รับมอบหมายเคส ' || NEW.case_number || ' (' || patient_name || ') กำหนดวันที่ ' || 
        to_char(NEW.scheduled_date, 'DD Mon YYYY'),
      jsonb_build_object('case_id', NEW.id, 'case_number', NEW.case_number, 'patient_name', patient_name),
      NEW.dentist_id
    );
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trigger_notify_case_assigned_insert ON cases;
CREATE TRIGGER trigger_notify_case_assigned_insert
  AFTER INSERT ON cases
  FOR EACH ROW EXECUTE FUNCTION notify_case_assigned_on_insert();
