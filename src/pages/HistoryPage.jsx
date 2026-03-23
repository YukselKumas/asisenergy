// ── HistoryPage — Kaydedilmiş hesaplamalar listesi ────────────────────

import { useEffect, useState, useMemo, useCallback } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { supabase } from '../lib/supabase.js';
import { useCalculationStore } from '../store/calculationStore.js';
import { useAuthStore }        from '../store/authStore.js';
import { Button } from '../components/ui/Button.jsx';

const TR  = (x, d=0) => new Intl.NumberFormat('tr-TR', { minimumFractionDigits:d, maximumFractionDigits:d }).format(x ?? 0);
const withTimeout = (p, ms) => Promise.race([p, new Promise((_, r) => setTimeout(() => r(new Error('Bağlantı zaman aşımı')), ms))]);
const PCT = (a, b)   => b ? `${(((a - b) / b) * 100).toFixed(1)}%` : '—';

const STATUS_LABEL = {
  draft:     { label:'Taslak',     color:'var(--warn)' },
  completed: { label:'Tamamlandı', color:'var(--green)' },
  archived:  { label:'Arşiv',      color:'var(--muted)' },
};

// ── Karşılaştırma Paneli ────────────────────────────────────────────
function ComparePanel({ items, onClose }) {
  if (items.length !== 2) return null;
  const [a, b] = items;

  function row(label, va, vb, format = TR) {
    const fa = format(va), fb = format(vb);
    const diff = typeof va === 'number' && typeof vb === 'number' ? va - vb : null;
    return (
      <tr>
        <td style={{ fontWeight: 600, color: 'var(--muted)', fontSize: 12, paddingRight: 12, whiteSpace: 'nowrap' }}>{label}</td>
        <td style={{ fontFamily: 'var(--mono)', textAlign: 'right', fontSize: 13 }}>{fa}</td>
        <td style={{ fontFamily: 'var(--mono)', textAlign: 'right', fontSize: 13 }}>{fb}</td>
        <td style={{ textAlign: 'right', fontSize: 11, fontWeight: 700,
          color: diff === null ? 'var(--muted)' : diff < 0 ? 'var(--green)' : diff > 0 ? 'var(--red)' : 'var(--muted)' }}>
          {diff === null ? '—' : diff === 0 ? '=' : (diff > 0 ? '+' : '') + TR(diff)}
        </td>
      </tr>
    );
  }

  const totA = a.result?.grandTotal,  totB = b.result?.grandTotal;
  const netA = a.result?.grandNet,     netB = b.result?.grandNet;
  const pipeA = a.result?.totalPipe,  pipeB = b.result?.totalPipe;
  const flA  = a.result?.totalFlats,  flB  = b.result?.totalFlats;

  return (
    <div style={{
      position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.45)', zIndex: 1000,
      display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 24,
    }}
      onClick={onClose}
    >
      <div
        onClick={e => e.stopPropagation()}
        style={{
          background: 'var(--white)', borderRadius: 'var(--r)', boxShadow: '0 8px 40px rgba(0,0,0,0.18)',
          padding: 28, maxWidth: 640, width: '100%', maxHeight: '90vh', overflowY: 'auto',
        }}
      >
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 20 }}>
          <div style={{ fontSize: 16, fontWeight: 800 }}>Revizyon Karşılaştırması</div>
          <button onClick={onClose} style={{ background: 'none', border: 'none', cursor: 'pointer', fontSize: 20, color: 'var(--muted)', lineHeight: 1 }}>×</button>
        </div>

        <table style={{ width: '100%', borderCollapse: 'collapse' }}>
          <thead>
            <tr>
              <th style={{ textAlign: 'left', fontSize: 11, color: 'var(--muted)', paddingBottom: 10, fontWeight: 700, textTransform: 'uppercase', letterSpacing: '.4px' }}>Metrik</th>
              <th style={{ textAlign: 'right', fontSize: 12, paddingBottom: 10, maxWidth: 160 }}>
                <div style={{ fontWeight: 700, color: 'var(--acc)' }}>{a.name}</div>
                <div style={{ fontSize: 10, color: 'var(--muted)', fontWeight: 400 }}>{new Date(a.created_at).toLocaleDateString('tr-TR')}</div>
              </th>
              <th style={{ textAlign: 'right', fontSize: 12, paddingBottom: 10, maxWidth: 160 }}>
                <div style={{ fontWeight: 700 }}>{b.name}</div>
                <div style={{ fontSize: 10, color: 'var(--muted)', fontWeight: 400 }}>{new Date(b.created_at).toLocaleDateString('tr-TR')}</div>
              </th>
              <th style={{ textAlign: 'right', fontSize: 11, color: 'var(--muted)', paddingBottom: 10, fontWeight: 700, textTransform: 'uppercase', letterSpacing: '.4px' }}>Fark (A−B)</th>
            </tr>
          </thead>
          <tbody>
            {[
              ['Toplam (KDV Dahil)', totA,  totB,  v => v != null ? `${TR(v)} ₺` : '—'],
              ['Toplam (KDV Hariç)', netA,  netB,  v => v != null ? `${TR(v)} ₺` : '—'],
              ['Toplam Boru (m)',    pipeA, pipeB, v => v != null ? `${TR(v, 1)} m` : '—'],
              ['Toplam Daire',       flA,   flB,   v => v != null ? TR(v) : '—'],
            ].map(([label, va, vb, fmt]) => (
              <tr key={label} style={{ borderTop: '1px solid var(--border)' }}>
                <td style={{ fontWeight: 600, color: 'var(--muted)', fontSize: 12, paddingRight: 12, whiteSpace: 'nowrap', padding: '8px 12px 8px 0' }}>{label}</td>
                <td style={{ fontFamily: 'var(--mono)', textAlign: 'right', fontSize: 13, padding: '8px 8px' }}>{fmt(va)}</td>
                <td style={{ fontFamily: 'var(--mono)', textAlign: 'right', fontSize: 13, padding: '8px 8px' }}>{fmt(vb)}</td>
                <td style={{ textAlign: 'right', fontSize: 11, fontWeight: 700, padding: '8px 0 8px 8px',
                  color: (typeof va === 'number' && typeof vb === 'number')
                    ? (va - vb < 0 ? 'var(--green)' : va - vb > 0 ? 'var(--red)' : 'var(--muted)')
                    : 'var(--muted)'
                }}>
                  {(typeof va === 'number' && typeof vb === 'number')
                    ? (va - vb === 0 ? '=' : `${va - vb > 0 ? '+' : ''}${TR(va - vb)}`)
                    : '—'}
                </td>
              </tr>
            ))}
          </tbody>
        </table>

        {totA != null && totB != null && (
          <div style={{ marginTop: 16, padding: '10px 14px', background: 'var(--bg)', borderRadius: 'var(--r2)', fontSize: 12, color: 'var(--muted)' }}>
            {totA < totB
              ? <><strong style={{ color: 'var(--green)' }}>{a.name}</strong> bu teklifte <strong style={{ color: 'var(--green)' }}>{TR(totB - totA)} ₺ (%{Math.abs(((totA - totB) / totB) * 100).toFixed(1)}) daha ucuz.</strong></>
              : totA > totB
              ? <><strong style={{ color: 'var(--green)' }}>{b.name}</strong> bu teklifte <strong style={{ color: 'var(--green)' }}>{TR(totA - totB)} ₺ (%{Math.abs(((totB - totA) / totA) * 100).toFixed(1)}) daha ucuz.</strong></>
              : 'İki teklif eşit toplama sahip.'}
          </div>
        )}

        <div style={{ marginTop: 18, textAlign: 'right' }}>
          <Button variant="default" onClick={onClose}>Kapat</Button>
        </div>
      </div>
    </div>
  );
}

// ── Ana bileşen ─────────────────────────────────────────────────────
export function HistoryPage() {
  const [projects,    setProjects]    = useState([]);
  const [search,      setSearch]      = useState('');
  const [loading,     setLoading]     = useState(true);
  const [fetchError,  setFetchError]  = useState(null);
  const [expanded,    setExpanded]    = useState({});   // parentId → bool (undefined = açık)
  const [selected,    setSelected]    = useState([]);   // max 2 items for comparison
  const [compareOpen, setCompareOpen] = useState(false);

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
    setSelected(s => s.filter(x => x.id !== id));
  }

  function viewProject(project) {
    loadProject(project);
    navigate(`/hesaplama/${project.id}`);
  }

  function handleRevision(project) {
    const revCount = (childrenOf[project.id] || []).length;
    startRevision(project, revCount + 1);
    navigate('/hesaplama/yeni');
  }

  function toggleSelect(project) {
    setSelected(prev => {
      const exists = prev.find(x => x.id === project.id);
      if (exists) return prev.filter(x => x.id !== project.id);
      if (prev.length >= 2) return [prev[1], project]; // replace oldest
      return [...prev, project];
    });
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

  const filteredRoots = roots.filter(p =>
    p.name.toLowerCase().includes(search.toLowerCase()) ||
    (p.building_name || '').toLowerCase().includes(search.toLowerCase())
  );

  const isSelected = (id) => selected.some(x => x.id === id);

  function ProjectRow({ p, isRevision = false, revIndex = 0 }) {
    const revs = childrenOf[p.id] || [];
    const isExp = expanded[p.id] ?? true; // varsayılan açık
    const total = p.result?.grandTotal;
    const flats = p.result?.totalFlats;
    const st    = STATUS_LABEL[p.status] || STATUS_LABEL.draft;
    const sel   = isSelected(p.id);
    const revLabel = `R${revIndex + 1}`;

    return (
      <>
        <tr style={{
          background: isRevision ? 'rgba(99,102,241,0.04)' : undefined,
          borderLeft: isRevision ? '3px solid var(--acc)' : undefined,
        }}>
          {/* Seçim kutusu */}
          <td style={{ width: 36, textAlign: 'center', paddingLeft: isRevision ? 32 : 8 }}>
            <input
              type="checkbox"
              checked={sel}
              onChange={() => toggleSelect(p)}
              style={{ cursor: 'pointer', accentColor: 'var(--acc)' }}
            />
          </td>

          {/* Proje adı */}
          <td>
            <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
              {isRevision && (
                <span style={{ color:'var(--acc)', fontSize:11, fontWeight:800, background:'rgba(99,102,241,0.1)', borderRadius:999, padding:'1px 7px', flexShrink:0 }}>
                  {revLabel}
                </span>
              )}
              {!isRevision && revs.length > 0 && (
                <button
                  onClick={() => setExpanded(e => ({ ...e, [p.id]: !e[p.id] }))}
                  style={{ background: 'none', border: 'none', cursor: 'pointer', fontSize: 12, color: 'var(--acc)', padding: '0 2px', lineHeight: 1 }}
                  title={isExp ? 'Revizyonları gizle' : 'Revizyonları göster'}
                >
                  {isExp ? '▾' : '▸'}
                </button>
              )}
              <span style={{ fontWeight: 600, fontSize: isRevision ? 12 : 13 }}>{p.name}</span>
              {!isRevision && revs.length > 0 && (
                <span style={{ fontSize: 10, background: 'var(--acc)', color: '#fff', borderRadius: 999, padding: '1px 6px', fontWeight: 700 }}>
                  {revs.length} rev
                </span>
              )}
            </div>
            {p.building_name && (
              <div style={{ fontSize: 11, color: 'var(--muted)', marginTop: 1, paddingLeft: isRevision ? 0 : 0 }}>{p.building_name}</div>
            )}
          </td>

          {/* Durum */}
          <td>
            <span style={{ background: 'rgba(0,0,0,0.05)', color: st.color, fontWeight: 700, fontSize: 10, padding: '2px 7px', borderRadius: 999, textTransform: 'uppercase', letterSpacing: '.3px' }}>
              {st.label}
            </span>
          </td>

          {/* Toplam */}
          <td style={{ textAlign: 'right', fontFamily: 'var(--mono)', color: 'var(--acc)', fontWeight: 700, fontSize: isRevision ? 12 : 13 }}>
            {total != null ? `${TR(total)} ₺` : '—'}
          </td>

          {/* Daire */}
          <td style={{ textAlign: 'right', fontFamily: 'var(--mono)', fontSize: 12 }}>
            {flats ?? '—'}
          </td>

          {/* Tarih */}
          <td style={{ color: 'var(--muted)', fontSize: 11, whiteSpace: 'nowrap' }}>
            {new Date(p.created_at).toLocaleDateString('tr-TR')}
          </td>

          {/* Eylemler */}
          <td>
            <div style={{ display: 'flex', gap: 5, flexWrap: 'nowrap' }}>
              <button
                onClick={() => viewProject(p)}
                style={{ background: 'var(--acc)', color: '#fff', border: 'none', borderRadius: 999, padding: '4px 10px', fontSize: 11, cursor: 'pointer', fontWeight: 700, whiteSpace: 'nowrap' }}
              >
                Görüntüle
              </button>
              <button
                onClick={() => handleRevision(p)}
                style={{ background: 'var(--bg)', color: 'var(--text)', border: '1px solid var(--border)', borderRadius: 999, padding: '4px 10px', fontSize: 11, cursor: 'pointer', whiteSpace: 'nowrap' }}
                title="Bu projeyi temel alarak yeni revizyon başlat"
              >
                ↻ Revizyon Yap
              </button>
              {admin && (
                <button
                  onClick={() => { editProject(p); navigate(`/hesaplama/${p.id}`); }}
                  style={{ background: 'var(--warn-bg, #fff8e1)', color: 'var(--warn, #b45309)', border: '1px solid var(--warn-b, #fde68a)', borderRadius: 999, padding: '4px 10px', fontSize: 11, cursor: 'pointer', whiteSpace: 'nowrap' }}
                  title="Projeyi düzenle (Admin)"
                >
                  ✏ Düzenle
                </button>
              )}
              {admin && (
                <button
                  onClick={() => deleteProject(p.id)}
                  style={{ background: 'var(--bg)', color: 'var(--red)', border: '1px solid var(--border)', borderRadius: 999, padding: '4px 10px', fontSize: 11, cursor: 'pointer' }}
                >
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
      <div style={{ marginBottom: 24 }}>
        <h1 style={{ fontSize: 22, fontWeight: 800, marginBottom: 5 }}>Proje Geçmişi</h1>
        <p style={{ color: 'var(--muted)', fontSize: 13 }}>Kaydedilmiş tüm hesaplamalar ve revizyonlar.</p>
      </div>

      {/* Araç çubuğu */}
      <div style={{ display: 'flex', gap: 10, marginBottom: 16, flexWrap: 'wrap', alignItems: 'center' }}>
        <input
          type="text" value={search} onChange={e => setSearch(e.target.value)}
          placeholder="Proje adı veya bina ile ara..."
          style={{ flex: 1, maxWidth: 360, background: 'var(--white)', border: '1px solid var(--border2)', borderRadius: 'var(--r2)', padding: '9px 12px', fontSize: 13, outline: 'none', fontFamily: 'var(--sans)' }}
        />

        {selected.length === 2 && (
          <Button variant="primary" onClick={() => setCompareOpen(true)}>
            ⇌ Karşılaştır ({selected[0].name} vs {selected[1].name})
          </Button>
        )}
        {selected.length === 1 && (
          <div style={{ fontSize: 12, color: 'var(--muted)', fontStyle: 'italic' }}>
            Karşılaştırma için 1 proje daha seçin
          </div>
        )}

        <Link to="/hesaplama/yeni">
          <Button variant="primary">＋ Yeni Hesaplama</Button>
        </Link>
      </div>

      {/* Tablo */}
      <div style={{ background: 'var(--white)', border: '1px solid var(--border)', borderRadius: 'var(--r)', overflow: 'hidden', boxShadow: 'var(--sh)' }}>
        {loading ? (
          <div style={{ padding: 32, textAlign: 'center', color: 'var(--muted)', fontSize: 12 }}>Yükleniyor...</div>
        ) : fetchError ? (
          <div style={{ padding: 32, textAlign: 'center' }}>
            <div style={{ color: 'var(--red)', fontSize: 13, marginBottom: 10 }}>{fetchError}</div>
            <button onClick={fetchProjects} style={{ background: 'var(--acc)', color: '#fff', border: 'none', borderRadius: 999, padding: '7px 18px', fontSize: 12, cursor: 'pointer', fontWeight: 700 }}>↻ Tekrar Dene</button>
          </div>
        ) : filteredRoots.length === 0 ? (
          <div style={{ padding: 32, textAlign: 'center', color: 'var(--muted)', fontSize: 13 }}>
            {search ? `"${search}" ile eşleşen proje bulunamadı.` : 'Henüz proje yok.'}
          </div>
        ) : (
          <table style={{ width: '100%', borderCollapse: 'collapse' }}>
            <thead>
              <tr>
                <th style={{ width: 36 }}></th>
                <th style={{ textAlign: 'left' }}>Proje Adı</th>
                <th style={{ textAlign: 'left' }}>Durum</th>
                <th style={{ textAlign: 'right' }}>Toplam (KDV Dahil)</th>
                <th style={{ textAlign: 'right' }}>Daire</th>
                <th style={{ textAlign: 'left' }}>Tarih</th>
                <th style={{ textAlign: 'left' }}>İşlemler</th>
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

      {/* Admin notu */}
      {!admin && (
        <div style={{ marginTop: 12, fontSize: 11, color: 'var(--muted)', fontStyle: 'italic' }}>
          Düzenleme ve silme işlemleri yalnızca yöneticiler tarafından yapılabilir.
        </div>
      )}

      {/* Karşılaştırma modalı */}
      {compareOpen && selected.length === 2 && (
        <ComparePanel items={selected} onClose={() => setCompareOpen(false)} />
      )}
    </div>
  );
}
