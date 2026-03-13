// ── Dashboard — Ana sayfa ─────────────────────────────────────────────
// Son projeler, istatistikler ve hızlı erişim kartları.

import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { supabase } from '../lib/supabase.js';
import { useAuthStore } from '../store/authStore.js';
import { useCalculationStore } from '../store/calculationStore.js';

const TR = (x, d=0) => new Intl.NumberFormat('tr-TR', { minimumFractionDigits:d, maximumFractionDigits:d }).format(x);

export function DashboardPage() {
  const { profile } = useAuthStore();
  const { newCalculation } = useCalculationStore();
  const [projects, setProjects] = useState([]);
  const [stats,    setStats]    = useState({ total:0, completed:0 });
  const [loading,  setLoading]  = useState(true);

  useEffect(() => {
    fetchData();
  }, []);

  async function fetchData() {
    setLoading(true);
    const { data } = await supabase
      .from('projects')
      .select('id,name,building_name,status,created_at,result')
      .order('created_at', { ascending: false })
      .limit(8);

    if (data) {
      setProjects(data);
      setStats({
        total:     data.length,
        completed: data.filter(p => p.status === 'completed').length,
      });
    }
    setLoading(false);
  }

  const STATUS_LABEL = {
    draft:     { label:'Taslak',     color:'var(--warn)' },
    completed: { label:'Tamamlandı', color:'var(--green)' },
    archived:  { label:'Arşiv',      color:'var(--muted)' },
  };

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
          <Link to="/gecmis" style={{ fontSize:12, color:'var(--acc)', textDecoration:'none', fontWeight:600 }}>
            Tümünü Gör →
          </Link>
        </div>

        {loading ? (
          <div style={{ padding:24, textAlign:'center', color:'var(--muted)', fontSize:12 }}>Yükleniyor...</div>
        ) : projects.length === 0 ? (
          <div style={{ padding:32, textAlign:'center', color:'var(--muted)', fontSize:13 }}>
            Henüz proje yok.{' '}
            <Link to="/hesaplama/yeni" onClick={newCalculation} style={{ color:'var(--acc)', fontWeight:700 }}>
              İlk hesaplamayı başlat →
            </Link>
          </div>
        ) : (
          <table>
            <thead>
              <tr>
                <th>Proje Adı</th>
                <th>Durum</th>
                <th style={{ textAlign:'right' }}>Toplam (KDV Dahil)</th>
                <th>Tarih</th>
                <th></th>
              </tr>
            </thead>
            <tbody>
              {projects.map(p => {
                const total = p.result?.grandTotal;
                const st    = STATUS_LABEL[p.status] || STATUS_LABEL.draft;
                return (
                  <tr key={p.id}>
                    <td style={{ fontWeight:600 }}>
                      {p.name}
                      {p.building_name && <span style={{ color:'var(--muted)', fontSize:11, marginLeft:6 }}>{p.building_name}</span>}
                    </td>
                    <td>
                      <span style={{ background:'rgba(0,0,0,0.05)', color:st.color, fontWeight:700, fontSize:10, padding:'2px 7px', borderRadius:999, textTransform:'uppercase', letterSpacing:'.3px' }}>
                        {st.label}
                      </span>
                    </td>
                    <td style={{ textAlign:'right', fontFamily:'var(--mono)', color:'var(--acc)', fontWeight:700 }}>
                      {total ? `${TR(total)} ₺` : '—'}
                    </td>
                    <td style={{ color:'var(--muted)', fontSize:11 }}>
                      {new Date(p.created_at).toLocaleDateString('tr-TR')}
                    </td>
                    <td>
                      <Link to={`/hesaplama/${p.id}`} style={{ color:'var(--acc)', fontSize:12, textDecoration:'none', fontWeight:600 }}>
                        Aç →
                      </Link>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        )}
      </div>
    </div>
  );
}
