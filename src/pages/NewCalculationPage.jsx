// ── NewCalculationPage — Yeni veya mevcut proje hesaplama ─────────────
// URL'de :id varsa mevcut projeyi yükler, yoksa yeni hesaplama başlatır.

import { useEffect, useState } from 'react';
import { useParams } from 'react-router-dom';
import { supabase } from '../lib/supabase.js';
import { useCalculationStore } from '../store/calculationStore.js';
import { WizardShell } from '../components/wizard/WizardShell.jsx';

export function NewCalculationPage() {
  const { id } = useParams();
  const { loadProject, newCalculation } = useCalculationStore();
  const [loading, setLoading] = useState(!!id);
  const [error,   setError]   = useState(null);

  useEffect(() => {
    if (id) {
      loadExisting(id);
    } else {
      newCalculation();
    }
  }, [id]);

  async function loadExisting(projectId) {
    setLoading(true);
    setError(null);
    try {
      const { data, error: err } = await supabase
        .from('projects')
        .select('*')
        .eq('id', projectId)
        .single();
      if (err) throw err;
      loadProject(data);
    } catch (err) {
      setError('Proje yüklenemedi: ' + err.message);
    } finally {
      setLoading(false);
    }
  }

  if (loading) {
    return (
      <div style={{ padding: 40, textAlign: 'center', color: 'var(--muted)', fontSize: 13 }}>
        Proje yükleniyor...
      </div>
    );
  }

  if (error) {
    return (
      <div className="al al-w" style={{ margin: 24 }}>{error}</div>
    );
  }

  return <WizardShell />;
}
