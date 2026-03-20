// ── RevisionBar — Revizyon Yönetimi ──────────────────────────────────
// Aynı bina, farklı marka kombinasyonları = farklı fiyat teklifleri.
// Revizyonlar arasında geçiş, klonlama ve silme işlemleri burada yapılır.

import { useState } from 'react';
import { useCalculationStore } from '../../store/calculationStore.js';
import { useDefinitionsStore }  from '../../store/definitionsStore.js';
import { GlassSelect } from '../ui/GlassSelect.jsx';
import { Button }      from '../ui/Button.jsx';
import { showToast }   from '../ui/Toast.jsx';

const BRAND_CATS = [
  { key: 'markaPpr',     label: 'PPR Boru & Bağlantı', cat: 'ppr'    },
  { key: 'markaPirince', label: 'Pirinç Küresel Vana',  cat: 'valve'  },
  { key: 'markaBd',      label: 'Basınç Düşürücü',      cat: 'bd'     },
  { key: 'markaFiltre',  label: 'Filtre & Çekvalf',     cat: 'filter' },
];

export function RevisionBar() {
  const {
    config, revisions, activeRevId,
    saveAsRevision, cloneRevision, switchRevision, deleteRevision, loadBrandPrices,
  } = useCalculationStore();
  const { brands } = useDefinitionsStore();

  const [mode,       setMode]       = useState(null);    // 'save' | 'clone' | null
  const [revName,    setRevName]    = useState('');
  const [cloneBrands, setCloneBrands] = useState({
    markaPpr: '', markaPirince: '', markaBd: '', markaFiltre: '',
  });

  // Mevcut markadan isim türet
  function brandName(id) {
    if (!id) return '?';
    return brands.find(b => b.id === id)?.name || '?';
  }

  function activeRev() {
    return revisions.find(r => r.id === activeRevId) || null;
  }

  // ── Kaydet ──────────────────────────────────────────────────────
  function handleSave() {
    if (!revName.trim()) { showToast('⚠ Revizyon adı boş olamaz.'); return; }
    if (!config.markaPpr) { showToast('⚠ Önce Adım 1\'de markalar seçilmeli.'); return; }
    saveAsRevision(revName.trim());
    showToast(`✓ "${revName.trim()}" revizyonu kaydedildi.`);
    setMode(null);
    setRevName('');
  }

  // ── Klonla ──────────────────────────────────────────────────────
  async function handleClone() {
    if (!revName.trim()) { showToast('⚠ Revizyon adı boş olamaz.'); return; }
    const missing = BRAND_CATS.find(b => !cloneBrands[b.key]);
    if (missing) { showToast(`⚠ ${missing.label} markası seçilmemiş.`); return; }

    const id = cloneRevision(revName.trim(), cloneBrands);

    // Yeni markaların fiyatlarını yükle
    for (const { key, cat } of BRAND_CATS) {
      await loadBrandPrices(cat, cloneBrands[key]);
    }
    showToast(`✓ "${revName.trim()}" revizyonu oluşturuldu. Adım 1'e dönerek markaları kontrol edin.`);
    setMode(null);
    setRevName('');
    setCloneBrands({ markaPpr: '', markaPirince: '', markaBd: '', markaFiltre: '' });
  }

  // ── Revizyona geç ───────────────────────────────────────────────
  async function handleSwitch(id) {
    switchRevision(id);
    const rev = revisions.find(r => r.id === id);
    if (rev) {
      for (const { key, cat } of BRAND_CATS) {
        if (rev.brands[key]) await loadBrandPrices(cat, rev.brands[key]);
      }
      showToast(`↻ "${rev.name}" revizyonuna geçildi.`);
    }
  }

  const hasRevisions = revisions.length > 0;
  const cur = activeRev();

  return (
    <div style={{ marginBottom: 16 }}>

      {/* Revizyon şeridi */}
      <div style={{
        display: 'flex', alignItems: 'center', gap: 8, flexWrap: 'wrap',
        padding: '8px 12px',
        background: hasRevisions ? 'var(--green-bg)' : 'var(--bg)',
        border: `1px solid ${hasRevisions ? 'var(--green-b)' : 'var(--border)'}`,
        borderRadius: 'var(--r)',
      }}>

        {/* Etiket */}
        <span style={{ fontSize: 11, fontWeight: 700, color: 'var(--muted)', textTransform: 'uppercase', letterSpacing: '.4px', flexShrink: 0 }}>
          Revizyonlar
        </span>

        {/* Revizyon sekmeleri */}
        {revisions.map(rev => (
          <button
            key={rev.id}
            onClick={() => rev.id !== activeRevId && handleSwitch(rev.id)}
            style={{
              padding: '4px 12px', borderRadius: 'var(--r2)', fontSize: 12, fontWeight: 600,
              cursor: rev.id === activeRevId ? 'default' : 'pointer',
              background: rev.id === activeRevId ? 'var(--acc)' : 'var(--white)',
              color:      rev.id === activeRevId ? '#fff' : 'var(--text)',
              border: `1px solid ${rev.id === activeRevId ? 'var(--acc)' : 'var(--border)'}`,
              display: 'flex', alignItems: 'center', gap: 6,
            }}
          >
            {rev.id === activeRevId && <span style={{ fontSize: 10 }}>●</span>}
            {rev.name}
            {rev.result && <span style={{ fontSize: 10, opacity: .7 }}>✓</span>}
            {rev.id !== activeRevId && (
              <span
                onClick={e => { e.stopPropagation(); if (confirm(`"${rev.name}" silinsin mi?`)) deleteRevision(rev.id); }}
                style={{ marginLeft: 2, opacity: .5, fontSize: 12, cursor: 'pointer' }}
                title="Sil"
              >×</span>
            )}
          </button>
        ))}

        {/* Aktif revizyon yok / marka özeti */}
        {!cur && (
          <span style={{ fontSize: 11, color: 'var(--muted)', fontStyle: 'italic' }}>
            {hasRevisions ? 'Aktif revizyon seçilmedi' : 'Henüz revizyon yok'}
          </span>
        )}
        {cur && (
          <span style={{ fontSize: 11, color: 'var(--muted)' }}>
            PPR: {brandName(cur.brands.markaPpr)} · Vana: {brandName(cur.brands.markaPirince)}
          </span>
        )}

        {/* Eylem butonları */}
        <div style={{ marginLeft: 'auto', display: 'flex', gap: 6 }}>
          <Button
            variant="default"
            style={{ padding: '3px 10px', fontSize: 11 }}
            onClick={() => { setMode('save'); setRevName(cur?.name || `Revizyon ${revisions.length + 1}`); }}
          >
            💾 Kaydet
          </Button>
          <Button
            variant="default"
            style={{ padding: '3px 10px', fontSize: 11 }}
            onClick={() => {
              setMode('clone');
              setRevName(`${cur?.name || 'Revizyon'} Kopyası`);
              setCloneBrands({ markaPpr: '', markaPirince: '', markaBd: '', markaFiltre: '' });
            }}
          >
            + Klonla
          </Button>
        </div>
      </div>

      {/* Kaydet paneli */}
      {mode === 'save' && (
        <div style={{ marginTop: 6, padding: '12px 14px', background: 'var(--white)', border: '1px solid var(--border)', borderRadius: 'var(--r)', display: 'flex', gap: 8, alignItems: 'center', flexWrap: 'wrap' }}>
          <span style={{ fontSize: 12, fontWeight: 600, flexShrink: 0 }}>Revizyon adı:</span>
          <input
            value={revName}
            onChange={e => setRevName(e.target.value)}
            placeholder="örn: Kalde Teklifi"
            style={{ flex: 1, minWidth: 180, padding: '6px 12px', border: '1px solid var(--border)', borderRadius: 'var(--r2)', fontSize: 13, fontFamily: 'var(--sans)', outline: 'none' }}
            onKeyDown={e => e.key === 'Enter' && handleSave()}
          />
          <span style={{ fontSize: 11, color: 'var(--muted)' }}>
            Mevcut markalar: PPR={brandName(config.markaPpr)} · Vana={brandName(config.markaPirince)}
          </span>
          <Button variant="primary" style={{ padding: '5px 14px', fontSize: 12 }} onClick={handleSave}>Kaydet</Button>
          <Button variant="default" style={{ padding: '5px 10px', fontSize: 12 }} onClick={() => setMode(null)}>İptal</Button>
        </div>
      )}

      {/* Klonla paneli */}
      {mode === 'clone' && (
        <div style={{ marginTop: 6, padding: '14px 16px', background: 'var(--white)', border: '1px solid var(--border)', borderRadius: 'var(--r)' }}>
          <div style={{ fontSize: 12, fontWeight: 700, marginBottom: 10, color: 'var(--acc)' }}>
            + Yeni Revizyon — farklı markalarla klonla
          </div>
          <div style={{ display: 'flex', gap: 8, alignItems: 'center', marginBottom: 12, flexWrap: 'wrap' }}>
            <span style={{ fontSize: 12, fontWeight: 600, flexShrink: 0 }}>Revizyon adı:</span>
            <input
              value={revName}
              onChange={e => setRevName(e.target.value)}
              placeholder="örn: Wavin Teklifi"
              style={{ flex: 1, minWidth: 180, padding: '6px 12px', border: '1px solid var(--border)', borderRadius: 'var(--r2)', fontSize: 13, fontFamily: 'var(--sans)', outline: 'none' }}
            />
          </div>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(220px, 1fr))', gap: 8, marginBottom: 12 }}>
            {BRAND_CATS.map(({ key, label, cat }) => (
              <div key={key}>
                <div style={{ fontSize: 11, fontWeight: 600, color: 'var(--muted)', marginBottom: 4 }}>{label}</div>
                <GlassSelect
                  value={cloneBrands[key]}
                  onChange={e => setCloneBrands(prev => ({ ...prev, [key]: e.target.value }))}
                >
                  <option value="">— Marka seçin —</option>
                  {brands.filter(b => b.category === cat).map(b => (
                    <option key={b.id} value={b.id}>{b.name}</option>
                  ))}
                </GlassSelect>
              </div>
            ))}
          </div>
          <div style={{ display: 'flex', gap: 8 }}>
            <Button variant="primary" style={{ padding: '6px 16px', fontSize: 12 }} onClick={handleClone}>Revizyonu Oluştur</Button>
            <Button variant="default" style={{ padding: '6px 12px', fontSize: 12 }} onClick={() => setMode(null)}>İptal</Button>
          </div>
        </div>
      )}
    </div>
  );
}
