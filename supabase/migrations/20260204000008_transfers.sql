-- =============================================
-- TRANSFERS TABLE
-- สำหรับจัดการการยืม-คืน/แลกเปลี่ยนสินค้ากับ Supplier
-- =============================================

-- Create transfers table
CREATE TABLE IF NOT EXISTS transfers (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  transfer_number TEXT NOT NULL UNIQUE,
  type TEXT NOT NULL CHECK (type IN ('borrow', 'return', 'exchange')),
  supplier_id UUID NOT NULL REFERENCES suppliers(id),
  stock_item_id UUID NOT NULL REFERENCES stock_items(id),
  quantity INTEGER NOT NULL DEFAULT 1 CHECK (quantity > 0),
  status TEXT NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'pending_return', 'in_transit', 'completed')),
  notes TEXT,
  due_date DATE,
  borrowed_at TIMESTAMPTZ,
  returned_at TIMESTAMPTZ,
  created_by UUID REFERENCES profiles(id),
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Create index for faster queries
CREATE INDEX IF NOT EXISTS idx_transfers_supplier_id ON transfers(supplier_id);
CREATE INDEX IF NOT EXISTS idx_transfers_stock_item_id ON transfers(stock_item_id);
CREATE INDEX IF NOT EXISTS idx_transfers_status ON transfers(status);
CREATE INDEX IF NOT EXISTS idx_transfers_type ON transfers(type);
CREATE INDEX IF NOT EXISTS idx_transfers_due_date ON transfers(due_date);

-- Create function to generate transfer number
CREATE OR REPLACE FUNCTION generate_transfer_number()
RETURNS TRIGGER AS $$
DECLARE
  prefix TEXT;
  seq_num INTEGER;
  new_number TEXT;
BEGIN
  -- Set prefix based on type
  CASE NEW.type
    WHEN 'borrow' THEN prefix := 'BOR';
    WHEN 'return' THEN prefix := 'RET';
    WHEN 'exchange' THEN prefix := 'EXC';
    ELSE prefix := 'TRF';
  END CASE;
  
  -- Get next sequence number for today
  SELECT COALESCE(MAX(
    CAST(SUBSTRING(transfer_number FROM 12) AS INTEGER)
  ), 0) + 1
  INTO seq_num
  FROM transfers
  WHERE transfer_number LIKE prefix || '-' || TO_CHAR(NOW(), 'YYYYMMDD') || '-%';
  
  -- Generate transfer number: BOR-20260204-001
  new_number := prefix || '-' || TO_CHAR(NOW(), 'YYYYMMDD') || '-' || LPAD(seq_num::TEXT, 3, '0');
  
  NEW.transfer_number := new_number;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Create trigger for auto-generating transfer number
DROP TRIGGER IF EXISTS trigger_generate_transfer_number ON transfers;
CREATE TRIGGER trigger_generate_transfer_number
  BEFORE INSERT ON transfers
  FOR EACH ROW
  WHEN (NEW.transfer_number IS NULL OR NEW.transfer_number = '')
  EXECUTE FUNCTION generate_transfer_number();

-- Create function to update updated_at
CREATE OR REPLACE FUNCTION update_transfers_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Create trigger for auto-updating updated_at
DROP TRIGGER IF EXISTS trigger_update_transfers_updated_at ON transfers;
CREATE TRIGGER trigger_update_transfers_updated_at
  BEFORE UPDATE ON transfers
  FOR EACH ROW
  EXECUTE FUNCTION update_transfers_updated_at();

-- Enable RLS
ALTER TABLE transfers ENABLE ROW LEVEL SECURITY;

-- RLS Policies
-- Allow authenticated users to view all transfers
CREATE POLICY "Allow authenticated users to view transfers"
  ON transfers FOR SELECT
  TO authenticated
  USING (true);

-- Allow authenticated users to insert transfers
CREATE POLICY "Allow authenticated users to insert transfers"
  ON transfers FOR INSERT
  TO authenticated
  WITH CHECK (true);

-- Allow authenticated users to update transfers
CREATE POLICY "Allow authenticated users to update transfers"
  ON transfers FOR UPDATE
  TO authenticated
  USING (true)
  WITH CHECK (true);

-- Allow authenticated users to delete transfers
CREATE POLICY "Allow authenticated users to delete transfers"
  ON transfers FOR DELETE
  TO authenticated
  USING (true);
