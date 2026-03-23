// ── HistoryPage — Kaydedilmiş hesaplamalar listesi ────────────────────

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

// ── Revizyon Karşılaştırma Modalı ─────────────────────────────────────
// Sadece aynı projenin revizyonlarını karşılaştırır
function RevisionCompareModal({ parent, revisions, onClose }) {
  // Karşılaştırılacak 2 sürümü seç (başlangıç: parent + ilk revizyon)
  const allVersions = [parent, ...revisions]; // parent + R1, R2...
  const [selA, setSelA] = useState(parent.id);
  const [selB, setSelB] = useState(revisions[0]?.id || parent.id);

  const vA = allVersions.find(v => v.id === selA);
  const vB = allVersions.find(v => v.id === selB);

  function vLabel(v, idx) {
    if (v.id === parent.id) return v.name;
    return `R${idx}`;
  }

  const metrics = [
    { label: 'Toplam (KDV Dahil)', key: 'grandTotal', unit: '₺', decimals: 0 },
    { label: 'Toplam (KDV Hariç)', key: 'grandNet',   unit: '₺', decimals: 0 },
    { label: 'Toplam Boru (m)',    key: 'totalPipe',  unit: 'm',  decimals: 1 },
    { label: 'Toplam Daire',       key: 'totalFlats', unit: '',   decimals: 0 },
  ];

  const cheapest = vA?.result?.grandTotal != null && vB?.result?.grandTotal != null
    ? (vA.result.grandTotal <= vB.result.grandTotal ? vA : vB)
    : null;

  return (
    <div
      style={{ position:'fixed', inset:0, background:'rgba(0,0,0,0.5)', zIndex:1000, display:'flex', alignItems:'center', justifyContent:'center', padding:20 }}
      onClick={onClose}
    >
      <div
        onClick={e => e.stopPropagation()}
        style={{ background:'var(--white)', borderRadius:'var(--r)', boxShadow:'0 12px 48px rgba(0,0,0,0.22)', padding:28, maxWidth:700, width:'100%', maxHeight:'90vh', overflowY:'auto' }}
      >
        {/* Başlık */}
        <div style={{ display:'flex', justifyContent:'space-between', alignItems:'flex-start', marginBottom:20 }}>
          <div>
            <div style={{ fontSize:16, fontWeight:800 }}>Revizyon Karşılaştırması</div>
            <div style={{ fontSize:12, color:'var(--muted)', marginTop:2 }}>{parent.name}</div>
          </div>
          <button onClick={onClose} style={{ background:'none', border:'none', cursor:'pointer', fontSize:22, color:'var(--muted)', lineHeight:1, padding:'0 4px' }}>×</button>
        </div>

        {/* Versiyon seçici */}
        <div style={{ display:'flex', gap:10, marginBottom:18, padding:'12px 14px', background:'var(--bg)', borderRadius:'var(--r2)', flexWrap:'wrap', alignItems:'center' }}>
          <span style={{ fontSize:11, fontWeight:700, color:'var(--muted)', textTransform:'uppercase', letterSpacing:'.4px' }}>Karşılaştır:</span>
          <div style={{ display:'flex', alignItems:'center', gap:6 }}>
            <span style={{ fontSize:12, color:'var(--muted)' }}>A:</span>
            <select value={selA} onChange={e => setSelA(e.target.value)}
              style={{ padding:'5px 10px', border:'1px solid var(--border)', borderRadius:'var(--r2)', fontSize:12, fontFamily:'var(--sans)', outline:'none', background:'var(--white)', fontWeight:600, color:'var(--acc)' }}>
              {allVersions.map((v, i) => (
                <option key={v.id} value={v.id}>{i === 0 ? v.name + ' (Ana)' : `R${i} — ${v.name}`}</option>
              ))}
            </select>
          </div>
          <span style={{ fontSize:14, color:'var(--muted)' }}>⇌</span>
          <div style={{ display:'flex', alignItems:'center', gap:6 }}>
            <span style={{ fontSize:12, color:'var(--muted)' }}>B:</span>
            <select value={selB} onChange={e => setSelB(e.target.value)}
              style={{ padding:'5px 10px', border:'1px solid var(--border)', borderRadius:'var(--r2)', fontSize:12, fontFamily:'var(--sans)', outline:'none', background:'var(--white)', fontWeight:600 }}>
              {allVersions.map((v, i) => (
                <option key={v.id} value={v.id}>{i === 0 ? v.name + ' (Ana)' : `R${i} — ${v.name}`}</option>
              ))}
            </select>
          </div>
        </div>

        {/* Karşılaştırma tablosu */}
        {vA && vB && (
          <table style={{ width:'100%', borderCollapse:'collapse', marginBottom:16 }}>
            <thead>
              <tr style={{ borderBottom:'2px solid var(--border)' }}>
                <th style={{ textAlign:'left', fontSize:11, color:'var(--muted)', padding:'6px 0 10px', fontWeight:700, textTransform:'uppercase', letterSpacing:'.4px' }}>Metrik</th>
                <th style={{ textAlign:'right', fontSize:13, padding:'6px 12px 10px' }}>
                  <div style={{ fontWeight:800, color:'var(--acc)' }}>{vLabel(vA, allVersions.indexOf(vA))}</div>
                  <div style={{ fontSize:10, color:'var(--muted)', fontWeight:400 }}>{new Date(vA.created_at).toLocaleDateString('tr-TR')}</div>
                </th>
                <th style={{ textAlign:'right', fontSize:13, padding:'6px 12px 10px' }}>
                  <div style={{ fontWeight:700 }}>{vLabel(vB, allVersions.indexOf(vB))}</div>
                  <div style={{ fontSize:10, color:'var(--muted)', fontWeight:400 }}>{new Date(vB.created_at).toLocaleDateString('tr-TR')}</div>
                </th>
                <th style={{ textAlign:'right', fontSize:11, color:'var(--muted)', padding:'6px 0 10px', fontWeight:700, textTransform:'uppercase', letterSpacing:'.4px', whiteSpace:'nowrap' }}>Fark (A−B)</th>
              </tr>
            </thead>
            <tbody>
              {metrics.map(({ label, key, unit, decimals }) => {
                const va = vA.result?.[key];
                const vb = vB.result?.[key];
                const diff = typeof va === 'number' && typeof vb === 'number' ? va - vb : null;
                const fmt = v => v != null ? `${TR(v, decimals)}${unit ? ' ' + unit : ''}` : '—';
                return (
                  <tr key={label} style={{ borderTop:'1px solid var(--border)' }}>
                    <td style={{ padding:'9px 0', fontWeight:600, color:'var(--muted)', fontSize:12, whiteSpace:'nowrap' }}>{label}</td>
                    <td style={{ padding:'9px 12px', textAlign:'right', fontFamily:'var(--mono)', fontSize:13, fontWeight:700, color:'var(--acc)' }}>{fmt(va)}</td>
                    <td style={{ padding:'9px 12px', textAlign:'right', fontFamily:'var(--mono)', fontSize:13 }}>{fmt(vb)}</td>
                    <td style={{ padding:'9px 0', textAlign:'right', fontFamily:'var(--mono)', fontSize:12, fontWeight:700,
                      color: diff === null ? 'var(--muted)' : diff < 0 ? 'var(--green)' : diff > 0 ? 'var(--red)' : 'var(--muted)' }}>
                      {diff === null ? '—' : diff === 0 ? '=' : `${diff > 0 ? '+' : ''}${TR(diff, decimals)}`}
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        )}

        {/* Kazanan özeti */}
        {cheapest && selA !== selB && (
          <div style={{ padding:'10px 14px', background:'rgba(16,185,129,0.08)', border:'1px solid rgba(16,185,129,0.25)', borderRadius:'var(--r2)', fontSize:12, color:'var(--muted)', marginBottom:16 }}>
            <strong style={{ color:'var(--green)' }}>
              {vLabel(cheapest, allVersions.indexOf(cheapest))}
            </strong>
            {' '}bu teklifte{' '}
            <strong style={{ color:'var(--green)' }}>
              {TR(Math.abs((vA?.result?.grandTotal ?? 0) - (vB?.result?.grandTotal ?? 0)))} ₺
              {' '}
              (%{(Math.abs(((vA?.result?.grandTotal - vB?.result?.grandTotal) / Math.max(vA?.result?.grandTotal, vB?.result?.grandTotal))) * 100).toFixed(1)}) daha ucuz.
            </strong>
          </div>
        )}

        {/* Tüm sürümler özet tablosu */}
        {allVersions.length > 2 && (
          <div style={{ marginBottom:16 }}>
            <div style={{ fontSize:11, fontWeight:700, color:'var(--muted)', textTransform:'uppercase', letterSpacing:'.4px', marginBottom:8 }}>
              Tüm Sürümler
            </div>
            <div style={{ display:'flex', gap:8, flexWrap:'wrap' }}>
              {allVersions.map((v, i) => (
                <div key={v.id} style={{
                  padding:'8px 14px', background:'var(--bg)', border:'1px solid var(--border)',
                  borderRadius:'var(--r2)', minWidth:130,
                }}>
                  <div style={{ fontSize:11, fontWeight:800, color: i === 0 ? 'var(--text)' : 'var(--acc)', marginBottom:4 }}>
                    {i === 0 ? 'Ana' : `R${i}`}
                  </div>
                  <div style={{ fontSize:13, fontFamily:'var(--mono)', fontWeight:700, color:'var(--acc)' }}>
                    {v.result?.grandTotal != null ? `${TR(v.result.grandTotal)} ₺` : '—'}
                  </div>
                  <div style={{ fontSize:10, color:'var(--muted)', marginTop:2 }}>
                    {new Date(v.created_at).toLocaleDateString('tr-TR')}
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        <div style={{ textAlign:'right' }}>
          <Button variant="default" onClick={onClose}>Kapat</Button>
        </div>
      </div>
    </div>
  );
}

// ── Ana bileşen ─────────────────────────────────────────────────────
export function HistoryPage() {
  const [projects,     setProjects]     = useState([]);
  const [search,       setSearch]       = useState('');
  const [loading,      setLoading]      = useState(true);
  const [fetchError,   setFetchError]   = useState(null);
  const [expanded,     setExpanded]     = useState({});    // parentId → bool (undefined = açık)
  const [compareGroup, setCompareGroup] = useState(null);  // parentId → modal açık

  const { loadProject, editProject, startRevision } = useCalculationStore();
  const isAdmin = useAuthStore(s => s.isAdmin);
  const navigate = useNavigate();

  const admin = typeof isAdmin === 'function' ? isAdmin() : false;

  const fetchProjects = useCallback(async () => {
    setLoading(true);
    setFetchError(null);
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
    if (!confirm('Bu projeyi silmek istediğinizden emin misiniz?')) return;
    await supabase.from('projects').delete().eq('id', id);
    setProjects(p => p.filter(x => x.id !== id));
  }

  function viewProject(project) {
    loadProject(project);
    navigate(`/hesaplama/${project.id}`);
  }

  // Group: roots + revision children
  const { roots, childrenOf } = useMemo(() => {
    const roots = [], childrenOf = {};
    projects.forEach(p => {
      if (!p.parent_project_id) {
        roots.push(p);
      } else {
        (childrenOf[p.parent_project_id] ??= []).push(p);
      }
    });
    // Orphan revisions (parent deleted) → show as roots too
    projects.forEach(p => {
      if (p.parent_project_id && !projects.find(r => r.id === p.parent_project_id)) {
        roots.push(p);
        delete childrenOf[p.parent_project_id];
      }
    });
    return { roots, childrenOf };
  }, [projects]);

  function handleRevision(project) {
    const revCount = (childrenOf[project.id] || []).length;
    startRevision(project, revCount + 1);
    navigate('/hesaplama/yeni');
  }

  const filteredRoots = roots.filter(p =>
    p.name.toLowerCase().includes(search.toLowerCase()) ||
    (p.building_name || '').toLowerCase().includes(search.toLowerCase())
  );

  // Karşılaştırma modali için verileri hazırla
  const compareParent   = compareGroup ? projects.find(p => p.id === compareGroup) : null;
  const compareChildren = compareGroup ? (childrenOf[compareGroup] || []) : [];

  function ProjectRow({ p, isRevision = false, revIndex = 0 }) {
    const revs  = childrenOf[p.id] || [];
    const isExp = expanded[p.id] ?? true;
    const total = p.result?.grandTotal;
    const flats = p.result?.totalFlats;
    const st    = STATUS_LABEL[p.status] || STATUS_LABEL.draft;

    return (
      <>
        <tr style={{
          background:  isRevision ? 'rgba(99,102,241,0.035)' : undefined,
          borderLeft:  isRevision ? '3px solid var(--acc)' : undefined,
          transition:  'background .15s',
        }}>

          {/* Proje adı + R-badge */}
          <td style={{ paddingLeft: isRevision ? 32 : 14, paddingTop:10, paddingBottom:10 }}>
            <div style={{ display:'flex', alignItems:'center', gap:7 }}>
              {isRevision && (
                <span style={{ fontSize:10, fontWeight:800, background:'var(--acc)', color:'#fff', borderRadius:999, padding:'2px 7px', flexShrink:0 }}>
                  R{revIndex + 1}
                </span>
              )}
              {!isRevision && revs.length > 0 && (
                <button
                  onClick={() => setExpanded(e => ({ ...e, [p.id]: !isExp }))}
                  style={{ background:'none', border:'none', cursor:'pointer', fontSize:13, color:'var(--acc)', padding:'0 2px', lineHeight:1, flexShrink:0 }}
                  title={isExp ? 'Revizyonları gizle' : 'Revizyonları göster'}
                >
                  {isExp ? '▾' : '▸'}
                </button>
              )}
              <span style={{ fontWeight:600, fontSize: isRevision ? 12 : 13 }}>{p.name}</span>
              {!isRevision && revs.length > 0 && (
                <span style={{ fontSize:10, background:'rgba(99,102,241,0.12)', color:'var(--acc)', borderRadius:999, padding:'1px 7px', fontWeight:800 }}>
                  {revs.length} rev
                </span>
              )}
            </div>
            {p.building_name && (
              <div style={{ fontSize:11, color:'var(--muted)', marginTop:1 }}>{p.building_name}</div>
            )}
          </td>

          {/* Durum */}
          <td>
            <span style={{ background:'rgba(0,0,0,0.05)', color:st.color, fontWeight:700, fontSize:10, padding:'2px 7px', borderRadius:999, textTransform:'uppercase', letterSpacing:'.3px' }}>
              {st.label}
            </span>
          </td>

          {/* Toplam */}
          <td style={{ textAlign:'right', fontFamily:'var(--mono)', color:'var(--acc)', fontWeight:700, fontSize: isRevision ? 12 : 13 }}>
            {total != null ? `${TR(total)} ₺` : '—'}
          </td>

          {/* Daire */}
          <td style={{ textAlign:'right', fontFamily:'var(--mono)', fontSize:12, color:'var(--muted)' }}>
            {flats ?? '—'}
          </td>

          {/* Tarih */}
          <td style={{ color:'var(--muted)', fontSize:11, whiteSpace:'nowrap' }}>
            {new Date(p.created_at).toLocaleDateString('tr-TR')}
          </td>

          {/* Eylemler */}
          <td style={{ paddingRight:10 }}>
            <div style={{ display:'flex', gap:4, flexWrap:'nowrap', justifyContent:'flex-end' }}>
              <button onClick={() => viewProject(p)}
                style={{ background:'var(--acc)', color:'#fff', border:'none', borderRadius:999, padding:'4px 10px', fontSize:11, cursor:'pointer', fontWeight:700, whiteSpace:'nowrap' }}>
                Görüntüle
              </button>
              {!isRevision && (
                <button onClick={() => handleRevision(p)}
                  style={{ background:'var(--bg)', color:'var(--text)', border:'1px solid var(--border)', borderRadius:999, padding:'4px 10px', fontSize:11, cursor:'pointer', whiteSpace:'nowrap' }}
                  title="Bu projeyi temel alarak yeni revizyon başlat">
                  ↻ Revizyon Yap
                </button>
              )}
              {!isRevision && revs.length > 0 && (
                <button onClick={() => setCompareGroup(p.id)}
                  style={{ background:'rgba(99,102,241,0.1)', color:'var(--acc)', border:'1px solid rgba(99,102,241,0.25)', borderRadius:999, padding:'4px 10px', fontSize:11, cursor:'pointer', fontWeight:700, whiteSpace:'nowrap' }}>
                  ⇌ Karşılaştır
                </button>
              )}
              {admin && (
                <button onClick={() => { editProject(p); navigate(`/hesaplama/${p.id}`); }}
                  style={{ background:'var(--warn-bg,#fff8e1)', color:'var(--warn,#b45309)', border:'1px solid var(--warn-b,#fde68a)', borderRadius:999, padding:'4px 10px', fontSize:11, cursor:'pointer', whiteSpace:'nowrap' }}>
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

        {/* Revizyonlar — genişletilmiş */}
        {isExp && revs.map((rev, ri) => (
          <ProjectRow key={rev.id} p={rev} isRevision revIndex={ri} />
        ))}
      </>
    );
  }

  return (
    <div>
      <div style={{ marginBottom:24 }}>
        <h1 style={{ fontSize:22, fontWeight:800, marginBottom:5 }}>Proje Geçmişi</h1>
        <p style={{ color:'var(--muted)', fontSize:13 }}>Kaydedilmiş tüm hesaplamalar ve revizyonlar.</p>
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
              <tr style={{ borderBottom:'1px solid var(--border)' }}>
                <th style={{ textAlign:'left', paddingLeft:14, paddingTop:10, paddingBottom:10 }}>Proje Adı</th>
                <th style={{ textAlign:'left' }}>Durum</th>
                <th style={{ textAlign:'right' }}>Toplam (KDV Dahil)</th>
                <th style={{ textAlign:'right' }}>Daire</th>
                <th style={{ textAlign:'left' }}>Tarih</th>
                <th style={{ textAlign:'right', paddingRight:10 }}>İşlemler</th>
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

      {/* Revizyon karşılaştırma modali — sadece aynı projenin revizyonları */}
      {compareGroup && compareParent && compareChildren.length > 0 && (
        <RevisionCompareModal
          parent={compareParent}
          revisions={compareChildren}
          onClose={() => setCompareGroup(null)}
        />
      )}
    </div>
  );
}
