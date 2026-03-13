-- ═══════════════════════════════════════════════════════════════════════
-- AsisenEnergy PPR Metraj — Veritabanı Şeması
-- Supabase / PostgreSQL
-- ═══════════════════════════════════════════════════════════════════════

-- ── 1. profiles ─────────────────────────────────────────────────────────
-- Supabase Auth ile entegre kullanıcı profilleri.
-- Her kayıt auth.users tablosundaki bir kullanıcıya karşılık gelir.
CREATE TABLE IF NOT EXISTS profiles (
  id         UUID REFERENCES auth.users ON DELETE CASCADE PRIMARY KEY,
  name       TEXT,
  role       TEXT NOT NULL DEFAULT 'user', -- 'admin' | 'user'
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Yeni kullanıcı kaydolduğunda otomatik profil oluştur
CREATE OR REPLACE FUNCTION handle_new_user()
RETURNS TRIGGER AS $$
BEGIN
  INSERT INTO public.profiles (id, name)
  VALUES (NEW.id, NEW.raw_user_meta_data->>'name');
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION handle_new_user();

-- ── 2. brands ───────────────────────────────────────────────────────────
-- PPR, vana, basınç düşürücü, filtre gibi kategorilerdeki marka tanımları.
CREATE TABLE IF NOT EXISTS brands (
  id          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name        TEXT NOT NULL,
  category    TEXT NOT NULL CHECK (category IN ('ppr', 'valve', 'bd', 'filter', 'other')),
  description TEXT,
  is_active   BOOLEAN NOT NULL DEFAULT true,
  created_at  TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Varsayılan markalar
INSERT INTO brands (name, category, description) VALUES
  ('Kalde',             'ppr',    'PP-R boru ve bağlantı parçaları'),
  ('Fırat Boru',        'ppr',    'PP-R boru ve bağlantı parçaları'),
  ('Wavin Tigris',      'ppr',    'PP-R boru ve bağlantı parçaları'),
  ('Standart / Press',  'valve',  'Pirinç küresel vana'),
  ('Caleffi',           'valve',  'Pirinç küresel vana'),
  ('Caleffi',           'bd',     'Daire başı basınç düşürücü'),
  ('Honeywell / Resideo','bd',    'Daire başı basınç düşürücü'),
  ('Kalde',             'filter', 'Filtre ve çekvalf')
ON CONFLICT DO NOTHING;

-- ── 3. price_lists ──────────────────────────────────────────────────────
-- Marka + ürün bazında liste fiyatları ve iskontolar.
-- product_id alanı mevcut PRICES[].id değerleriyle örtüşür (örn: 'q75', 'e63').
CREATE TABLE IF NOT EXISTS price_lists (
  id             UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  brand_id       UUID REFERENCES brands(id) ON DELETE CASCADE,
  product_id     TEXT NOT NULL,       -- örn: 'q75', 'ppr-v50', 'pir-v2'
  product_name   TEXT NOT NULL,
  unit           TEXT NOT NULL DEFAULT 'adet',
  list_price     DECIMAL(12, 2) NOT NULL DEFAULT 0,
  discount_pct   DECIMAL(5, 2)  NOT NULL DEFAULT 0,
  effective_date DATE NOT NULL DEFAULT CURRENT_DATE,
  is_active      BOOLEAN NOT NULL DEFAULT true,
  updated_at     TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE (brand_id, product_id)
);

-- updated_at otomatik güncelleme tetikleyicisi
CREATE OR REPLACE FUNCTION update_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS price_lists_updated_at ON price_lists;
CREATE TRIGGER price_lists_updated_at
  BEFORE UPDATE ON price_lists
  FOR EACH ROW EXECUTE FUNCTION update_updated_at();

-- ── 4. projects ─────────────────────────────────────────────────────────
-- Kaydedilen hesaplama projeleri.
-- config: Tüm wizard form değerleri (JSONB)
-- result: Son hesaplama çıktısı (JSONB)
CREATE TABLE IF NOT EXISTS projects (
  id            UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name          TEXT NOT NULL,
  description   TEXT,
  building_name TEXT,
  created_by    UUID REFERENCES profiles(id) ON DELETE SET NULL,
  status        TEXT NOT NULL DEFAULT 'draft' CHECK (status IN ('draft', 'completed', 'archived')),
  config        JSONB NOT NULL DEFAULT '{}',
  result        JSONB,
  created_at    TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at    TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

DROP TRIGGER IF EXISTS projects_updated_at ON projects;
CREATE TRIGGER projects_updated_at
  BEFORE UPDATE ON projects
  FOR EACH ROW EXECUTE FUNCTION update_updated_at();

-- ── 5. calculation_history ──────────────────────────────────────────────
-- Her "Hesapla" butonuna tıklandığında otomatik kayıt oluşturulur.
-- Böylece bir projenin geçmiş hesaplama versiyonları izlenebilir.
CREATE TABLE IF NOT EXISTS calculation_history (
  id                  UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  project_id          UUID REFERENCES projects(id) ON DELETE CASCADE,
  calculated_by       UUID REFERENCES profiles(id) ON DELETE SET NULL,
  input_snapshot      JSONB NOT NULL,   -- O anki config değerleri
  result_snapshot     JSONB NOT NULL,   -- O anki hesaplama sonucu
  total_amount_kdvsiz DECIMAL(12, 2),
  total_amount_kdvli  DECIMAL(12, 2),
  total_pipe_m        DECIMAL(10, 2),
  total_flats         INTEGER,
  calculated_at       TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- ── 6. system_configs ───────────────────────────────────────────────────
-- Uygulama geneli ayarlar: KDV oranı, varsayılan marka, vb.
-- key/value çiftiyle esneklik sağlar; yeni ayar eklemek için migration gerekmez.
CREATE TABLE IF NOT EXISTS system_configs (
  key         TEXT PRIMARY KEY,
  value       JSONB NOT NULL,
  description TEXT,
  updated_by  UUID REFERENCES profiles(id) ON DELETE SET NULL,
  updated_at  TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

DROP TRIGGER IF EXISTS system_configs_updated_at ON system_configs;
CREATE TRIGGER system_configs_updated_at
  BEFORE UPDATE ON system_configs
  FOR EACH ROW EXECUTE FUNCTION update_updated_at();

-- Varsayılan sistem ayarları
INSERT INTO system_configs (key, value, description) VALUES
  ('kdv_rate',          '20',        'KDV oranı (%)'),
  ('default_brand_ppr', '"kalde"',   'Varsayılan PPR marka ID'),
  ('default_brand_valve','"standart"','Varsayılan vana markası'),
  ('app_name',          '"AsisenEnergy PPR Metraj"', 'Uygulama adı')
ON CONFLICT (key) DO NOTHING;

-- ═══════════════════════════════════════════════════════════════════════
-- Row Level Security (RLS)
-- Kullanıcı sadece kendi projelerini görebilir/düzenleyebilir.
-- Admin tüm verilere erişebilir.
-- ═══════════════════════════════════════════════════════════════════════

ALTER TABLE profiles           ENABLE ROW LEVEL SECURITY;
ALTER TABLE brands             ENABLE ROW LEVEL SECURITY;
ALTER TABLE price_lists        ENABLE ROW LEVEL SECURITY;
ALTER TABLE projects           ENABLE ROW LEVEL SECURITY;
ALTER TABLE calculation_history ENABLE ROW LEVEL SECURITY;
ALTER TABLE system_configs     ENABLE ROW LEVEL SECURITY;

-- profiles: Kullanıcı kendi profilini görebilir; admin hepsini
CREATE POLICY "profiles_select" ON profiles FOR SELECT
  USING (auth.uid() = id OR EXISTS (
    SELECT 1 FROM profiles WHERE id = auth.uid() AND role = 'admin'
  ));
CREATE POLICY "profiles_update" ON profiles FOR UPDATE
  USING (auth.uid() = id);

-- brands: Herkes okuyabilir, sadece admin yazabilir
CREATE POLICY "brands_select" ON brands FOR SELECT USING (true);
CREATE POLICY "brands_write"  ON brands FOR ALL
  USING (EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND role = 'admin'));

-- price_lists: Herkes okuyabilir, sadece admin yazabilir
CREATE POLICY "price_lists_select" ON price_lists FOR SELECT USING (true);
CREATE POLICY "price_lists_write"  ON price_lists FOR ALL
  USING (EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND role = 'admin'));

-- projects: Kullanıcı kendi projelerini görebilir; admin hepsini
CREATE POLICY "projects_select" ON projects FOR SELECT
  USING (auth.uid() = created_by OR EXISTS (
    SELECT 1 FROM profiles WHERE id = auth.uid() AND role = 'admin'
  ));
CREATE POLICY "projects_insert" ON projects FOR INSERT
  WITH CHECK (auth.uid() = created_by);
CREATE POLICY "projects_update" ON projects FOR UPDATE
  USING (auth.uid() = created_by OR EXISTS (
    SELECT 1 FROM profiles WHERE id = auth.uid() AND role = 'admin'
  ));
CREATE POLICY "projects_delete" ON projects FOR DELETE
  USING (auth.uid() = created_by OR EXISTS (
    SELECT 1 FROM profiles WHERE id = auth.uid() AND role = 'admin'
  ));

-- calculation_history: projects ile aynı kural
CREATE POLICY "calc_history_select" ON calculation_history FOR SELECT
  USING (auth.uid() = calculated_by OR EXISTS (
    SELECT 1 FROM profiles WHERE id = auth.uid() AND role = 'admin'
  ));
CREATE POLICY "calc_history_insert" ON calculation_history FOR INSERT
  WITH CHECK (auth.uid() = calculated_by);

-- system_configs: Herkes okuyabilir, sadece admin yazabilir
CREATE POLICY "sys_configs_select" ON system_configs FOR SELECT USING (true);
CREATE POLICY "sys_configs_write"  ON system_configs FOR ALL
  USING (EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND role = 'admin'));
