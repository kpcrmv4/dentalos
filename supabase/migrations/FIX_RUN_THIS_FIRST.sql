-- =====================================================
-- FIX: Run this FIRST before running other migrations
-- This script cleans up any existing audit triggers
-- =====================================================

-- Drop all audit triggers
DROP TRIGGER IF EXISTS audit_products ON products;
DROP TRIGGER IF EXISTS audit_stock_items ON stock_items;
DROP TRIGGER IF EXISTS audit_cases ON cases;
DROP TRIGGER IF EXISTS audit_reservations ON reservations;
DROP TRIGGER IF EXISTS audit_purchase_orders ON purchase_orders;

-- Drop the audit function if it exists
DROP FUNCTION IF EXISTS audit_trigger_func();

-- Drop the audit_logs table if it exists (will be recreated properly)
DROP TABLE IF EXISTS audit_logs CASCADE;

-- Confirm cleanup
SELECT 'Cleanup completed successfully. Now run the migrations in order.' as status;
