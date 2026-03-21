-- ── Revizyon Sistemi — Projeler tablosuna parent bağlantısı ekle ──────
-- Revizyon = aynı bina teknik config'i, farklı marka/fiyat ile yeni kayıt.
-- parent_project_id → orijinal projenin UUID'si (NULL = ana proje).

ALTER TABLE projects
  ADD COLUMN IF NOT EXISTS parent_project_id uuid REFERENCES projects(id) ON DELETE SET NULL;

-- İndeks: parent_project_id'ye göre hızlı filtreleme
CREATE INDEX IF NOT EXISTS idx_projects_parent ON projects(parent_project_id);

COMMENT ON COLUMN projects.parent_project_id IS
  'Revizyon ise orijinal projenin ID''si; ana proje ise NULL.';
