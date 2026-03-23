// ── Dashboard — Ana sayfa ─────────────────────────────────────────────
// Son projeler, istatistikler ve hızlı erişim kartları.

import { useEffect, useState, useCallback, useMemo } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { supabase } from '../lib/supabase.js';
import { useAuthStore } from '../store/authStore.js';
import { useCalculationStore } from '../store/calculationStore.js';

const TR = (x, d=0) => new Intl.NumberFormat('tr-TR', { minimumFractionDigits:d, maximumFractionDigits:d }).format(x);

const withTimeout = (p, ms) => Promise.race([
  p,
  new Promise((_, rej) => setTimeout(() => rej(new Error('Bağlantı zaman aşımı')), ms)),
]);

const STATUS_LABEL = {
  draft:     { label:'Taslak',     color:'var(--warn)' },
  completed: { label:'Tamamlandı', color:'var(--green)' },
  archived:  { label:'Arşiv',      color:'var(--muted)' },
};

export function DashboardPage() {
  const { profile } = useAuthStore();
  const { newCalculation, loadProject } = useCalculationStore();
  const navigate = useNavigate();

  const [projects, setProjects] = useState([]);
  const [loading,  setLoading]  = useState(true);
  const [error,    setError]    = useState(null);
  const [expanded, setExpanded] = useState({});   // parentId → bool

  const fetchData = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const { data, error: err } = await withTimeout(
        supabase
          .from('projects')
          .select('id,name,building_name,status,created_at,result,parent_project_id')
          .order('created_at', { ascending: false })
          .limit(40),
        10000
      );
      if (err) throw err;
      setProjects(data || []);
    } catch (err) {
      setError(err.message || 'Projeler yüklenemedi');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { fetchData(); }, [fetchData]);

  // Kök projeler + çocuklar
  const { roots, childrenOf } = useMemo(() => {
    const roots = [], childrenOf = {};
    projects.forEach(p => {
      if (!p.parent_project_id) roots.push(p);
      else (childrenOf[p.parent_project_id] ??= []).push(p);
    });
    return { roots, childrenOf };
  }, [projects]);

  const stats = useMemo(() => ({
    total:     roots.length,
    completed: roots.filter(p => p.status === 'completed').length,
  }), [roots]);

  function toggleExpand(id) {
    setExpanded(e => ({ ...e, [id]: !(e[id] ?? false) }));
  }

  function openProject(p) {
    loadProject(p);
    navigate(`/hesaplama/${p.id}`);
  }

  function ProjectRow({ p, isRevision = false, revIndex = 0 }) {
    const revs  = childrenOf[p.id] || [];
    const isExp = expanded[p.id] ?? false;
    const total = p.result?.grandTotal;
    const st    = STATUS_LABEL[p.status] || STATUS_LABEL.draft;

    return (
      <>
        <tr
          style={{
            background:   isRevision ? 'rgba(99,102,241,0.04)' : undefined,
            borderLeft:   isRevision ? '3px solid var(--acc)' : '3px solid transparent',
            cursor:       'default',
            transition:   'background .12s',
          }}
        >
          {/* Proje adı */}
          <td style={{ paddingLeft: isRevision ? 28 : 10, paddingTop:10, paddingBottom:10 }}>
            <div style={{ display:'flex', alignItems:'center', gap:6 }}>
              {/* Revizyon rozeti */}
              {isRevision && (
                <span style={{ fontSize:10, fontWeight:800, background:'var(--acc)', color:'#fff', borderRadius:999, padding:'2px 7px', flexShrink:0 }}>
                  R{revIndex + 1}
                </span>
              )}
              {/* Açma/kapama düğmesi */}
              {!isRevision && revs.length > 0 && (
                <button
                  onClick={() => toggleExpand(p.id)}
                  style={{ background:'none', border:'none', cursor:'pointer', fontSize:13, color:'var(--acc)', padding:'0 1px', lineHeight:1, flexShrink:0 }}
                  title={isExp ? 'Varyasyonları gizle' : 'Varyasyonları göster'}
                >
                  {isExp ? '▾' : '▸'}
                </button>
              )}
              {!isRevision && revs.length === 0 && (
                <span style={{ display:'inline-block', width:16 }} />
              )}
              <span style={{ fontWeight:600, fontSize: isRevision ? 12 : 13 }}>{p.name}</span>
              {/* Varyasyon sayısı rozeti */}
              {!isRevision && revs.length > 0 && (
                <span style={{ fontSize:10, background:'rgba(99,102,241,0.12)', color:'var(--acc)', borderRadius:999, padding:'1px 7px', fontWeight:800, flexShrink:0 }}>
                  {revs.length} varyasyon
                </span>
              )}
            </div>
            {p.building_name && (
              <div style={{ fontSize:11, color:'var(--muted)', marginTop:1, paddingLeft: isRevision ? 0 : 22 }}>
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
          <td style={{ textAlign:'right', fontFamily:'var(--mono)', color:'var(--acc)', fontWeight:700, fontSize: isRevision ? 12 : 13 }}>
            {total != null ? `${TR(total)} ₺` : '—'}
          </td>

          {/* Tarih */}
          <td style={{ color:'var(--muted)', fontSize:11, whiteSpace:'nowrap' }}>
            {new Date(p.created_at).toLocaleDateString('tr-TR')}
          </td>

          {/* Aç linki */}
          <td style={{ paddingRight:8 }}>
            <button
              onClick={() => openProject(p)}
              style={{ background:'none', border:'none', color:'var(--acc)', fontSize:12, cursor:'pointer', fontWeight:600, padding:'3px 6px' }}
            >
              Aç →
            </button>
          </td>
        </tr>

        {/* Varyasyonlar — açıksa göster */}
        {isExp && revs.map((rev, ri) => (
          <ProjectRow key={rev.id} p={rev} isRevision revIndex={ri} />
        ))}
      </>
    );
  }

  return (
    <div>
      {/* Başlık */}
      <div style={{ marginBottom:28 }}>
        <h1 style={{ fontSize:22, fontWeight:800, letterSpacing:'-.3px', marginBottom:5 }}>
          Merhaba, <span style={{ color:'var(--acc)' }}>{profile?.name || 'Kullanıcı'}</span>
        </h1>
        <p style={{ color:'var(--muted)', fontSize:13 }}>
          PPR metraj hesaplama sistemine hoş geldiniz.
        </p>
      </div>

      {/* İstatistik kartları */}
      <div className="kpis" style={{ marginBottom:24 }}>
        <div className="kpi">
          <div className="kl">Toplam Proje</div>
          <div className="kv cacc">{stats.total}</div>
        </div>
        <div className="kpi">
          <div className="kl">Tamamlanan</div>
          <div className="kv cgreen">{stats.completed}</div>
        </div>
        <div className="kpi" style={{ borderTop:'3px solid var(--acc)' }}>
          <div className="kl">Yeni Hesaplama</div>
          <div style={{ marginTop:8 }}>
            <Link
              to="/hesaplama/yeni"
              onClick={newCalculation}
              style={{
                display:'inline-flex', alignItems:'center', gap:6,
                background:'var(--acc)', color:'#fff',
                padding:'9px 16px', borderRadius:'var(--r2)',
                textDecoration:'none', fontSize:13, fontWeight:700,
              }}
            >
              ＋ Yeni Hesaplama
            </Link>
          </div>
        </div>
      </div>

      {/* Son projeler */}
      <div style={{ background:'var(--white)', border:'1px solid var(--border)', borderRadius:'var(--r)', overflow:'hidden', boxShadow:'var(--sh)' }}>
        <div style={{ padding:'14px 18px', borderBottom:'1px solid var(--border)', display:'flex', justifyContent:'space-between', alignItems:'center' }}>
          <div style={{ fontSize:12, fontWeight:800, letterSpacing:'.5px', textTransform:'uppercase', color:'var(--muted)' }}>
            Son Projeler
          </div>
          <div style={{ display:'flex', gap:10, alignItems:'center' }}>
            <button
              onClick={fetchData}
              disabled={loading}
              title="Yenile"
              style={{ background:'none', border:'none', cursor: loading ? 'default' : 'pointer', color:'var(--muted)', fontSize:14, padding:'2px 6px', borderRadius:4, opacity: loading ? .4 : 1 }}
            >
              ↻
            </button>
            <Link to="/gecmis" style={{ fontSize:12, color:'var(--acc)', textDecoration:'none', fontWeight:600 }}>
              Tümünü Gör →
            </Link>
          </div>
        </div>

        {loading ? (
          <div style={{ padding:24, textAlign:'center', color:'var(--muted)', fontSize:12 }}>Yükleniyor...</div>
        ) : error ? (
          <div style={{ padding:24, textAlign:'center' }}>
            <div style={{ color:'var(--red)', fontSize:13, marginBottom:10 }}>{error}</div>
            <button
              onClick={fetchData}
              style={{ background:'var(--acc)', color:'#fff', border:'none', borderRadius:999, padding:'7px 18px', fontSize:12, cursor:'pointer', fontWeight:700 }}
            >
              ↻ Tekrar Dene
            </button>
          </div>
        ) : roots.length === 0 ? (
          <div style={{ padding:32, textAlign:'center', color:'var(--muted)', fontSize:13 }}>
            Henüz proje yok.{' '}
            <Link to="/hesaplama/yeni" onClick={newCalculation} style={{ color:'var(--acc)', fontWeight:700 }}>
              İlk hesaplamayı başlat →
            </Link>
          </div>
        ) : (
          <table style={{ width:'100%', borderCollapse:'collapse' }}>
            <thead>
              <tr style={{ borderBottom:'1px solid var(--border)' }}>
                <th style={{ textAlign:'left', paddingLeft:10, paddingTop:10, paddingBottom:10 }}>Proje Adı</th>
                <th style={{ textAlign:'left' }}>Durum</th>
                <th style={{ textAlign:'right' }}>Toplam (KDV Dahil)</th>
                <th style={{ textAlign:'left' }}>Tarih</th>
                <th></th>
              </tr>
            </thead>
            <tbody>
              {roots.map(p => (
                <ProjectRow key={p.id} p={p} />
              ))}
            </tbody>
          </table>
        )}
      </div>
    </div>
  );
}
