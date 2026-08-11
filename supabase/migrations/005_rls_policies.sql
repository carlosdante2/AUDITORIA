-- Migration 005: Row Level Security policies
-- All tenant isolation enforced here via get_my_tenant_id()
-- NEVER modify these policies without explicit instruction (Constitution II)

-- ================================================================
-- Helper functions (needed before policies can reference them)
-- ================================================================
CREATE OR REPLACE FUNCTION get_my_tenant_id()
RETURNS uuid
LANGUAGE sql STABLE SECURITY DEFINER
SET search_path = ''
AS $$
  SELECT (auth.jwt() -> 'app_metadata' ->> 'tenant_id')::uuid;
$$;

CREATE OR REPLACE FUNCTION get_my_rol()
RETURNS text
LANGUAGE sql STABLE SECURITY DEFINER
SET search_path = ''
AS $$
  SELECT auth.jwt() -> 'app_metadata' ->> 'rol';
$$;

-- Enable RLS on all tenant-scoped tables
ALTER TABLE profiles        ENABLE ROW LEVEL SECURITY;
ALTER TABLE products        ENABLE ROW LEVEL SECURITY;
ALTER TABLE audit_sessions  ENABLE ROW LEVEL SECURITY;
ALTER TABLE product_counts  ENABLE ROW LEVEL SECURITY;
ALTER TABLE receptions      ENABLE ROW LEVEL SECURITY;
ALTER TABLE reception_items ENABLE ROW LEVEL SECURITY;
ALTER TABLE pending_products ENABLE ROW LEVEL SECURITY;

-- ================================================================
-- profiles
-- ================================================================
CREATE POLICY "profiles_select" ON profiles
  FOR SELECT USING (
    id = auth.uid()
    OR (tenant_id = get_my_tenant_id() AND get_my_rol() IN ('supervisor', 'admin'))
  );

CREATE POLICY "profiles_insert" ON profiles
  FOR INSERT WITH CHECK (tenant_id = get_my_tenant_id());

-- ================================================================
-- products
-- ================================================================
CREATE POLICY "products_select" ON products
  FOR SELECT USING (tenant_id = get_my_tenant_id());

CREATE POLICY "products_insert" ON products
  FOR INSERT WITH CHECK (
    tenant_id = get_my_tenant_id()
    AND get_my_rol() = 'admin'
  );

CREATE POLICY "products_update" ON products
  FOR UPDATE USING (
    tenant_id = get_my_tenant_id()
    AND get_my_rol() = 'admin'
  );

-- ================================================================
-- audit_sessions
-- ================================================================
CREATE POLICY "audit_sessions_select" ON audit_sessions
  FOR SELECT USING (tenant_id = get_my_tenant_id());

CREATE POLICY "audit_sessions_insert" ON audit_sessions
  FOR INSERT WITH CHECK (
    tenant_id = get_my_tenant_id()
    AND get_my_rol() IN ('auditor', 'supervisor', 'admin')
  );

CREATE POLICY "audit_sessions_update" ON audit_sessions
  FOR UPDATE USING (
    tenant_id = get_my_tenant_id()
    AND get_my_rol() IN ('supervisor', 'admin')
  );

-- ================================================================
-- product_counts
-- ================================================================
CREATE POLICY "product_counts_select" ON product_counts
  FOR SELECT USING (tenant_id = get_my_tenant_id());

CREATE POLICY "product_counts_insert" ON product_counts
  FOR INSERT WITH CHECK (
    tenant_id = get_my_tenant_id()
    AND get_my_rol() IN ('auditor', 'supervisor', 'admin')
  );

CREATE POLICY "product_counts_update" ON product_counts
  FOR UPDATE USING (
    tenant_id = get_my_tenant_id()
    AND get_my_rol() IN ('supervisor', 'admin')
  );

-- ================================================================
-- receptions
-- ================================================================
CREATE POLICY "receptions_select" ON receptions
  FOR SELECT USING (tenant_id = get_my_tenant_id());

CREATE POLICY "receptions_insert" ON receptions
  FOR INSERT WITH CHECK (
    tenant_id = get_my_tenant_id()
    AND get_my_rol() IN ('auditor', 'supervisor', 'admin')
  );

CREATE POLICY "receptions_update" ON receptions
  FOR UPDATE USING (tenant_id = get_my_tenant_id());

-- ================================================================
-- reception_items
-- ================================================================
CREATE POLICY "reception_items_select" ON reception_items
  FOR SELECT USING (tenant_id = get_my_tenant_id());

CREATE POLICY "reception_items_insert" ON reception_items
  FOR INSERT WITH CHECK (tenant_id = get_my_tenant_id());

CREATE POLICY "reception_items_update" ON reception_items
  FOR UPDATE USING (tenant_id = get_my_tenant_id());

-- ================================================================
-- pending_products
-- ================================================================
CREATE POLICY "pending_products_select" ON pending_products
  FOR SELECT USING (tenant_id = get_my_tenant_id());

CREATE POLICY "pending_products_insert" ON pending_products
  FOR INSERT WITH CHECK (tenant_id = get_my_tenant_id());

-- Only supervisor/admin can approve or reject
CREATE POLICY "pending_products_update" ON pending_products
  FOR UPDATE USING (
    tenant_id = get_my_tenant_id()
    AND get_my_rol() IN ('supervisor', 'admin')
  );
