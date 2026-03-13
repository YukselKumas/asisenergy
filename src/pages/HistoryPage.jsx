// ── HistoryPage — Kaydedilmiş hesaplamalar listesi ────────────────────

import { useEffect, useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { supabase } from '../lib/supabase.js';
import { useCalculationStore } from '../store/calculationStore.js';
import { Button } from '../components/ui/Button.jsx';

const TR = (x, d=0) => new Intl.NumberFormat('tr-TR', { minimumFractionDigits:d, maximumFractionDigits:d }).format(x);

const STATUS_LABEL = {
  draft:     { label:'Taslak',     color:'var(--warn)' },
  completed: { label:'Tamamlandı', color:'var(--green)' },
  archived:  { label:'Arşiv',      color:'var(--muted)' },
};

export function HistoryPage() {
  const [projects, setProjects] = useState([]);
  const [search,   setSearch]   = useState('');
  const [loading,  setLoading]  = useState(true);
  const { loadProject } = useCalculationStore();
  const navigate = useNavigate();

  useEffect(() => { fetchProjects(); }, []);

  async function fetchProjects() {
    setLoading(true);
    const { data } = await supabase
      .from('projects')
      .select('id,name,building_name,status,created_at,result,config')
      .order('created_at', { ascending: false });
    if (data) setProjects(data);
    setLoading(false);
  }

  async function deleteProject(id) {
    if (!confirm('Bu projeyi silmek istediğinizden emin misiniz?')) return;
    await supabase.from('projects').delete().eq('id', id);
    setProjects(p => p.filter(x => x.id !== id));
  }

  function openProject(project) {
    loadProject(project);
    navigate(`/hesaplama/${project.id}`);
  }

  const filtered = projects.filter(p =>
    p.name.toLowerCase().includes(search.toLowerCase()) ||
    (p.building_name || '').toLowerCase().includes(search.toLowerCase())
  );

  return (
    <div>
      <div style={{ marginBottom:24 }}>
        <h1 style={{ fontSize:22, fontWeight:800, marginBottom:5 }}>Proje Geçmişi</h1>
        <p style={{ color:'var(--muted)', fontSize:13 }}>Kaydedilmiş tüm hesaplamalar.</p>
      </div>

      {/* Arama */}
      <div style={{ display:'flex', gap:10, marginBottom:16 }}>
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
        ) : filtered.length === 0 ? (
          <div style={{ padding:32, textAlign:'center', color:'var(--muted)', fontSize:13 }}>
            {search ? `"${search}" ile eşleşen proje bulunamadı.` : 'Henüz proje yok.'}
          </div>
        ) : (
          <table>
            <thead>
              <tr>
                <th>Proje Adı</th>
                <th>Bina</th>
                <th>Durum</th>
                <th style={{ textAlign:'right' }}>Toplam (KDV Dahil)</th>
                <th style={{ textAlign:'right' }}>Daire</th>
                <th>Tarih</th>
                <th></th>
              </tr>
            </thead>
            <tbody>
              {filtered.map(p => {
                const total = p.result?.grandTotal;
                const flats = p.result?.totalFlats;
                const st    = STATUS_LABEL[p.status] || STATUS_LABEL.draft;
                return (
                  <tr key={p.id}>
                    <td style={{ fontWeight:600 }}>{p.name}</td>
                    <td style={{ color:'var(--muted)', fontSize:12 }}>{p.building_name || '—'}</td>
                    <td>
                      <span style={{ background:'rgba(0,0,0,0.05)', color:st.color, fontWeight:700, fontSize:10, padding:'2px 7px', borderRadius:999, textTransform:'uppercase', letterSpacing:'.3px' }}>
                        {st.label}
                      </span>
                    </td>
                    <td style={{ textAlign:'right', fontFamily:'var(--mono)', color:'var(--acc)', fontWeight:700 }}>
                      {total ? `${TR(total)} ₺` : '—'}
                    </td>
                    <td style={{ textAlign:'right', fontFamily:'var(--mono)' }}>
                      {flats ?? '—'}
                    </td>
                    <td style={{ color:'var(--muted)', fontSize:11 }}>
                      {new Date(p.created_at).toLocaleDateString('tr-TR')}
                    </td>
                    <td>
                      <div style={{ display:'flex', gap:6 }}>
                        <button onClick={() => openProject(p)}
                          style={{ background:'var(--acc)', color:'#fff', border:'none', borderRadius:5, padding:'4px 10px', fontSize:11, cursor:'pointer', fontWeight:700 }}>
                          Aç
                        </button>
                        <button onClick={() => deleteProject(p.id)}
                          style={{ background:'var(--bg)', color:'var(--red)', border:'1px solid var(--border)', borderRadius:5, padding:'4px 10px', fontSize:11, cursor:'pointer' }}>
                          Sil
                        </button>
                      </div>
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
