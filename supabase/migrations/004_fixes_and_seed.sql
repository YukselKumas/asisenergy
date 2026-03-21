-- ═══════════════════════════════════════════════════════════════════════
-- Migration 004 — Eksik kolonlar + brand/fiyat seed düzeltmeleri
-- Bu migration'ı Supabase Dashboard > SQL Editor'de çalıştırın.
-- ═══════════════════════════════════════════════════════════════════════

-- ── 1. projects.revisions kolonu (002 migration'dan) ─────────────────
ALTER TABLE projects
  ADD COLUMN IF NOT EXISTS revisions jsonb NOT NULL DEFAULT '[]'::jsonb;

-- ── 2. projects.parent_project_id kolonu (003 migration'dan) ─────────
ALTER TABLE projects
  ADD COLUMN IF NOT EXISTS parent_project_id uuid REFERENCES projects(id) ON DELETE SET NULL;

CREATE INDEX IF NOT EXISTS idx_projects_parent ON projects(parent_project_id);

COMMENT ON COLUMN projects.parent_project_id IS
  'Revizyon ise orijinal projenin ID''si; ana proje ise NULL.';

-- ── 3. profiles tablosuna eksik kolonlar ─────────────────────────────
ALTER TABLE profiles ADD COLUMN IF NOT EXISTS email TEXT;
ALTER TABLE profiles ADD COLUMN IF NOT EXISTS is_active BOOLEAN NOT NULL DEFAULT true;

-- ── 4. brands.unique constraint (upsert için) ────────────────────────
-- "name + category" çifti üzerinde unique index (varsa atla)
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint
    WHERE conname = 'brands_name_category_key'
  ) THEN
    ALTER TABLE brands ADD CONSTRAINT brands_name_category_key UNIQUE (name, category);
  END IF;
END;
$$;

-- ── 5. Varsayılan marka seed (upsert) ────────────────────────────────
INSERT INTO brands (name, category, description, is_active) VALUES
  ('Kalde',              'ppr',    'PP-R boru ve bağlantı parçaları', true),
  ('Fırat Boru',         'ppr',    'PP-R boru ve bağlantı parçaları', true),
  ('Wavin Tigris',       'ppr',    'PP-R boru ve bağlantı parçaları', true),
  ('Standart / Press',   'valve',  'Pirinç küresel vana', true),
  ('Caleffi',            'valve',  'Pirinç küresel vana', true),
  ('Caleffi',            'bd',     'Daire başı basınç düşürücü', true),
  ('Honeywell / Resideo','bd',     'Daire başı basınç düşürücü', true),
  ('Kalde',              'filter', 'Filtre ve çekvalf', true)
ON CONFLICT (name, category)
  DO UPDATE SET is_active = true, description = EXCLUDED.description;

-- ── 6. price_lists unique constraint ─────────────────────────────────
-- brand_id + product_id unique (varsa atla)
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint
    WHERE conname = 'price_lists_brand_id_product_id_key'
  ) THEN
    ALTER TABLE price_lists ADD CONSTRAINT price_lists_brand_id_product_id_key UNIQUE (brand_id, product_id);
  END IF;
END;
$$;

-- ── 7. Tüm tabloların RLS policy'si güncel mi kontrol et ─────────────
-- projects: SELECT — kendi projesi veya admin
DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE policyname = 'projects_select') THEN
    CREATE POLICY "projects_select" ON projects FOR SELECT
      USING (auth.uid() = created_by OR EXISTS (
        SELECT 1 FROM profiles WHERE id = auth.uid() AND role = 'admin'
      ));
  END IF;
END;
$$;
