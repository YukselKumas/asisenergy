-- ── Migration 007: Schema Additions ─────────────────────────────────────
-- projects eksik kolonları, brands tablosu, price_lists genişlemesi,
-- system_configs ve modüler mimari için module_type alanı.

-- 1. projects: eksik kolonlar
ALTER TABLE projects
  ADD COLUMN IF NOT EXISTS building_name      TEXT,
  ADD COLUMN IF NOT EXISTS parent_project_id  UUID REFERENCES projects(id),
  ADD COLUMN IF NOT EXISTS revisions          JSONB NOT NULL DEFAULT '[]',
  ADD COLUMN IF NOT EXISTS module_type        TEXT NOT NULL DEFAULT 'ppr_metraj',
  ADD COLUMN IF NOT EXISTS description        TEXT;

CREATE INDEX IF NOT EXISTS idx_projects_parent     ON projects(parent_project_id);
CREATE INDEX IF NOT EXISTS idx_projects_module_type ON projects(module_type);

-- 2. brands tablosu (şirket bazlı)
CREATE TABLE IF NOT EXISTS brands (
  id          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  company_id  UUID REFERENCES companies(id) ON DELETE CASCADE,
  name        TEXT NOT NULL,
  category    TEXT NOT NULL,
  description TEXT,
  is_active   BOOLEAN NOT NULL DEFAULT true,
  created_at  TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at  TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_brands_company ON brands(company_id);

ALTER TABLE brands ENABLE ROW LEVEL SECURITY;

CREATE POLICY "brands_all" ON brands FOR ALL TO authenticated
  USING  (is_super_admin() OR company_id IS NULL OR company_id = my_company_id())
  WITH CHECK (is_super_admin() OR company_id = my_company_id());

-- 3. price_lists: eksik kolonlar
ALTER TABLE price_lists
  ADD COLUMN IF NOT EXISTS brand_id     UUID REFERENCES brands(id) ON DELETE CASCADE,
  ADD COLUMN IF NOT EXISTS product_name TEXT,
  ADD COLUMN IF NOT EXISTS unit         TEXT,
  ADD COLUMN IF NOT EXISTS is_active    BOOLEAN NOT NULL DEFAULT true;

ALTER TABLE price_lists DROP CONSTRAINT IF EXISTS price_lists_company_id_product_id_key;
ALTER TABLE price_lists ADD CONSTRAINT price_lists_brand_product_key UNIQUE (brand_id, product_id);

-- 4. system_configs
CREATE TABLE IF NOT EXISTS system_configs (
  key        TEXT PRIMARY KEY,
  value      TEXT NOT NULL DEFAULT 'null',
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

ALTER TABLE system_configs ENABLE ROW LEVEL SECURITY;

CREATE POLICY "syscfg_read"  ON system_configs FOR SELECT TO authenticated USING (true);
CREATE POLICY "syscfg_write" ON system_configs FOR ALL    TO authenticated
  USING     (is_super_admin())
  WITH CHECK (is_super_admin());
