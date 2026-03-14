// ── UsersPage — Kullanıcı Yönetimi (Admin) ────────────────────────────
// Tüm kullanıcıları listeler; rol ve durum değiştirme, şifre sıfırlama.

import { useEffect, useState } from 'react';
import { supabase } from '../lib/supabase.js';
import { showToast } from '../components/ui/Toast.jsx';
import { Button } from '../components/ui/Button.jsx';

const TR_DATE = d => new Date(d).toLocaleDateString('tr-TR');

export function UsersPage() {
  const [users,   setUsers]   = useState([]);
  const [loading, setLoading] = useState(true);
  const [saving,  setSaving]  = useState(null); // userId

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

  async function sendPasswordReset(email) {
    const { error } = await supabase.auth.resetPasswordForEmail(email, {
      redirectTo: window.location.origin + '/reset-password',
    });
    if (error) showToast('Hata: ' + error.message);
    else showToast(`Şifre sıfırlama maili gönderildi → ${email}`);
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

      {/* Kullanıcı tablosu */}
      <div style={{ background: 'var(--white)', border: '1px solid var(--border)', borderRadius: 'var(--r)', overflow: 'hidden', boxShadow: 'var(--sh)' }}>
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
                  <th>İşlemler</th>
                </tr>
              </thead>
              <tbody>
                {users.map(u => {
                  const isSaving = saving === u.id;
                  const isActive = u.is_active !== false;
                  const initials = (u.name || u.email || 'U')
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
                            {u.name || '—'}
                          </span>
                        </div>
                      </td>

                      {/* Email */}
                      <td style={{ color: 'var(--muted)', fontSize: 12, fontFamily: 'var(--mono)' }}>
                        {u.email || '—'}
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
                            color: isActive ? 'var(--green)' : 'var(--muted)',
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

                      {/* İşlemler */}
                      <td>
                        <Button
                          variant="default"
                          disabled={!u.email || isSaving}
                          onClick={() => sendPasswordReset(u.email)}
                          style={{ padding: '4px 10px', fontSize: 11 }}
                        >
                          Şifre Sıfırla
                        </Button>
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
        <strong>Not:</strong> Yeni kullanıcılar giriş ekranındaki "Kayıt Ol" sekmesinden hesap açabilir.
        Rol varsayılan olarak <strong>Kullanıcı</strong> atanır — sadece hesaplama yapabilirler.
        Admin rolü yalnızca bu sayfadan verilebilir.
      </div>
    </div>
  );
}
