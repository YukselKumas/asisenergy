// ── UsersPage — Kullanıcı Yönetimi (Admin) ────────────────────────────
import { useEffect, useState } from 'react';
import { supabase } from '../lib/supabase.js';
import { showToast } from '../components/ui/Toast.jsx';

const TR_DATE = d => new Date(d).toLocaleDateString('tr-TR');

export function UsersPage() {
  const [users,       setUsers]       = useState([]);
  const [loading,     setLoading]     = useState(true);
  const [saving,      setSaving]      = useState(null);   // userId
  // emailEdit: { [userId]: string } — inline email düzenleme
  const [emailEdit,   setEmailEdit]   = useState({});
  const [resetLoading, setResetLoading] = useState(null); // userId

  useEffect(() => { fetchUsers(); }, []);

  async function fetchUsers() {
    setLoading(true);
    const { data, error } = await supabase
      .from('profiles')
      .select('*')
      .order('created_at', { ascending: false });
    if (error) showToast('Kullanıcılar yüklenemedi: ' + error.message);
    else setUsers(data || []);
    setLoading(false);
  }

  async function updateProfile(userId, patch) {
    setSaving(userId);
    const { error } = await supabase
      .from('profiles')
      .update(patch)
      .eq('id', userId);
    if (error) showToast('Hata: ' + error.message);
    else {
      setUsers(prev => prev.map(u => u.id === userId ? { ...u, ...patch } : u));
      showToast('Güncellendi ✓');
    }
    setSaving(null);
  }

  async function saveEmail(userId) {
    const email = (emailEdit[userId] || '').trim();
    if (!email || !email.includes('@')) {
      showToast('Geçerli bir email girin');
      return;
    }
    await updateProfile(userId, { email });
    setEmailEdit(prev => { const n = { ...prev }; delete n[userId]; return n; });
  }

  async function sendPasswordReset(userId, email) {
    setResetLoading(userId);
    const { error } = await supabase.auth.resetPasswordForEmail(email, {
      redirectTo: window.location.origin + '/reset-password',
    });
    if (error) showToast('Hata: ' + error.message);
    else showToast(`Şifre sıfırlama maili gönderildi → ${email}`);
    setResetLoading(null);
  }

  const roleColor = r => r === 'admin'
    ? { background: '#eef2ff', color: '#4f46e5', border: '1px solid #c7d2fe' }
    : { background: '#f0fdf4', color: '#16a34a', border: '1px solid #bbf7d0' };

  return (
    <div>
      <div style={{ marginBottom: 24 }}>
        <h1 style={{ fontSize: 22, fontWeight: 800, marginBottom: 5 }}>Kullanıcı Yönetimi</h1>
        <p style={{ color: 'var(--muted)', fontSize: 13 }}>
          Kullanıcı rollerini ve erişim durumlarını yönetin.
        </p>
      </div>

      {/* İstatistik kartları */}
      <div className="kpis" style={{ marginBottom: 20 }}>
        <div className="kpi">
          <div className="kl">Toplam Kullanıcı</div>
          <div className="kv cacc">{users.length}</div>
        </div>
        <div className="kpi">
          <div className="kl">Aktif</div>
          <div className="kv cgreen">{users.filter(u => u.is_active !== false).length}</div>
        </div>
        <div className="kpi">
          <div className="kl">Admin</div>
          <div className="kv" style={{ color: 'var(--circ)' }}>{users.filter(u => u.role === 'admin').length}</div>
        </div>
        <div className="kpi">
          <div className="kl">Pasif</div>
          <div className="kv" style={{ color: 'var(--muted)' }}>{users.filter(u => u.is_active === false).length}</div>
        </div>
      </div>

      {/* Tablo */}
      <div style={{
        background: 'var(--white)', border: '1px solid var(--border)',
        borderRadius: 'var(--r)', overflow: 'hidden', boxShadow: 'var(--sh)',
      }}>
        {loading ? (
          <div style={{ padding: 32, textAlign: 'center', color: 'var(--muted)', fontSize: 13 }}>
            Yükleniyor...
          </div>
        ) : users.length === 0 ? (
          <div style={{ padding: 32, textAlign: 'center', color: 'var(--muted)', fontSize: 13 }}>
            Kullanıcı bulunamadı.
          </div>
        ) : (
          <div className="rtw" style={{ border: 'none', borderRadius: 0 }}>
            <table>
              <thead>
                <tr>
                  <th>Kullanıcı</th>
                  <th>Email</th>
                  <th>Rol</th>
                  <th>Durum</th>
                  <th>Kayıt Tarihi</th>
                  <th>Şifre Sıfırla</th>
                </tr>
              </thead>
              <tbody>
                {users.map(u => {
                  const isSaving   = saving === u.id;
                  const isResetting = resetLoading === u.id;
                  const isActive   = u.is_active !== false;
                  const isEditingEmail = u.id in emailEdit;
                  const initials   = (u.name || u.email || 'U')
                    .split(' ').map(w => w[0]).join('').toUpperCase().slice(0, 2);

                  return (
                    <tr key={u.id}>
                      {/* İsim + avatar */}
                      <td>
                        <div style={{ display: 'flex', alignItems: 'center', gap: 9 }}>
                          <div style={{
                            width: 32, height: 32, borderRadius: 8, flexShrink: 0,
                            background: 'linear-gradient(135deg,#6366f1,#818cf8)',
                            display: 'flex', alignItems: 'center', justifyContent: 'center',
                            fontSize: 11, fontWeight: 800, color: '#fff',
                          }}>{initials}</div>
                          <span style={{ fontWeight: 600, fontSize: 13 }}>
                            {u.name || <span style={{ color: 'var(--muted)' }}>—</span>}
                          </span>
                        </div>
                      </td>

                      {/* Email — boşsa inline input */}
                      <td style={{ fontSize: 12, fontFamily: 'var(--mono)' }}>
                        {u.email && !isEditingEmail ? (
                          <span
                            title="Değiştirmek için tıkla"
                            style={{ cursor: 'pointer', color: 'var(--muted)' }}
                            onClick={() => setEmailEdit(p => ({ ...p, [u.id]: u.email }))}
                          >
                            {u.email}
                          </span>
                        ) : (
                          <div style={{ display: 'flex', gap: 4, alignItems: 'center' }}>
                            <input
                              type="email"
                              placeholder="email@sirket.com"
                              value={emailEdit[u.id] ?? ''}
                              onChange={e => setEmailEdit(p => ({ ...p, [u.id]: e.target.value }))}
                              onKeyDown={e => { if (e.key === 'Enter') saveEmail(u.id); if (e.key === 'Escape') setEmailEdit(p => { const n={...p}; delete n[u.id]; return n; }); }}
                              autoFocus
                              style={{
                                width: 170, padding: '3px 7px', fontSize: 12, borderRadius: 5,
                                border: '1.5px solid #4f46e5', outline: 'none',
                                fontFamily: 'var(--mono)', background: '#f8fafc',
                              }}
                            />
                            <button
                              onClick={() => saveEmail(u.id)}
                              disabled={isSaving}
                              style={{
                                background: '#4f46e5', color: '#fff', border: 'none',
                                borderRadius: 5, padding: '3px 8px', fontSize: 11,
                                cursor: 'pointer', fontWeight: 700,
                              }}
                            >Kaydet</button>
                            {u.email && (
                              <button
                                onClick={() => setEmailEdit(p => { const n={...p}; delete n[u.id]; return n; })}
                                style={{
                                  background: 'none', border: 'none', cursor: 'pointer',
                                  color: 'var(--muted)', fontSize: 14, lineHeight: 1,
                                }}
                              >✕</button>
                            )}
                          </div>
                        )}
                      </td>

                      {/* Rol */}
                      <td>
                        <select
                          value={u.role || 'user'}
                          disabled={isSaving}
                          onChange={e => updateProfile(u.id, { role: e.target.value })}
                          style={{
                            ...roleColor(u.role || 'user'),
                            borderRadius: 6, padding: '3px 8px', fontSize: 11,
                            fontWeight: 700, cursor: 'pointer', outline: 'none',
                            fontFamily: 'var(--sans)',
                          }}
                        >
                          <option value="user">Kullanıcı</option>
                          <option value="admin">Admin</option>
                        </select>
                      </td>

                      {/* Durum */}
                      <td>
                        <button
                          onClick={() => updateProfile(u.id, { is_active: !isActive })}
                          disabled={isSaving}
                          style={{
                            background: isActive ? 'var(--green-bg)' : 'var(--bg)',
                            color:      isActive ? 'var(--green)'    : 'var(--muted)',
                            border: `1px solid ${isActive ? 'var(--green-b)' : 'var(--border)'}`,
                            borderRadius: 6, padding: '3px 10px', fontSize: 11,
                            fontWeight: 700, cursor: 'pointer',
                          }}
                        >
                          {isActive ? '● Aktif' : '○ Pasif'}
                        </button>
                      </td>

                      {/* Tarih */}
                      <td style={{ color: 'var(--muted)', fontSize: 11 }}>
                        {TR_DATE(u.created_at)}
                      </td>

                      {/* Şifre Sıfırla */}
                      <td>
                        {u.email ? (
                          <button
                            disabled={isResetting}
                            onClick={() => sendPasswordReset(u.id, u.email)}
                            style={{
                              background: isResetting ? 'var(--bg)' : '#fff',
                              color: '#4f46e5',
                              border: '1.5px solid #4f46e5',
                              borderRadius: 6, padding: '4px 10px', fontSize: 11,
                              fontWeight: 700, cursor: isResetting ? 'not-allowed' : 'pointer',
                              opacity: isResetting ? 0.6 : 1,
                            }}
                          >
                            {isResetting ? '...' : 'Şifre Sıfırla'}
                          </button>
                        ) : (
                          <span
                            style={{ fontSize: 11, color: '#f59e0b', cursor: 'pointer', fontWeight: 600 }}
                            title="Email eklemek için Email sütununa tıkla"
                            onClick={() => setEmailEdit(p => ({ ...p, [u.id]: '' }))}
                          >
                            ⚠ Email gir
                          </span>
                        )}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </div>

      <div className="al al-i" style={{ marginTop: 16 }}>
        <strong>Not:</strong> Yeni kullanıcılar "Kayıt Ol" sekmesinden hesap açabilir. Email eksik kullanıcılar için
        email sütununa tıklayarak adres ekleyebilirsiniz.
      </div>
    </div>
  );
}
