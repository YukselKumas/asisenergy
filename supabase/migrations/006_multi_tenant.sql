-- ── Migration 006: Multi-Tenant Architecture ────────────────────────────
-- Şirket bazlı veri izolasyonu (Zoho CRM modeli)
-- Rol hiyerarşisi: super_admin → company_admin → user
--
-- ÇALIŞTIRMA SIRASI (her adım ayrı ayrı çalıştırılmalı):
--   ADIM 1 — Temizlik (eski tabloları sil)
--   ADIM 2 — Tablolar ve Fonksiyonlar (bu dosya)
--   ADIM 3 — Auth Trigger
--   ADIM 4 — RLS Politikaları

-- ── ADIM 1: Temizlik ────────────────────────────────────────────────────
-- (Supabase SQL editöründe ayrı çalıştırın)
--
-- DO $$ BEGIN
--   DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
-- EXCEPTION WHEN undefined_table THEN NULL; END; $$;
-- DO $$ BEGIN
--   DROP TRIGGER IF EXISTS price_lists_updated_at ON price_lists;
-- EXCEPTION WHEN undefined_table THEN NULL; END; $$;
-- DO $$ BEGIN
--   DROP TRIGGER IF EXISTS projects_updated_at ON projects;
-- EXCEPTION WHEN undefined_table THEN NULL; END; $$;
-- DO $$ BEGIN
--   DROP TRIGGER IF EXISTS system_configs_updated_at ON system_configs;
-- EXCEPTION WHEN undefined_table THEN NULL; END; $$;
-- DROP TABLE IF EXISTS validation_results      CASCADE;
-- DROP TABLE IF EXISTS calculation_history     CASCADE;
-- DROP TABLE IF EXISTS price_lists             CASCADE;
-- DROP TABLE IF EXISTS projects                CASCADE;
-- DROP TABLE IF EXISTS brands                  CASCADE;
-- DROP TABLE IF EXISTS system_configs          CASCADE;
-- DROP TABLE IF EXISTS company_invitations     CASCADE;
-- DROP TABLE IF EXISTS companies               CASCADE;
-- DROP TABLE IF EXISTS profiles                CASCADE;
-- DROP FUNCTION IF EXISTS handle_new_user()    CASCADE;
-- DROP FUNCTION IF EXISTS update_updated_at()  CASCADE;
-- DROP FUNCTION IF EXISTS my_company_id()      CASCADE;
-- DROP FUNCTION IF EXISTS is_super_admin()     CASCADE;
-- DROP FUNCTION IF EXISTS is_company_admin()   CASCADE;

-- ── ADIM 2: Tablolar ve Fonksiyonlar ────────────────────────────────────

CREATE OR REPLACE FUNCTION update_updated_at()
RETURNS TRIGGER LANGUAGE plpgsql AS $$
BEGIN NEW.updated_at = now(); RETURN NEW; END; $$;

CREATE TABLE profiles (
  id           UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  email        TEXT NOT NULL,
  full_name    TEXT,
  role         TEXT NOT NULL DEFAULT 'user'
                 CHECK (role IN ('super_admin','company_admin','user')),
  company_id   UUID,
  created_at   TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at   TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TRIGGER profiles_updated_at
  BEFORE UPDATE ON profiles
  FOR EACH ROW EXECUTE FUNCTION update_updated_at();

CREATE TABLE companies (
  id           UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name         TEXT NOT NULL,
  slug         TEXT UNIQUE NOT NULL,
  created_by   UUID REFERENCES profiles(id),
  is_active    BOOLEAN NOT NULL DEFAULT true,
  created_at   TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at   TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TRIGGER companies_updated_at
  BEFORE UPDATE ON companies
  FOR EACH ROW EXECUTE FUNCTION update_updated_at();

ALTER TABLE profiles
  ADD CONSTRAINT profiles_company_id_fkey
  FOREIGN KEY (company_id) REFERENCES companies(id) ON DELETE SET NULL;

CREATE OR REPLACE FUNCTION is_super_admin()
RETURNS BOOLEAN LANGUAGE sql STABLE SECURITY DEFINER AS $$
  SELECT EXISTS (
    SELECT 1 FROM profiles WHERE id = auth.uid() AND role = 'super_admin'
  );
$$;

CREATE OR REPLACE FUNCTION my_company_id()
RETURNS UUID LANGUAGE sql STABLE SECURITY DEFINER AS $$
  SELECT company_id FROM profiles WHERE id = auth.uid();
$$;

CREATE OR REPLACE FUNCTION is_company_admin()
RETURNS BOOLEAN LANGUAGE sql STABLE SECURITY DEFINER AS $$
  SELECT EXISTS (
    SELECT 1 FROM profiles WHERE id = auth.uid() AND role IN ('super_admin','company_admin')
  );
$$;

CREATE TABLE projects (
  id           UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  company_id   UUID NOT NULL REFERENCES companies(id) ON DELETE CASCADE,
  created_by   UUID NOT NULL REFERENCES profiles(id),
  name         TEXT NOT NULL,
  description  TEXT,
  config       JSONB NOT NULL DEFAULT '{}',
  result       JSONB,
  status       TEXT NOT NULL DEFAULT 'draft'
                 CHECK (status IN ('draft','completed','archived')),
  created_at   TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at   TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX idx_projects_company    ON projects(company_id);
CREATE INDEX idx_projects_created_by ON projects(created_by);

CREATE TRIGGER projects_updated_at
  BEFORE UPDATE ON projects
  FOR EACH ROW EXECUTE FUNCTION update_updated_at();

CREATE TABLE calculation_history (
  id            UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  project_id    UUID REFERENCES projects(id) ON DELETE CASCADE,
  company_id    UUID NOT NULL REFERENCES companies(id) ON DELETE CASCADE,
  created_by    UUID NOT NULL REFERENCES profiles(id),
  config        JSONB NOT NULL DEFAULT '{}',
  result        JSONB NOT NULL DEFAULT '{}',
  calculated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX idx_calc_history_company ON calculation_history(company_id);
CREATE INDEX idx_calc_history_project ON calculation_history(project_id);

CREATE TABLE price_lists (
  id           UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  company_id   UUID NOT NULL REFERENCES companies(id) ON DELETE CASCADE,
  product_id   TEXT NOT NULL,
  list_price   NUMERIC(12,2) NOT NULL DEFAULT 0,
  discount_pct NUMERIC(5,2)  NOT NULL DEFAULT 0,
  updated_at   TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE (company_id, product_id)
);

CREATE INDEX idx_price_lists_company ON price_lists(company_id);

CREATE TRIGGER price_lists_updated_at
  BEFORE UPDATE ON price_lists
  FOR EACH ROW EXECUTE FUNCTION update_updated_at();

CREATE TABLE validation_results (
  id                       UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  project_id               UUID REFERENCES projects(id) ON DELETE CASCADE,
  company_id               UUID REFERENCES companies(id) ON DELETE CASCADE,
  validation_score         INTEGER CHECK (validation_score BETWEEN 0 AND 100),
  inconsistency_flags      JSONB NOT NULL DEFAULT '[]',
  auto_calculated_fittings JSONB NOT NULL DEFAULT '{}',
  user_entered_fittings    JSONB NOT NULL DEFAULT '{}',
  effective_length_m       NUMERIC(10,2),
  metrics                  JSONB NOT NULL DEFAULT '{}',
  calculated_at            TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX idx_validation_company ON validation_results(company_id);

CREATE TABLE company_invitations (
  id           UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  company_id   UUID NOT NULL REFERENCES companies(id) ON DELETE CASCADE,
  email        TEXT NOT NULL,
  role         TEXT NOT NULL DEFAULT 'user'
                 CHECK (role IN ('company_admin','user')),
  token        TEXT UNIQUE NOT NULL DEFAULT gen_random_uuid()::text,
  invited_by   UUID NOT NULL REFERENCES profiles(id),
  accepted_at  TIMESTAMPTZ,
  expires_at   TIMESTAMPTZ NOT NULL DEFAULT (now() + INTERVAL '7 days'),
  created_at   TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX idx_invitations_company ON company_invitations(company_id);
CREATE INDEX idx_invitations_token   ON company_invitations(token);

-- ── ADIM 3: Auth Trigger ─────────────────────────────────────────────────

CREATE OR REPLACE FUNCTION handle_new_user()
RETURNS TRIGGER LANGUAGE plpgsql SECURITY DEFINER AS $$
BEGIN
  INSERT INTO profiles (id, email, full_name, role, company_id)
  VALUES (
    NEW.id,
    NEW.email,
    COALESCE(NEW.raw_user_meta_data->>'full_name', split_part(NEW.email,'@',1)),
    COALESCE(NEW.raw_user_meta_data->>'role', 'user'),
    (NEW.raw_user_meta_data->>'company_id')::UUID
  )
  ON CONFLICT (id) DO NOTHING;
  RETURN NEW;
END; $$;

CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION handle_new_user();

-- ── ADIM 4: RLS Politikaları ─────────────────────────────────────────────

ALTER TABLE profiles            ENABLE ROW LEVEL SECURITY;
ALTER TABLE companies           ENABLE ROW LEVEL SECURITY;
ALTER TABLE projects            ENABLE ROW LEVEL SECURITY;
ALTER TABLE calculation_history ENABLE ROW LEVEL SECURITY;
ALTER TABLE price_lists         ENABLE ROW LEVEL SECURITY;
ALTER TABLE validation_results  ENABLE ROW LEVEL SECURITY;
ALTER TABLE company_invitations ENABLE ROW LEVEL SECURITY;

-- profiles
CREATE POLICY "profiles_select" ON profiles FOR SELECT TO authenticated
  USING (id = auth.uid() OR is_super_admin() OR (company_id IS NOT NULL AND company_id = my_company_id()));

CREATE POLICY "profiles_insert" ON profiles FOR INSERT TO authenticated
  WITH CHECK (id = auth.uid());

CREATE POLICY "profiles_update" ON profiles FOR UPDATE TO authenticated
  USING (id = auth.uid() OR is_super_admin() OR is_company_admin());

-- companies
CREATE POLICY "companies_select" ON companies FOR SELECT TO authenticated
  USING (is_super_admin() OR id = my_company_id());

CREATE POLICY "companies_insert" ON companies FOR INSERT TO authenticated
  WITH CHECK (is_super_admin());

CREATE POLICY "companies_update" ON companies FOR UPDATE TO authenticated
  USING (is_super_admin() OR (id = my_company_id() AND is_company_admin()));

CREATE POLICY "companies_delete" ON companies FOR DELETE TO authenticated
  USING (is_super_admin());

-- projects
CREATE POLICY "projects_select" ON projects FOR SELECT TO authenticated
  USING (is_super_admin() OR company_id = my_company_id());

CREATE POLICY "projects_insert" ON projects FOR INSERT TO authenticated
  WITH CHECK (is_super_admin() OR (company_id = my_company_id() AND company_id IS NOT NULL));

CREATE POLICY "projects_update" ON projects FOR UPDATE TO authenticated
  USING (is_super_admin() OR (company_id = my_company_id() AND created_by = auth.uid()));

CREATE POLICY "projects_delete" ON projects FOR DELETE TO authenticated
  USING (is_super_admin() OR (company_id = my_company_id() AND is_company_admin()));

-- calculation_history
CREATE POLICY "calc_history_select" ON calculation_history FOR SELECT TO authenticated
  USING (is_super_admin() OR company_id = my_company_id());

CREATE POLICY "calc_history_insert" ON calculation_history FOR INSERT TO authenticated
  WITH CHECK (is_super_admin() OR company_id = my_company_id());

-- price_lists
CREATE POLICY "price_lists_select" ON price_lists FOR SELECT TO authenticated
  USING (is_super_admin() OR company_id = my_company_id());

CREATE POLICY "price_lists_insert" ON price_lists FOR INSERT TO authenticated
  WITH CHECK (is_super_admin() OR (company_id = my_company_id() AND is_company_admin()));

CREATE POLICY "price_lists_update" ON price_lists FOR UPDATE TO authenticated
  USING (is_super_admin() OR (company_id = my_company_id() AND is_company_admin()));

CREATE POLICY "price_lists_delete" ON price_lists FOR DELETE TO authenticated
  USING (is_super_admin() OR (company_id = my_company_id() AND is_company_admin()));

-- validation_results
CREATE POLICY "validation_select" ON validation_results FOR SELECT TO authenticated
  USING (is_super_admin() OR company_id = my_company_id());

CREATE POLICY "validation_insert" ON validation_results FOR INSERT TO authenticated
  WITH CHECK (is_super_admin() OR company_id = my_company_id());

-- company_invitations
CREATE POLICY "invitations_select" ON company_invitations FOR SELECT TO authenticated
  USING (is_super_admin() OR company_id = my_company_id());

CREATE POLICY "invitations_insert" ON company_invitations FOR INSERT TO authenticated
  WITH CHECK (is_super_admin() OR (company_id = my_company_id() AND is_company_admin()));

CREATE POLICY "invitations_update" ON company_invitations FOR UPDATE TO authenticated
  USING (is_super_admin() OR company_id = my_company_id());
