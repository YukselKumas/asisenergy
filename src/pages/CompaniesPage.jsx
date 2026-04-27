// ── CompaniesPage — Şirket Yönetimi (Süper Admin) ─────────────────────
// Tüm şirketleri listeler, yeni şirket oluşturur, aktif/pasif yapar.

import { useEffect, useState, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { supabase }    from '../lib/supabase.js';
import { showToast }   from '../components/ui/Toast.jsx';
import { useAuthStore } from '../store/authStore.js';

const TR_DATE = d => new Date(d).toLocaleDateString('tr-TR');

function slugify(str) {
  return str
    .toLowerCase()
    .replace(/ş/g,'s').replace(/ğ/g,'g').replace(/ü/g,'u')
    .replace(/ö/g,'o').replace(/ı/g,'i').replace(/ç/g,'c')
    .replace(/\s+/g, '-')
    .replace(/[^a-z0-9-]/g, '');
}

// ── Satır bileşeni ─────────────────────────────────────────────────────
function CompanyRow({ company, onToggle, onSetAdmin, saving }) {
  const [editName,  setEditName]  = useState(false);
  const [nameVal,   setNameVal]   = useState(company.name);
  const [adminEmail, setAdminEmail] = useState('');
  const [showAdmin, setShowAdmin] = useState(false);

  async function saveName() {
    if (!nameVal.trim()) return;
    const { error } = await supabase
      .from('companies')
      .update({ name: nameVal.trim() })
      .eq('id', company.id);
    if (error) showToast('Hata: ' + error.message);
    else { showToast('Şirket adı güncellendi ✓'); setEditName(false); }
  }

  async function assignAdmin(e) {
    e.preventDefault();
    await onSetAdmin(company.id, adminEmail.trim());
    setAdminEmail('');
    setShowAdmin(false);
  }

  const userCount = company.profiles?.[0]?.count ?? company._userCount ?? '—';

  return (
    <>
      <tr style={{ borderBottom: '1px solid var(--border)', transition: 'background .1s' }}
        onMouseEnter={e => e.currentTarget.style.background = 'rgba(0,0,0,0.015)'}
        onMouseLeave={e => e.currentTarget.style.background = ''}>

        {/* Şirket adı */}
        <td style={{ padding: '12px 16px' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
            <div style={{
              width: 34, height: 34, borderRadius: 9, flexShrink: 0,
              background: company.is_active
                ? 'linear-gradient(135deg,#0071e3,#0a84ff)'
                : '#e5e7eb',
              display: 'flex', alignItems: 'center', justifyContent: 'center',
              fontSize: 13, fontWeight: 800, color: '#fff',
            }}>
              {company.name?.[0]?.toUpperCase() ?? '?'}
            </div>
            <div>
              {editName ? (
                <div style={{ display: 'flex', gap: 5, alignItems: 'center' }}>
                  <input
                    value={nameVal} autoFocus
                    onChange={e => setNameVal(e.target.value)}
                    onKeyDown={e => { if (e.key === 'Enter') saveName(); if (e.key === 'Escape') setEditName(false); }}
                    style={{ padding: '3px 8px', borderRadius: 5, border: '1.5px solid var(--acc)', fontSize: 13, outline: 'none', width: 160 }}
                  />
                  <button onClick={saveName} style={{ background: 'var(--acc)', color: '#fff', border: 'none', borderRadius: 5, padding: '3px 8px', fontSize: 11, cursor: 'pointer', fontWeight: 700 }}>✓</button>
                  <button onClick={() => setEditName(false)} style={{ background: 'none', border: 'none', cursor: 'pointer', color: 'var(--muted)', fontSize: 14 }}>✕</button>
                </div>
              ) : (
                <span
                  onClick={() => setEditName(true)}
                  title="Adı değiştirmek için tıkla"
                  style={{ fontWeight: 600, fontSize: 13, cursor: 'pointer', borderBottom: '1px dashed #cbd5e1' }}
                >
                  {company.name}
                </span>
              )}
              <div style={{ fontSize: 11, color: 'var(--muted)', marginTop: 1, fontFamily: 'var(--mono)' }}>
                /{company.slug}
              </div>
            </div>
          </div>
        </td>

        {/* Kullanıcı sayısı */}
        <td style={{ padding: '12px 16px', textAlign: 'center' }}>
          <span style={{ fontSize: 15, fontWeight: 700, color: 'var(--acc)' }}>{userCount}</span>
        </td>

        {/* Oluşturulma */}
        <td style={{ padding: '12px 16px', color: 'var(--muted)', fontSize: 12 }}>
          {TR_DATE(company.created_at)}
        </td>

        {/* Durum */}
        <td style={{ padding: '12px 16px' }}>
          <button
            onClick={() => onToggle(company.id, company.is_active)}
            disabled={saving === company.id}
            style={{
              background: company.is_active ? 'var(--green-bg)' : 'rgba(0,0,0,0.05)',
              color:      company.is_active ? 'var(--green)'    : 'var(--muted)',
              border: `1px solid ${company.is_active ? 'var(--green-b)' : 'var(--border)'}`,
              borderRadius: 6, padding: '3px 10px', fontSize: 11, fontWeight: 700,
              cursor: 'pointer',
            }}
          >
            {company.is_active ? '● Aktif' : '○ Pasif'}
          </button>
        </td>

        {/* Admin ata */}
        <td style={{ padding: '12px 16px' }}>
          <button
            onClick={() => setShowAdmin(v => !v)}
            style={{
              background: 'none', color: 'var(--acc)',
              border: '1.5px solid var(--acc-b)', borderRadius: 6,
              padding: '4px 10px', fontSize: 11, fontWeight: 700, cursor: 'pointer',
            }}
          >
            Admin Ata
          </button>
        </td>
      </tr>

      {/* Admin atama mini-formu */}
      {showAdmin && (
        <tr style={{ background: 'rgba(0,113,227,0.03)', borderBottom: '1px solid var(--border)' }}>
          <td colSpan={5} style={{ padding: '10px 20px 10px 70px' }}>
            <form onSubmit={assignAdmin} style={{ display: 'flex', gap: 8, alignItems: 'center' }}>
              <span style={{ fontSize: 12, color: 'var(--muted)', fontWeight: 500 }}>
                Email ile kullanıcıyı bu şirkete Company Admin olarak ata:
              </span>
              <input
                type="email" required placeholder="kullanici@email.com"
                value={adminEmail}
                onChange={e => setAdminEmail(e.target.value)}
                style={{ padding: '5px 10px', borderRadius: 6, border: '1.5px solid var(--border)', fontSize: 12, fontFamily: 'var(--mono)', outline: 'none', width: 220 }}
              />
              <button type="submit" style={{
                background: 'var(--acc)', color: '#fff', border: 'none',
                borderRadius: 6, padding: '5px 14px', fontSize: 12, fontWeight: 700, cursor: 'pointer',
              }}>Ata</button>
              <button type="button" onClick={() => setShowAdmin(false)} style={{
                background: 'none', border: 'none', color: 'var(--muted)', cursor: 'pointer', fontSize: 13,
              }}>✕</button>
            </form>
          </td>
        </tr>
      )}
    </>
  );
}

// ── Ana bileşen ─────────────────────────────────────────────────────────
export function CompaniesPage() {
  const { profile } = useAuthStore();
  const navigate    = useNavigate();

  const [companies, setCompanies] = useState([]);
  const [loading,   setLoading]   = useState(true);
  const [saving,    setSaving]    = useState(null);
  const [showAdd,   setShowAdd]   = useState(false);
  const [newName,   setNewName]   = useState('');
  const [adding,    setAdding]    = useState(false);

  // Süper admin kontrolü
  useEffect(() => {
    if (profile && profile.role !== 'super_admin') navigate('/');
  }, [profile, navigate]);

  const fetchCompanies = useCallback(async () => {
    setLoading(true);
    const { data, error } = await supabase
      .from('companies')
      .select('*, profiles(count)')
      .order('created_at', { ascending: false });
    if (error) showToast('Şirketler yüklenemedi: ' + error.message);
    else setCompanies(data || []);
    setLoading(false);
  }, []);

  useEffect(() => { fetchCompanies(); }, [fetchCompanies]);

  async function handleAdd(e) {
    e.preventDefault();
    if (!newName.trim()) return;
    setAdding(true);
    const slug = slugify(newName.trim());
    const { error } = await supabase.from('companies').insert({
      name:      newName.trim(),
      slug:      slug || `sirket-${Date.now()}`,
      is_active: true,
    });
    if (error) showToast('Hata: ' + error.message);
    else {
      showToast(`${newName.trim()} oluşturuldu ✓`);
      setNewName('');
      setShowAdd(false);
      await fetchCompanies();
    }
    setAdding(false);
  }

  async function handleToggle(id, current) {
    setSaving(id);
    const { error } = await supabase.from('companies').update({ is_active: !current }).eq('id', id);
    if (error) showToast('Hata: ' + error.message);
    else setCompanies(prev => prev.map(c => c.id === id ? { ...c, is_active: !current } : c));
    setSaving(null);
  }

  async function handleSetAdmin(companyId, email) {
    // Email'e göre kullanıcıyı bul
    const { data: users, error: fetchErr } = await supabase
      .from('profiles')
      .select('id, full_name, email')
      .eq('email', email)
      .limit(1);

    if (fetchErr || !users?.length) {
      showToast('Kullanıcı bulunamadı: ' + email);
      return;
    }

    const user = users[0];
    const { error } = await supabase
      .from('profiles')
      .update({ company_id: companyId, role: 'company_admin' })
      .eq('id', user.id);

    if (error) showToast('Hata: ' + error.message);
    else showToast(`${user.full_name || email} → Company Admin olarak atandı ✓`);
  }

  const stats = {
    total:  companies.length,
    active: companies.filter(c => c.is_active).length,
    users:  companies.reduce((s, c) => s + (c.profiles?.[0]?.count ?? 0), 0),
  };

  return (
    <div>
      {/* Başlık */}
      <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', marginBottom: 24 }}>
        <div>
          <h1 style={{ fontSize: 22, fontWeight: 800, marginBottom: 5 }}>Şirket Yönetimi</h1>
          <p style={{ color: 'var(--muted)', fontSize: 13 }}>
            Platform genelindeki tüm şirketleri yönetin.
          </p>
        </div>
        <button
          onClick={() => { setShowAdd(v => !v); setNewName(''); }}
          style={{
            background: 'linear-gradient(135deg,#0071e3,#0a84ff)', color: '#fff',
            border: 'none', borderRadius: 8, padding: '9px 16px', fontSize: 13,
            fontWeight: 700, cursor: 'pointer', fontFamily: 'var(--sans)',
            boxShadow: '0 2px 8px rgba(0,113,227,.3)', whiteSpace: 'nowrap',
          }}
        >
          + Yeni Şirket
        </button>
      </div>

      {/* Yeni şirket formu */}
      {showAdd && (
        <form onSubmit={handleAdd} style={{
          background: '#fff', border: '1.5px solid var(--acc)', borderRadius: 10,
          padding: '18px 22px', marginBottom: 20,
          boxShadow: '0 2px 12px rgba(0,113,227,.1)',
        }}>
          <div style={{ fontWeight: 700, fontSize: 13, marginBottom: 12, color: 'var(--acc)' }}>
            Yeni Şirket Oluştur
          </div>
          <div style={{ display: 'flex', gap: 10, alignItems: 'flex-end' }}>
            <div style={{ flex: 1 }}>
              <label style={{ display: 'block', fontSize: 11, fontWeight: 700, color: '#64748b', marginBottom: 4 }}>
                Şirket Adı
              </label>
              <input
                type="text" required placeholder="Örn: ABC İnşaat"
                value={newName} onChange={e => setNewName(e.target.value)} autoFocus
                style={{ width: '100%', padding: '8px 10px', borderRadius: 6, border: '1.5px solid var(--border)', fontSize: 13, fontFamily: 'var(--sans)', outline: 'none', boxSizing: 'border-box' }}
              />
              {newName && (
                <div style={{ fontSize: 10, color: 'var(--muted)', marginTop: 3, fontFamily: 'var(--mono)' }}>
                  slug: /{slugify(newName)}
                </div>
              )}
            </div>
            <button type="submit" disabled={adding} style={{
              background: 'var(--acc)', color: '#fff', border: 'none', borderRadius: 6,
              padding: '9px 20px', fontSize: 13, fontWeight: 700,
              cursor: adding ? 'not-allowed' : 'pointer', opacity: adding ? .7 : 1,
            }}>
              {adding ? 'Oluşturuluyor...' : 'Oluştur'}
            </button>
            <button type="button" onClick={() => setShowAdd(false)} style={{
              background: 'none', color: 'var(--muted)', border: '1px solid var(--border)',
              borderRadius: 6, padding: '9px 14px', fontSize: 13, cursor: 'pointer',
            }}>İptal</button>
          </div>
        </form>
      )}

      {/* İstatistik kartları */}
      <div className="kpis" style={{ marginBottom: 20 }}>
        <div className="kpi"><div className="kl">Toplam Şirket</div><div className="kv cacc">{stats.total}</div></div>
        <div className="kpi"><div className="kl">Aktif</div><div className="kv cgreen">{stats.active}</div></div>
        <div className="kpi"><div className="kl">Toplam Kullanıcı</div><div className="kv" style={{ color: 'var(--circ)' }}>{stats.users}</div></div>
      </div>

      {/* Şirket tablosu */}
      <div style={{ background: 'var(--white)', border: '1px solid var(--border)', borderRadius: 'var(--r)', overflow: 'hidden', boxShadow: 'var(--sh)' }}>
        {loading ? (
          <div style={{ padding: 32, textAlign: 'center', color: 'var(--muted)', fontSize: 13 }}>Yükleniyor...</div>
        ) : companies.length === 0 ? (
          <div style={{ padding: 40, textAlign: 'center', color: 'var(--muted)', fontSize: 13 }}>
            Henüz şirket yok.{' '}
            <span onClick={() => setShowAdd(true)} style={{ color: 'var(--acc)', fontWeight: 700, cursor: 'pointer' }}>
              İlk şirketi oluştur →
            </span>
          </div>
        ) : (
          <table style={{ width: '100%', borderCollapse: 'collapse' }}>
            <thead>
              <tr style={{ borderBottom: '2px solid var(--border)', background: 'rgba(0,0,0,0.02)' }}>
                <th style={{ textAlign: 'left', padding: '10px 16px', fontSize: 11, fontWeight: 700, letterSpacing: '.4px', textTransform: 'uppercase', color: 'var(--muted)' }}>Şirket</th>
                <th style={{ textAlign: 'center', padding: '10px 16px', fontSize: 11, fontWeight: 700, letterSpacing: '.4px', textTransform: 'uppercase', color: 'var(--muted)' }}>Kullanıcı</th>
                <th style={{ textAlign: 'left', padding: '10px 16px', fontSize: 11, fontWeight: 700, letterSpacing: '.4px', textTransform: 'uppercase', color: 'var(--muted)' }}>Oluşturulma</th>
                <th style={{ padding: '10px 16px', fontSize: 11, fontWeight: 700, letterSpacing: '.4px', textTransform: 'uppercase', color: 'var(--muted)' }}>Durum</th>
                <th style={{ padding: '10px 16px' }}></th>
              </tr>
            </thead>
            <tbody>
              {companies.map(c => (
                <CompanyRow
                  key={c.id}
                  company={c}
                  onToggle={handleToggle}
                  onSetAdmin={handleSetAdmin}
                  saving={saving}
                />
              ))}
            </tbody>
          </table>
        )}
      </div>
    </div>
  );
}
