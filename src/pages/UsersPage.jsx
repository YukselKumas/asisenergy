// ── UsersPage — Kullanıcı Yönetimi ────────────────────────────────────
// Yeni şema: profiles.full_name, roller: super_admin / company_admin / user

import { useEffect, useState } from 'react';
import { supabase } from '../lib/supabase.js';
import { showToast } from '../components/ui/Toast.jsx';
import { GlassSelect } from '../components/ui/GlassSelect.jsx';

const TR_DATE = d => new Date(d).toLocaleDateString('tr-TR');

const ROLE_OPTIONS = [
  { value: 'user',          label: 'Kullanıcı'  },
  { value: 'company_admin', label: 'Yönetici'   },
  { value: 'super_admin',   label: 'Süper Admin' },
];

const ROLE_BADGE = {
  super_admin:   { label: 'Süper Admin', bg: '#fff8e6', color: '#b45309',  border: '#fde68a' },
  company_admin: { label: 'Yönetici',   bg: '#eef2ff', color: '#4f46e5',  border: '#c7d2fe' },
  user:          { label: 'Kullanıcı',  bg: '#f0fdf4', color: '#16a34a',  border: '#bbf7d0' },
};

const EMPTY_NEW = { full_name: '', email: '', password: '', role: 'user' };

// ── Inline düzenlenebilir hücre ────────────────────────────────────────
function EditCell({ value, placeholder, type = 'text', onSave, mono = false }) {
  const [editing, setEditing] = useState(false);
  const [val, setVal]         = useState(value || '');

  function open()   { setVal(value || ''); setEditing(true); }
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

// ── Ana sayfa ──────────────────────────────────────────────────────────
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
      .select('id, email, full_name, role, company_id, created_at')
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
    if (!newUser.full_name.trim() || !newUser.email.trim() || !newUser.password.trim()) {
      showToast('Tüm alanları doldurun');
      return;
    }
    setAdding(true);
    try {
      const { data, error } = await supabase.auth.signUp({
        email:    newUser.email.trim(),
        password: newUser.password,
        options:  { data: { full_name: newUser.full_name.trim(), role: newUser.role } },
      });
      if (error) throw error;

      if (data?.user) {
        const { error: pe } = await supabase.from('profiles').upsert({
          id:        data.user.id,
          email:     newUser.email.trim(),
          full_name: newUser.full_name.trim(),
          role:      newUser.role,
        });
        if (pe) throw pe;
        showToast(`${newUser.full_name} eklendi ✓`);
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

  const stats = {
    total:        users.length,
    admins:       users.filter(u => ['super_admin','company_admin'].includes(u.role)).length,
    superAdmins:  users.filter(u => u.role === 'super_admin').length,
  };

  return (
    <div>
      {/* Başlık */}
      <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', marginBottom: 24 }}>
        <div>
          <h1 style={{ fontSize: 22, fontWeight: 800, marginBottom: 5 }}>Kullanıcı Yönetimi</h1>
          <p style={{ color: 'var(--muted)', fontSize: 13 }}>
            Kullanıcı rollerini yönetin, şifre sıfırlama maili gönderin.
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
                value={newUser.full_name}
                onChange={e => setNewUser(p => ({ ...p, full_name: e.target.value }))}
                style={{ width: '100%', padding: '8px 10px', borderRadius: 6, border: '1.5px solid #e2e8f0', fontSize: 13, fontFamily: 'var(--sans)', outline: 'none', boxSizing: 'border-box' }}
              />
            </div>
            <div>
              <label style={{ display: 'block', fontSize: 11, fontWeight: 700, color: '#64748b', marginBottom: 4 }}>Email</label>
              <input
                type="email" placeholder="ahmet@sirket.com" required
                value={newUser.email}
                onChange={e => setNewUser(p => ({ ...p, email: e.target.value }))}
                style={{ width: '100%', padding: '8px 10px', borderRadius: 6, border: '1.5px solid #e2e8f0', fontSize: 13, fontFamily: 'var(--mono)', outline: 'none', boxSizing: 'border-box' }}
              />
            </div>
            <div>
              <label style={{ display: 'block', fontSize: 11, fontWeight: 700, color: '#64748b', marginBottom: 4 }}>Şifre</label>
              <input
                type="password" placeholder="En az 6 karakter" required minLength={6}
                value={newUser.password}
                onChange={e => setNewUser(p => ({ ...p, password: e.target.value }))}
                style={{ width: '100%', padding: '8px 10px', borderRadius: 6, border: '1.5px solid #e2e8f0', fontSize: 13, fontFamily: 'var(--sans)', outline: 'none', boxSizing: 'border-box' }}
              />
            </div>
            <div>
              <label style={{ display: 'block', fontSize: 11, fontWeight: 700, color: '#64748b', marginBottom: 4 }}>Rol</label>
              <GlassSelect
                value={newUser.role}
                onChange={e => setNewUser(p => ({ ...p, role: e.target.value }))}
              >
                {ROLE_OPTIONS.map(r => (
                  <option key={r.value} value={r.value}>{r.label}</option>
                ))}
              </GlassSelect>
            </div>
          </div>
          <div style={{ display: 'flex', gap: 8, marginTop: 14 }}>
            <button type="submit" disabled={adding} style={{
              background: '#4f46e5', color: '#fff', border: 'none', borderRadius: 6,
              padding: '8px 18px', fontSize: 13, fontWeight: 700,
              cursor: adding ? 'not-allowed' : 'pointer',
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
        <div className="kpi">
          <div className="kl">Toplam Kullanıcı</div>
          <div className="kv cacc">{stats.total}</div>
        </div>
        <div className="kpi">
          <div className="kl">Yönetici</div>
          <div className="kv" style={{ color: 'var(--circ)' }}>{stats.admins}</div>
        </div>
        <div className="kpi">
          <div className="kl">Süper Admin</div>
          <div className="kv" style={{ color: 'var(--warn)' }}>{stats.superAdmins}</div>
        </div>
      </div>

      {/* Kullanıcı tablosu */}
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
                  <th>Kayıt Tarihi</th>
                  <th>Şifre Sıfırla</th>
                </tr>
              </thead>
              <tbody>
                {users.map(u => {
                  const isSaving    = saving === u.id;
                  const isResetting = resetLoading === u.id;
                  const name        = u.full_name || '';
                  const initials    = (name || u.email || 'U')
                    .split(' ').map(w => w[0]).join('').toUpperCase().slice(0, 2);
                  const roleBadge   = ROLE_BADGE[u.role] ?? ROLE_BADGE.user;

                  return (
                    <tr key={u.id}>
                      {/* Ad Soyad */}
                      <td>
                        <div style={{ display: 'flex', alignItems: 'center', gap: 9 }}>
                          <div style={{
                            width: 32, height: 32, borderRadius: 8, flexShrink: 0,
                            background: 'linear-gradient(135deg,#6366f1,#818cf8)',
                            display: 'flex', alignItems: 'center', justifyContent: 'center',
                            fontSize: 11, fontWeight: 800, color: '#fff',
                          }}>{initials}</div>
                          <EditCell
                            value={name}
                            placeholder="İsim ekle"
                            onSave={v => updateProfile(u.id, { full_name: v })}
                          />
                        </div>
                      </td>

                      {/* Email */}
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
                        <GlassSelect
                          value={u.role || 'user'}
                          disabled={isSaving}
                          onChange={e => updateProfile(u.id, { role: e.target.value })}
                          style={{ minWidth: 140 }}
                        >
                          {ROLE_OPTIONS.map(r => (
                            <option key={r.value} value={r.value}>{r.label}</option>
                          ))}
                        </GlassSelect>
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
