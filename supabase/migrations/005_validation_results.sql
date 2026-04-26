-- ── Migration 005: Validation Results ──────────────────────────────────
-- Her metraj hesabının doğrulama sonuçlarını saklar.
-- Fitting karşılaştırması, efektif uzunluk ve doğruluk metrikleri.

CREATE TABLE IF NOT EXISTS validation_results (
  id                       UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  project_id               UUID REFERENCES projects(id) ON DELETE CASCADE,

  -- Genel doğrulama puanı (0-100)
  validation_score         INTEGER CHECK (validation_score BETWEEN 0 AND 100),

  -- Tetiklenen tutarsızlık uyarıları [{code, message}]
  inconsistency_flags      JSONB NOT NULL DEFAULT '[]',

  -- Standart katsayılarla sistem önerisi {dirsekQ75: 36, mansonQ75: 60, ...}
  auto_calculated_fittings JSONB NOT NULL DEFAULT '{}',

  -- Kullanıcı katsayılarıyla hesaplanan mevcut değerler (result.QTY'den)
  user_entered_fittings    JSONB NOT NULL DEFAULT '{}',

  -- Düz boru + fitting eşdeğer uzunluğu (m)
  effective_length_m       NUMERIC(10, 2),

  -- IDR / QAI / ARE metrikleri {idr, qai, are, qaiDetails: [...]}
  metrics                  JSONB NOT NULL DEFAULT '{}',

  calculated_at            TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Proje bazlı sorgu için index
CREATE INDEX IF NOT EXISTS idx_validation_results_project_id
  ON validation_results (project_id);

-- Son hesaplamayı hızlı bulmak için
CREATE INDEX IF NOT EXISTS idx_validation_results_calculated_at
  ON validation_results (calculated_at DESC);

-- RLS: Kimliği doğrulanmış kullanıcılar kendi projelerinin validation'larını okuyabilir
ALTER TABLE validation_results ENABLE ROW LEVEL SECURITY;

CREATE POLICY "validation_results_select"
  ON validation_results FOR SELECT
  TO authenticated
  USING (
    project_id IN (
      SELECT id FROM projects WHERE created_by = auth.uid()
    )
  );

CREATE POLICY "validation_results_insert"
  ON validation_results FOR INSERT
  TO authenticated
  WITH CHECK (
    project_id IS NULL OR
    project_id IN (
      SELECT id FROM projects WHERE created_by = auth.uid()
    )
  );

-- Admin: tüm kayıtları görebilir
CREATE POLICY "validation_results_admin"
  ON validation_results FOR ALL
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM profiles
      WHERE id = auth.uid() AND role = 'admin'
    )
  );
