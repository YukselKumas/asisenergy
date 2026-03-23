// ── HistoryPage — Kaydedilmiş hesaplamalar + Varyasyon sistemi ──────────

import { useEffect, useState, useMemo, useCallback } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { supabase } from '../lib/supabase.js';
import { useCalculationStore } from '../store/calculationStore.js';
import { useAuthStore }        from '../store/authStore.js';
import { Button } from '../components/ui/Button.jsx';

const TR  = (x, d=0) => new Intl.NumberFormat('tr-TR', { minimumFractionDigits:d, maximumFractionDigits:d }).format(x ?? 0);
const withTimeout = (p, ms) => Promise.race([p, new Promise((_, r) => setTimeout(() => r(new Error('Bağlantı zaman aşımı')), ms))]);

const STATUS_LABEL = {
  draft:     { label:'Taslak',     color:'var(--warn)' },
  completed: { label:'Tamamlandı', color:'var(--green)' },
  archived:  { label:'Arşiv',      color:'var(--muted)' },
};

// ── Varyasyon Karşılaştırma Modalı — sınırsız sütun matrisi ──────────
function VaryasyonCompareModal({ parent, variants, onClose }) {
  // Tüm versiyonlar: Ana proje + V1, V2, V3...
  const allVersions = [{ ...parent, _label: parent.name, _tag: 'Ana' }, ...variants.map((v, i) => ({ ...v, _label: v.name, _tag: `V${i + 1}` }))];

  const metrics = [
    { label: 'Toplam (KDV Dahil)', key: 'grandTotal',  unit: '₺', decimals: 0, best: 'min' },
    { label: 'Toplam (KDV Hariç)', key: 'grandNet',    unit: '₺', decimals: 0, best: 'min' },
    { label: 'Toplam Boru (m)',    key: 'totalPipe',    unit: 'm', decimals: 1, best: null  },
    { label: 'Toplam Daire',       key: 'totalFlats',   unit: '',  decimals: 0, best: null  },
    { label: 'Daire Başı Maliyet', key: '_perFlat',     unit: '₺', decimals: 0, best: 'min' },
  ];

  // Daire başı maliyet türet
  const versionsWithDerived = allVersions.map(v => ({
    ...v,
    result: v.result ? {
      ...v.result,
      _perFlat: v.result.totalFlats > 0 ? Math.round(v.result.grandTotal / v.result.totalFlats) : null,
    } : null,
  }));

  // Her metrik için en iyi değeri bul
  function bestValue(key, best) {
    if (!best) return null;
    const vals = versionsWithDerived.map(v => v.result?.[key]).filter(x => typeof x === 'number');
    if (vals.length === 0) return null;
    return best === 'min' ? Math.min(...vals) : Math.max(...vals);
  }

  return (
    <div
      style={{ position:'fixed', inset:0, background:'rgba(0,0,0,0.55)', zIndex:1000, display:'flex', alignItems:'center', justifyContent:'center', padding:16 }}
      onClick={onClose}
    >
      <div
        onClick={e => e.stopPropagation()}
        style={{ background:'var(--white)', borderRadius:'var(--r)', boxShadow:'0 16px 56px rgba(0,0,0,0.25)', padding:28, maxWidth:'min(900px, 95vw)', width:'100%', maxHeight:'90vh', overflowY:'auto', overflowX:'auto' }}
      >
        {/* Başlık */}
        <div style={{ display:'flex', justifyContent:'space-between', alignItems:'flex-start', marginBottom:22 }}>
          <div>
            <div style={{ fontSize:17, fontWeight:800, letterSpacing:'-.3px' }}>Varyasyon Karşılaştırması</div>
            <div style={{ fontSize:12, color:'var(--muted)', marginTop:3 }}>
              {parent.name} — {allVersions.length} versiyon
            </div>
          </div>
          <button onClick={onClose} style={{ background:'none', border:'none', cursor:'pointer', fontSize:24, color:'var(--muted)', lineHeight:1, padding:'0 4px' }}>×</button>
        </div>

        {/* Versiyon özet kartları */}
        <div style={{ display:'flex', gap:8, marginBottom:20, flexWrap:'wrap' }}>
          {versionsWithDerived.map((v, i) => {
            const isAna   = i === 0;
            const isBest  = v.result?.grandTotal != null && v.result.grandTotal === bestValue('grandTotal', 'min');
            return (
              <div key={v.id} style={{
                padding:'10px 14px', borderRadius:'var(--r2)',
                border: isBest ? '2px solid var(--green)' : '1px solid var(--border)',
                background: isBest ? 'rgba(16,185,129,0.05)' : 'var(--bg)',
                minWidth: 120, position:'relative',
              }}>
                {isBest && (
                  <div style={{ position:'absolute', top:-8, left:10, fontSize:9, fontWeight:800, background:'var(--green)', color:'#fff', borderRadius:999, padding:'2px 7px', letterSpacing:'.3px' }}>
                    EN UCUZ
                  </div>
                )}
                <div style={{ fontSize:11, fontWeight:800, color: isAna ? 'var(--text)' : 'var(--acc)', marginBottom:5 }}>
                  {v._tag}
                </div>
                <div style={{ fontSize:14, fontFamily:'var(--mono)', fontWeight:700, color: isBest ? 'var(--green)' : 'var(--acc)' }}>
                  {v.result?.grandTotal != null ? `${TR(v.result.grandTotal)} ₺` : '—'}
                </div>
                <div style={{ fontSize:10, color:'var(--muted)', marginTop:3 }}>
                  {new Date(v.created_at).toLocaleDateString('tr-TR')}
                </div>
              </div>
            );
          })}
        </div>

        {/* Karşılaştırma matrisi */}
        <div style={{ overflowX:'auto' }}>
          <table style={{ width:'100%', borderCollapse:'collapse', minWidth: 400 }}>
            <thead>
              <tr style={{ borderBottom:'2px solid var(--border)' }}>
                <th style={{ textAlign:'left', fontSize:11, fontWeight:700, color:'var(--muted)', textTransform:'uppercase', letterSpacing:'.4px', padding:'7px 12px 10px 0', whiteSpace:'nowrap', minWidth:140 }}>
                  Metrik
                </th>
                {versionsWithDerived.map((v, i) => (
                  <th key={v.id} style={{ textAlign:'right', padding:'7px 12px 10px', minWidth:110 }}>
                    <div style={{ fontWeight:800, fontSize:13, color: i === 0 ? 'var(--text)' : 'var(--acc)' }}>{v._tag}</div>
                    <div style={{ fontSize:10, fontWeight:400, color:'var(--muted)' }}>{v._label.replace(parent.name, '').replace('—', '').trim() || parent.name}</div>
                  </th>
                ))}
                {versionsWithDerived.length > 1 && (
                  <th style={{ textAlign:'right', fontSize:11, fontWeight:700, color:'var(--muted)', textTransform:'uppercase', letterSpacing:'.4px', padding:'7px 0 10px 12px', whiteSpace:'nowrap' }}>
                    En İyi
                  </th>
                )}
              </tr>
            </thead>
            <tbody>
              {metrics.map(({ label, key, unit, decimals, best }) => {
                const bv = bestValue(key, best);
                const fmt = v => v != null ? `${TR(v, decimals)}${unit ? ' ' + unit : ''}` : '—';
                return (
                  <tr key={label} style={{ borderTop:'1px solid var(--border)' }}>
                    <td style={{ padding:'9px 12px 9px 0', fontWeight:600, color:'var(--muted)', fontSize:12, whiteSpace:'nowrap' }}>
                      {label}
                    </td>
                    {versionsWithDerived.map(v => {
                      const val   = v.result?.[key];
                      const isBst = best && val != null && val === bv;
                      return (
                        <td key={v.id} style={{
                          padding:'9px 12px', textAlign:'right',
                          fontFamily:'var(--mono)', fontSize:13,
                          fontWeight: isBst ? 800 : 600,
                          color: isBst ? 'var(--green)' : 'var(--text)',
                          background: isBst ? 'rgba(16,185,129,0.07)' : undefined,
                          borderRadius: isBst ? 4 : undefined,
                        }}>
                          {fmt(val)}
                        </td>
                      );
                    })}
                    {versionsWithDerived.length > 1 && (
                      <td style={{ padding:'9px 0 9px 12px', textAlign:'right', fontSize:11, color:'var(--green)', fontWeight:800 }}>
                        {bv != null ? versionsWithDerived.find(v => v.result?.[key] === bv)?._tag : '—'}
                      </td>
                    )}
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>

        {/* Kazanan özeti */}
        {versionsWithDerived.length > 1 && (() => {
          const winner = versionsWithDerived.reduce((a, b) => {
            const av = a.result?.grandTotal, bv = b.result?.grandTotal;
            if (av == null) return b; if (bv == null) return a;
            return av <= bv ? a : b;
          });
          const worst = versionsWithDerived.reduce((a, b) => {
            const av = a.result?.grandTotal, bv = b.result?.grandTotal;
            if (av == null) return b; if (bv == null) return a;
            return av >= bv ? a : b;
          });
          const diff = (worst.result?.grandTotal ?? 0) - (winner.result?.grandTotal ?? 0);
          if (diff <= 0) return null;
          const pct  = ((diff / (worst.result?.grandTotal ?? 1)) * 100).toFixed(1);
          return (
            <div style={{ marginTop:18, padding:'11px 16px', background:'rgba(16,185,129,0.08)', border:'1px solid rgba(16,185,129,0.25)', borderRadius:'var(--r2)', fontSize:12, color:'var(--muted)' }}>
              <strong style={{ color:'var(--green)' }}>{winner._tag} ({winner._label})</strong>
              {' '}en ucuz teklif —{' '}
              <strong style={{ color:'var(--green)' }}>{TR(diff)} ₺ (%{pct})</strong>
              {' '}daha düşük.
            </div>
          );
        })()}

        <div style={{ textAlign:'right', marginTop:20 }}>
          <Button variant="default" onClick={onClose}>Kapat</Button>
        </div>
      </div>
    </div>
  );
}

// ── Ana bileşen ─────────────────────────────────────────────────────────
export function HistoryPage() {
  const [projects,     setProjects]     = useState([]);
  const [search,       setSearch]       = useState('');
  const [loading,      setLoading]      = useState(true);
  const [fetchError,   setFetchError]   = useState(null);
  const [expanded,     setExpanded]     = useState({});   // parentId → bool
  const [compareId,    setCompareId]    = useState(null); // parentId → karşılaştırma modal

  const { loadProject, editProject, startRevision } = useCalculationStore();
  const isAdmin  = useAuthStore(s => s.isAdmin);
  const navigate = useNavigate();
  const admin    = typeof isAdmin === 'function' ? isAdmin() : false;

  const fetchProjects = useCallback(async () => {
    setLoading(true); setFetchError(null);
    try {
      const { data, error } = await withTimeout(
        supabase.from('projects').select('*').order('created_at', { ascending: false }),
        10000
      );
      if (error) throw error;
      setProjects(data || []);
    } catch (err) {
      setFetchError(err.message || 'Projeler yüklenemedi');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { fetchProjects(); }, [fetchProjects]);

  async function deleteProject(id) {
    if (!confirm('Bu projeyi ve tüm varyasyonlarını silmek istediğinizden emin misiniz?')) return;
    await supabase.from('projects').delete().eq('id', id);
    setProjects(p => p.filter(x => x.id !== id && x.parent_project_id !== id));
  }

  function viewProject(project) {
    loadProject(project);
    navigate(`/hesaplama/${project.id}`);
  }

  function handleNewVariant(project) {
    const varCount = (childrenOf[project.id] || []).length;
    startRevision(project, varCount + 1);
    navigate('/hesaplama/yeni');
  }

  // Kök projeler + çocuklar
  const { roots, childrenOf } = useMemo(() => {
    const roots = [], childrenOf = {};
    const ids   = new Set(projects.map(p => p.id));
    projects.forEach(p => {
      const hasParent = p.parent_project_id && ids.has(p.parent_project_id);
      if (!hasParent) roots.push(p);
      else (childrenOf[p.parent_project_id] ??= []).push(p);
    });
    // Çocukları eskiden yeniye sırala
    Object.keys(childrenOf).forEach(k => childrenOf[k].sort((a, b) => new Date(a.created_at) - new Date(b.created_at)));
    return { roots, childrenOf };
  }, [projects]);

  const filteredRoots = roots.filter(p =>
    p.name.toLowerCase().includes(search.toLowerCase()) ||
    (p.building_name || '').toLowerCase().includes(search.toLowerCase())
  );

  const compareParent   = compareId ? projects.find(p => p.id === compareId) : null;
  const compareVariants = compareId ? (childrenOf[compareId] || []) : [];

  // ── Tek satır bileşeni ──────────────────────────────────────────────
  function ProjectRow({ p, isVariant = false, varIndex = 0 }) {
    const variants = childrenOf[p.id] || [];
    const isExp    = expanded[p.id] ?? false;
    const total    = p.result?.grandTotal;
    const st       = STATUS_LABEL[p.status] || STATUS_LABEL.draft;

    return (
      <>
        <tr style={{
          background:  isVariant ? 'rgba(99,102,241,0.04)' : undefined,
          borderLeft:  isVariant ? '3px solid var(--acc)' : '3px solid transparent',
        }}>

          {/* Proje adı sütunu */}
          <td style={{ paddingLeft: isVariant ? 32 : 12, paddingTop:11, paddingBottom:11 }}>
            <div style={{ display:'flex', alignItems:'center', gap:7 }}>

              {/* Varyasyon rozeti */}
              {isVariant && (
                <span style={{ fontSize:10, fontWeight:800, background:'var(--acc)', color:'#fff', borderRadius:999, padding:'2px 8px', flexShrink:0, letterSpacing:'.2px' }}>
                  V{varIndex + 1}
                </span>
              )}

              {/* Accordion toggle — sadece kök projede */}
              {!isVariant && variants.length > 0 && (
                <button
                  onClick={() => setExpanded(e => ({ ...e, [p.id]: !isExp }))}
                  style={{ background:'none', border:'none', cursor:'pointer', fontSize:14, color:'var(--acc)', padding:'0 2px', lineHeight:1, flexShrink:0 }}
                  title={isExp ? 'Varyasyonları gizle' : 'Varyasyonları göster'}
                >
                  {isExp ? '▾' : '▸'}
                </button>
              )}
              {!isVariant && variants.length === 0 && (
                <span style={{ display:'inline-block', width:18 }} />
              )}

              <span style={{ fontWeight:600, fontSize: isVariant ? 12 : 13, color: isVariant ? 'var(--muted)' : 'var(--text)' }}>
                {/* Varyasyon adında parent adını kısalt */}
                {isVariant ? (p.name.replace(new RegExp(`^${compareParent?.name || ''}\\s*—\\s*`), '') || p.name) : p.name}
              </span>

              {/* Kaç varyasyon var rozeti */}
              {!isVariant && variants.length > 0 && (
                <span style={{ fontSize:10, background:'rgba(99,102,241,0.12)', color:'var(--acc)', borderRadius:999, padding:'1px 7px', fontWeight:800, flexShrink:0 }}>
                  {variants.length} varyasyon
                </span>
              )}
            </div>
            {p.building_name && (
              <div style={{ fontSize:11, color:'var(--muted)', marginTop:2, paddingLeft: isVariant ? 0 : 20 }}>
                {p.building_name}
              </div>
            )}
          </td>

          {/* Durum */}
          <td>
            <span style={{ background:'rgba(0,0,0,0.05)', color:st.color, fontWeight:700, fontSize:10, padding:'2px 7px', borderRadius:999, textTransform:'uppercase', letterSpacing:'.3px' }}>
              {st.label}
            </span>
          </td>

          {/* Toplam */}
          <td style={{ textAlign:'right', fontFamily:'var(--mono)', color:'var(--acc)', fontWeight:700, fontSize: isVariant ? 12 : 13 }}>
            {total != null ? `${TR(total)} ₺` : '—'}
          </td>

          {/* Daire */}
          <td style={{ textAlign:'right', fontFamily:'var(--mono)', fontSize:12, color:'var(--muted)' }}>
            {p.result?.totalFlats ?? '—'}
          </td>

          {/* Tarih */}
          <td style={{ color:'var(--muted)', fontSize:11, whiteSpace:'nowrap' }}>
            {new Date(p.created_at).toLocaleDateString('tr-TR')}
          </td>

          {/* Eylemler */}
          <td style={{ paddingRight:10 }}>
            <div style={{ display:'flex', gap:4, flexWrap:'nowrap', justifyContent:'flex-end' }}>

              <button onClick={() => viewProject(p)}
                style={{ background:'var(--acc)', color:'#fff', border:'none', borderRadius:999, padding:'4px 10px', fontSize:11, cursor:'pointer', fontWeight:700 }}>
                Görüntüle
              </button>

              {/* Yeni varyasyon — sadece kök projede */}
              {!isVariant && (
                <button onClick={() => handleNewVariant(p)}
                  style={{ background:'var(--bg)', color:'var(--acc)', border:'1px solid rgba(99,102,241,0.35)', borderRadius:999, padding:'4px 10px', fontSize:11, cursor:'pointer', fontWeight:700 }}
                  title="Bu projeyi temel alarak yeni varyasyon başlat">
                  ⊕ Yeni Varyasyon
                </button>
              )}

              {/* Karşılaştır — sadece varyasyonu olan kök projede */}
              {!isVariant && variants.length > 0 && (
                <button onClick={() => { setCompareId(p.id); setExpanded(e => ({ ...e, [p.id]: true })); }}
                  style={{ background:'rgba(99,102,241,0.1)', color:'var(--acc)', border:'1px solid rgba(99,102,241,0.25)', borderRadius:999, padding:'4px 10px', fontSize:11, cursor:'pointer', fontWeight:700 }}>
                  ⇌ Karşılaştır
                </button>
              )}

              {admin && (
                <button onClick={() => { editProject(p); navigate(`/hesaplama/${p.id}`); }}
                  style={{ background:'var(--warn-bg,#fff8e1)', color:'var(--warn,#b45309)', border:'1px solid var(--warn-b,#fde68a)', borderRadius:999, padding:'4px 10px', fontSize:11, cursor:'pointer' }}>
                  ✏ Düzenle
                </button>
              )}

              {admin && (
                <button onClick={() => deleteProject(p.id)}
                  style={{ background:'var(--bg)', color:'var(--red)', border:'1px solid var(--border)', borderRadius:999, padding:'4px 10px', fontSize:11, cursor:'pointer' }}>
                  Sil
                </button>
              )}
            </div>
          </td>
        </tr>

        {/* Varyasyon alt satırları */}
        {isExp && variants.map((v, vi) => (
          <ProjectRow key={v.id} p={v} isVariant varIndex={vi} />
        ))}
      </>
    );
  }

  return (
    <div>
      <div style={{ marginBottom:24 }}>
        <h1 style={{ fontSize:22, fontWeight:800, marginBottom:5 }}>Proje Geçmişi</h1>
        <p style={{ color:'var(--muted)', fontSize:13 }}>Kaydedilmiş hesaplamalar ve varyasyonlar.</p>
      </div>

      {/* Araç çubuğu */}
      <div style={{ display:'flex', gap:10, marginBottom:16, flexWrap:'wrap', alignItems:'center' }}>
        <input
          type="text" value={search} onChange={e => setSearch(e.target.value)}
          placeholder="Proje adı veya bina ile ara..."
          style={{ flex:1, maxWidth:360, background:'var(--white)', border:'1px solid var(--border2)', borderRadius:'var(--r2)', padding:'9px 12px', fontSize:13, outline:'none', fontFamily:'var(--sans)' }}
        />
        <Link to="/hesaplama/yeni">
          <Button variant="primary">＋ Yeni Hesaplama</Button>
        </Link>
      </div>

      {/* Tablo */}
      <div style={{ background:'var(--white)', border:'1px solid var(--border)', borderRadius:'var(--r)', overflow:'hidden', boxShadow:'var(--sh)' }}>
        {loading ? (
          <div style={{ padding:32, textAlign:'center', color:'var(--muted)', fontSize:12 }}>Yükleniyor...</div>
        ) : fetchError ? (
          <div style={{ padding:32, textAlign:'center' }}>
            <div style={{ color:'var(--red)', fontSize:13, marginBottom:10 }}>{fetchError}</div>
            <button onClick={fetchProjects} style={{ background:'var(--acc)', color:'#fff', border:'none', borderRadius:999, padding:'7px 18px', fontSize:12, cursor:'pointer', fontWeight:700 }}>↻ Tekrar Dene</button>
          </div>
        ) : filteredRoots.length === 0 ? (
          <div style={{ padding:32, textAlign:'center', color:'var(--muted)', fontSize:13 }}>
            {search ? `"${search}" ile eşleşen proje bulunamadı.` : 'Henüz proje yok.'}
          </div>
        ) : (
          <table style={{ width:'100%', borderCollapse:'collapse' }}>
            <thead>
              <tr style={{ borderBottom:'1px solid var(--border)', background:'var(--bg)' }}>
                <th style={{ textAlign:'left', paddingLeft:12, paddingTop:10, paddingBottom:10, fontWeight:700, fontSize:11, color:'var(--muted)', textTransform:'uppercase', letterSpacing:'.4px' }}>Proje Adı</th>
                <th style={{ textAlign:'left', fontWeight:700, fontSize:11, color:'var(--muted)', textTransform:'uppercase', letterSpacing:'.4px' }}>Durum</th>
                <th style={{ textAlign:'right', fontWeight:700, fontSize:11, color:'var(--muted)', textTransform:'uppercase', letterSpacing:'.4px' }}>Toplam (KDV Dahil)</th>
                <th style={{ textAlign:'right', fontWeight:700, fontSize:11, color:'var(--muted)', textTransform:'uppercase', letterSpacing:'.4px' }}>Daire</th>
                <th style={{ fontWeight:700, fontSize:11, color:'var(--muted)', textTransform:'uppercase', letterSpacing:'.4px' }}>Tarih</th>
                <th style={{ textAlign:'right', paddingRight:10, fontWeight:700, fontSize:11, color:'var(--muted)', textTransform:'uppercase', letterSpacing:'.4px' }}>İşlemler</th>
              </tr>
            </thead>
            <tbody>
              {filteredRoots.map(p => (
                <ProjectRow key={p.id} p={p} />
              ))}
            </tbody>
          </table>
        )}
      </div>

      {!admin && (
        <div style={{ marginTop:12, fontSize:11, color:'var(--muted)', fontStyle:'italic' }}>
          Düzenleme ve silme işlemleri yalnızca yöneticiler tarafından yapılabilir.
        </div>
      )}

      {/* Varyasyon karşılaştırma modali */}
      {compareId && compareParent && (
        <VaryasyonCompareModal
          parent={compareParent}
          variants={compareVariants}
          onClose={() => setCompareId(null)}
        />
      )}
    </div>
  );
}
