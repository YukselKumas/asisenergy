// ── UsersPage — Kullanıcı Yönetimi (Admin) ────────────────────────────
import { useEffect, useState } from 'react';
import { supabase } from '../lib/supabase.js';
import { showToast } from '../components/ui/Toast.jsx';

const TR_DATE = d => new Date(d).toLocaleDateString('tr-TR');

const EMPTY_NEW = { name: '', email: '', password: '', role: 'user' };

// Inline düzenlenebilir hücre — tıkla, yaz, Enter/Kaydet
function EditCell({ value, placeholder, type = 'text', onSave, mono = false }) {
  const [editing, setEditing] = useState(false);
  const [val, setVal] = useState(value || '');

  function open() { setVal(value || ''); setEditing(true); }
  function cancel() { setEditing(false); }
  async function save() {
    const v = val.trim();
    if (!v) { showToast('Boş bırakılamaz'); return; }
    await onSave(v);
    setEditing(false);
  }

  if (!editing) return (
    <span
      onClick={open}
      title="Düzenlemek için tıkla"
      style={{
        cursor: 'pointer',
        color: value ? (mono ? 'var(--muted)' : 'inherit') : '#cbd5e1',
        fontFamily: mono ? 'var(--mono)' : undefined,
        fontSize: mono ? 12 : 13,
        borderBottom: '1px dashed #cbd5e1',
        paddingBottom: 1,
      }}
    >
      {value || placeholder}
    </span>
  );

  return (
    <div style={{ display: 'flex', gap: 4, alignItems: 'center' }}>
      <input
        type={type}
        value={val}
        autoFocus
        onChange={e => setVal(e.target.value)}
        onKeyDown={e => { if (e.key === 'Enter') save(); if (e.key === 'Escape') cancel(); }}
        style={{
          width: type === 'email' ? 180 : 130, padding: '3px 7px', fontSize: 12,
          borderRadius: 5, border: '1.5px solid #4f46e5', outline: 'none',
          fontFamily: mono ? 'var(--mono)' : 'var(--sans)', background: '#f8fafc',
        }}
      />
      <button onClick={save} style={{
        background: '#4f46e5', color: '#fff', border: 'none', borderRadius: 5,
        padding: '3px 8px', fontSize: 11, cursor: 'pointer', fontWeight: 700,
      }}>✓</button>
      <button onClick={cancel} style={{
        background: 'none', border: 'none', cursor: 'pointer',
        color: 'var(--muted)', fontSize: 14, lineHeight: 1,
      }}>✕</button>
    </div>
  );
}

export function UsersPage() {
  const [users,        setUsers]        = useState([]);
  const [loading,      setLoading]      = useState(true);
  const [saving,       setSaving]       = useState(null);
  const [resetLoading, setResetLoading] = useState(null);
  const [showAdd,      setShowAdd]      = useState(false);
  const [newUser,      setNewUser]      = useState(EMPTY_NEW);
  const [adding,       setAdding]       = useState(false);

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
    const { error } = await supabase.from('profiles').update(patch).eq('id', userId);
    if (error) showToast('Hata: ' + error.message);
    else {
      setUsers(prev => prev.map(u => u.id === userId ? { ...u, ...patch } : u));
      showToast('Güncellendi ✓');
    }
    setSaving(null);
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

  async function handleAddUser(e) {
    e.preventDefault();
    if (!newUser.name.trim() || !newUser.email.trim() || !newUser.password.trim()) {
      showToast('Tüm alanları doldurun');
      return;
    }
    setAdding(true);
    try {
      const { data, error } = await supabase.auth.signUp({
        email: newUser.email.trim(),
        password: newUser.password,
        options: { data: { name: newUser.name.trim() } },
      });
      if (error) throw error;

      if (data?.user) {
        const { error: pe } = await supabase.from('profiles').upsert({
          id: data.user.id,
          email: newUser.email.trim(),
          name: newUser.name.trim(),
          role: newUser.role,
          is_active: true,
        });
        if (pe) throw pe;
        showToast(`${newUser.name} eklendi ✓`);
        setShowAdd(false);
        setNewUser(EMPTY_NEW);
        await fetchUsers();
      }
    } catch (err) {
      showToast('Hata: ' + (err.message || 'Bilinmeyen hata'));
    } finally {
      setAdding(false);
    }
  }

  const roleColor = r => r === 'admin'
    ? { background: '#eef2ff', color: '#4f46e5', border: '1px solid #c7d2fe' }
    : { background: '#f0fdf4', color: '#16a34a', border: '1px solid #bbf7d0' };

  return (
    <div>
      {/* Başlık */}
      <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', marginBottom: 24 }}>
        <div>
          <h1 style={{ fontSize: 22, fontWeight: 800, marginBottom: 5 }}>Kullanıcı Yönetimi</h1>
          <p style={{ color: 'var(--muted)', fontSize: 13 }}>
            Kullanıcı rollerini ve erişim durumlarını yönetin.
          </p>
        </div>
        <button
          onClick={() => { setShowAdd(v => !v); setNewUser(EMPTY_NEW); }}
          style={{
            background: 'linear-gradient(135deg,#4f46e5,#6366f1)', color: '#fff',
            border: 'none', borderRadius: 8, padding: '9px 16px', fontSize: 13,
            fontWeight: 700, cursor: 'pointer', fontFamily: 'var(--sans)',
            boxShadow: '0 2px 8px rgba(79,70,229,.3)', whiteSpace: 'nowrap',
          }}
        >
          + Yeni Kullanıcı
        </button>
      </div>

      {/* Yeni kullanıcı formu */}
      {showAdd && (
        <form onSubmit={handleAddUser} style={{
          background: '#fff', border: '1.5px solid #4f46e5', borderRadius: 10,
          padding: '20px 24px', marginBottom: 20, boxShadow: '0 2px 12px rgba(79,70,229,.1)',
        }}>
          <div style={{ fontWeight: 700, fontSize: 13, marginBottom: 14, color: '#4f46e5' }}>
            Yeni Kullanıcı Ekle
          </div>
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr auto', gap: 10, alignItems: 'end' }}>
            <div>
              <label style={{ display: 'block', fontSize: 11, fontWeight: 700, color: '#64748b', marginBottom: 4 }}>Ad Soyad</label>
              <input
                type="text" placeholder="Ahmet Yılmaz" required
                value={newUser.name} onChange={e => setNewUser(p => ({ ...p, name: e.target.value }))}
                style={{ width: '100%', padding: '8px 10px', borderRadius: 6, border: '1.5px solid #e2e8f0', fontSize: 13, fontFamily: 'var(--sans)', outline: 'none', boxSizing: 'border-box' }}
              />
            </div>
            <div>
              <label style={{ display: 'block', fontSize: 11, fontWeight: 700, color: '#64748b', marginBottom: 4 }}>Email</label>
              <input
                type="email" placeholder="ahmet@sirket.com" required
                value={newUser.email} onChange={e => setNewUser(p => ({ ...p, email: e.target.value }))}
                style={{ width: '100%', padding: '8px 10px', borderRadius: 6, border: '1.5px solid #e2e8f0', fontSize: 13, fontFamily: 'var(--mono)', outline: 'none', boxSizing: 'border-box' }}
              />
            </div>
            <div>
              <label style={{ display: 'block', fontSize: 11, fontWeight: 700, color: '#64748b', marginBottom: 4 }}>Şifre</label>
              <input
                type="password" placeholder="En az 6 karakter" required minLength={6}
                value={newUser.password} onChange={e => setNewUser(p => ({ ...p, password: e.target.value }))}
                style={{ width: '100%', padding: '8px 10px', borderRadius: 6, border: '1.5px solid #e2e8f0', fontSize: 13, fontFamily: 'var(--sans)', outline: 'none', boxSizing: 'border-box' }}
              />
            </div>
            <div>
              <label style={{ display: 'block', fontSize: 11, fontWeight: 700, color: '#64748b', marginBottom: 4 }}>Rol</label>
              <select
                value={newUser.role} onChange={e => setNewUser(p => ({ ...p, role: e.target.value }))}
                style={{ padding: '8px 10px', borderRadius: 6, border: '1.5px solid #e2e8f0', fontSize: 13, fontFamily: 'var(--sans)', cursor: 'pointer', outline: 'none', background: '#fff' }}
              >
                <option value="user">Kullanıcı</option>
                <option value="admin">Admin</option>
              </select>
            </div>
          </div>
          <div style={{ display: 'flex', gap: 8, marginTop: 14 }}>
            <button type="submit" disabled={adding} style={{
              background: '#4f46e5', color: '#fff', border: 'none', borderRadius: 6,
              padding: '8px 18px', fontSize: 13, fontWeight: 700, cursor: adding ? 'not-allowed' : 'pointer',
              opacity: adding ? .7 : 1, fontFamily: 'var(--sans)',
            }}>
              {adding ? 'Ekleniyor...' : 'Ekle'}
            </button>
            <button type="button" onClick={() => setShowAdd(false)} style={{
              background: 'none', color: 'var(--muted)', border: '1px solid var(--border)',
              borderRadius: 6, padding: '8px 14px', fontSize: 13, cursor: 'pointer', fontFamily: 'var(--sans)',
            }}>İptal</button>
          </div>
        </form>
      )}

      {/* İstatistik kartları */}
      <div className="kpis" style={{ marginBottom: 20 }}>
        <div className="kpi"><div className="kl">Toplam Kullanıcı</div><div className="kv cacc">{users.length}</div></div>
        <div className="kpi"><div className="kl">Aktif</div><div className="kv cgreen">{users.filter(u => u.is_active !== false).length}</div></div>
        <div className="kpi"><div className="kl">Admin</div><div className="kv" style={{ color: 'var(--circ)' }}>{users.filter(u => u.role === 'admin').length}</div></div>
        <div className="kpi"><div className="kl">Pasif</div><div className="kv" style={{ color: 'var(--muted)' }}>{users.filter(u => u.is_active === false).length}</div></div>
      </div>

      {/* Tablo */}
      <div style={{ background: 'var(--white)', border: '1px solid var(--border)', borderRadius: 'var(--r)', overflow: 'hidden', boxShadow: 'var(--sh)' }}>
        {loading ? (
          <div style={{ padding: 32, textAlign: 'center', color: 'var(--muted)', fontSize: 13 }}>Yükleniyor...</div>
        ) : users.length === 0 ? (
          <div style={{ padding: 32, textAlign: 'center', color: 'var(--muted)', fontSize: 13 }}>Kullanıcı bulunamadı.</div>
        ) : (
          <div className="rtw" style={{ border: 'none', borderRadius: 0 }}>
            <table>
              <thead>
                <tr>
                  <th>Ad Soyad</th>
                  <th>Email</th>
                  <th>Rol</th>
                  <th>Durum</th>
                  <th>Kayıt Tarihi</th>
                  <th>Şifre Sıfırla</th>
                </tr>
              </thead>
              <tbody>
                {users.map(u => {
                  const isSaving    = saving === u.id;
                  const isResetting = resetLoading === u.id;
                  const isActive    = u.is_active !== false;
                  const initials    = (u.name || u.email || 'U')
                    .split(' ').map(w => w[0]).join('').toUpperCase().slice(0, 2);

                  return (
                    <tr key={u.id}>
                      {/* Ad Soyad — inline düzenlenebilir */}
                      <td>
                        <div style={{ display: 'flex', alignItems: 'center', gap: 9 }}>
                          <div style={{
                            width: 32, height: 32, borderRadius: 8, flexShrink: 0,
                            background: 'linear-gradient(135deg,#6366f1,#818cf8)',
                            display: 'flex', alignItems: 'center', justifyContent: 'center',
                            fontSize: 11, fontWeight: 800, color: '#fff',
                          }}>{initials}</div>
                          <EditCell
                            value={u.name}
                            placeholder="İsim ekle"
                            onSave={v => updateProfile(u.id, { name: v })}
                          />
                        </div>
                      </td>

                      {/* Email — inline düzenlenebilir */}
                      <td>
                        <EditCell
                          value={u.email}
                          placeholder="email ekle"
                          type="email"
                          mono
                          onSave={v => updateProfile(u.id, { email: v })}
                        />
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
                              background: '#fff', color: '#4f46e5',
                              border: '1.5px solid #4f46e5', borderRadius: 6,
                              padding: '4px 10px', fontSize: 11, fontWeight: 700,
                              cursor: isResetting ? 'not-allowed' : 'pointer',
                              opacity: isResetting ? 0.6 : 1,
                            }}
                          >
                            {isResetting ? '...' : 'Şifre Sıfırla'}
                          </button>
                        ) : (
                          <span style={{ fontSize: 11, color: '#f59e0b', fontWeight: 600 }}>
                            ⚠ Email gerekli
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
        <strong>İpucu:</strong> Ad Soyad ve Email hücrelerine tıklayarak düzenleyebilirsiniz.
      </div>
    </div>
  );
}
