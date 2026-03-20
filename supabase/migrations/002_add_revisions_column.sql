-- ── Revizyon Sistemi — Projeler tablosuna revizyonlar sütunu ekle ─────
-- Her proje artık birden fazla marka revizyonunu saklayabilir.
-- Revizyonlar: aynı teknik config (boru, kat, ekipman), farklı marka + fiyat.

ALTER TABLE projects
  ADD COLUMN IF NOT EXISTS revisions jsonb NOT NULL DEFAULT '[]'::jsonb;

-- İndeks: Supabase query performansı için (opsiyonel)
-- CREATE INDEX IF NOT EXISTS idx_projects_revisions ON projects USING gin(revisions);

COMMENT ON COLUMN projects.revisions IS
  'Marka revizyonları: [{id, name, createdAt, brands, priceOverride, result}]';
