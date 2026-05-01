// ── UsersPage — Kullanıcı & Yetki Yönetimi ────────────────────────────
//
// Sadece super_admin erişebilir.
//
// Her kullanıcı için:
//   • Ad Soyad / Email (inline düzenlenebilir)
//   • Rol (user / super_admin)
//   • Modül izinleri (hangi modüllere erişebilir — chip toggle)
//   • Ek yetkiler (Tanımlamalar / Kullanıcı Yönetimi)
//   • Şifre sıfırlama

import { useEffect, useState, useCallback } from 'react';
import { supabase }        from '../lib/supabase.js';
import { showToast }       from '../components/ui/Toast.jsx';
import { GlassSelect }     from '../components/ui/GlassSelect.jsx';

const withTimeout = (p, ms) => Promise.race([
  p,
  new Promise((_, r) => setTimeout(() => r(new Error('Bağlantı zaman aşımı — tekrar deneyin')), ms)),
]);
import { usePermissions }  from '../hooks/usePermissions.js';
import { useAuthStore }    from '../store/authStore.js';
import { MODULES }         from '../core/moduleRegistry.js';

const TR_DATE = d => new Date(d).toLocaleDateString('tr-TR');

const ROLE_OPTIONS = [
  { value: 'user',        label: 'Kullanıcı'   },
  { value: 'super_admin', label: 'Süper Admin' },
];

const ROLE_CHIP = {
  super_admin: { label: 'Süper Admin', bg: '#fff8e6', color: '#b45309', bd: '#fde68a' },
  user:        { label: 'Kullanıcı',   bg: '#f0fdf4', color: '#16a34a', bd: '#bbf7d0' },
};

const ALL_MODULES = MODULES.filter(m => !m.comingSoon);
const EMPTY_NEW   = { full_name: '', email: '', password: '', role: 'user' };

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
    <span onClick={open} title="Düzenlemek için tıkla" style={{
      cursor: 'pointer', color: value ? (mono ? 'var(--muted)' : 'inherit') : '#cbd5e1',
      fontFamily: mono ? 'var(--mono)' : undefined, fontSize: mono ? 12 : 13,
      borderBottom: '1px dashed #cbd5e1', paddingBottom: 1,
    }}>{value || placeholder}</span>
  );
  return (
    <div style={{ display: 'flex', gap: 4, alignItems: 'center' }}>
      <input type={type} value={val} autoFocus
        onChange={e => setVal(e.target.value)}
        onKeyDown={e => { if (e.key === 'Enter') save(); if (e.key === 'Escape') cancel(); }}
        style={{ width: type === 'email' ? 180 : 130, padding: '3px 7px', fontSize: 12,
          borderRadius: 5, border: '1.5px solid #4f46e5', outline: 'none',
          fontFamily: mono ? 'var(--mono)' : 'var(--sans)', background: '#f8fafc' }}
      />
      <button onClick={save} style={{ background: '#4f46e5', color: '#fff', border: 'none', borderRadius: 5, padding: '3px 8px', fontSize: 11, cursor: 'pointer', fontWeight: 700 }}>✓</button>
      <button onClick={cancel} style={{ background: 'none', border: 'none', cursor: 'pointer', color: 'var(--muted)', fontSize: 14 }}>✕</button>
    </div>
  );
}

// ── Modül izin chip'leri ────────────────────────────────────────────────
function ModulePermChips({ userId, currentPerms, onSave, disabled }) {
  // modules: null/undefined → tüm modüller açık
  // modules: []            → hiçbir modül yok
  // modules: ['ppr_metraj']→ sadece PPR
  const initial = currentPerms?.modules ?? null;
  const [modules, setModules] = useState(initial);
  const [saving,  setSaving]  = useState(false);

  function isEnabled(moduleId) {
    if (modules === null) return true;
    return modules.includes(moduleId);
  }

  async function toggle(moduleId) {
    if (disabled) return;
    let next;
    if (modules === null) {
      next = ALL_MODULES.map(m => m.id).filter(id => id !== moduleId);
    } else if (modules.includes(moduleId)) {
      next = modules.filter(id => id !== moduleId);
    } else {
      const candidate = [...modules, moduleId];
      next = candidate.length === ALL_MODULES.length ? null : candidate;
    }
    setModules(next);
    setSaving(true);
    const newPerms = { ...(currentPerms || {}), modules: next };
    await onSave(userId, { permissions: newPerms });
    setSaving(false);
  }

  return (
    <div style={{ display: 'flex', gap: 5, flexWrap: 'wrap' }}>
      {ALL_MODULES.map(mod => {
        const on = isEnabled(mod.id);
        return (
          <button
            key={mod.id}
            onClick={() => toggle(mod.id)}
            disabled={disabled || saving}
            title={on ? `${mod.name}: Erişim VAR — kapat` : `${mod.name}: Erişim YOK — aç`}
            style={{
              fontSize: 10, fontWeight: 700, borderRadius: 999, padding: '2px 8px',
              border: `1px solid ${on ? mod.color : '#e5e7eb'}`,
              background: on ? `${mod.color}15` : 'rgba(0,0,0,0.03)',
              color: on ? mod.color : '#9ca3af',
              cursor: disabled ? 'default' : 'pointer',
              transition: 'all .15s',
              opacity: disabled ? 0.5 : 1,
            }}
          >
            {on ? '✓' : '✗'} {mod.name}
          </button>
        );
      })}
    </div>
  );
}

// ── Ek yetkiler toggle'ları ─────────────────────────────────────────────
function ExtraPermChips({ userId, currentPerms, onSave, disabled }) {
  const perms = currentPerms || {};
  const [saving, setSaving] = useState(false);

  const EXTRAS = [
    { key: 'canManageDefinitions', label: 'Tanımlamalar' },
    { key: 'canManageUsers',       label: 'Kullanıcı Yönetimi' },
  ];

  async function toggle(key) {
    if (disabled || saving) return;
    const next = { ...perms, [key]: !perms[key] };
    setSaving(true);
    await onSave(userId, { permissions: next });
    setSaving(false);
  }

  return (
    <div style={{ display: 'flex', gap: 5, flexWrap: 'wrap', marginTop: 4 }}>
      {EXTRAS.map(ex => {
        const on = !!perms[ex.key];
        return (
          <button key={ex.key} onClick={() => toggle(ex.key)} disabled={disabled || saving}
            title={on ? 'Yetkiyi kaldır' : 'Yetki ver'}
            style={{
              fontSize: 10, fontWeight: 600, borderRadius: 999, padding: '2px 8px',
              border: `1px solid ${on ? '#636366' : '#e5e7eb'}`,
              background: on ? 'rgba(99,99,102,0.1)' : 'rgba(0,0,0,0.03)',
              color: on ? '#636366' : '#9ca3af',
              cursor: disabled ? 'default' : 'pointer', transition: 'all .15s',
            }}
          >
            {on ? '✓' : '+'} {ex.label}
          </button>
        );
      })}
    </div>
  );
}

// ── Kullanıcı satırı ────────────────────────────────────────────────────
function UserRow({ u, onUpdate, onReset, onToggleActive, saving, resetLoading, toggleLoading, currentUserId }) {
  const isSavingThis    = saving === u.id;
  const isResetting     = resetLoading === u.id;
  const isTogglingThis  = toggleLoading === u.id;
  const isCurrentUser   = u.id === currentUserId;
  const isActive        = u.is_active !== false;
  const name            = u.full_name || '';
  const initials        = (name || u.email || 'U').split(' ').map(w => w[0]).join('').toUpperCase().slice(0, 2);
  const chip            = ROLE_CHIP[u.role] ?? ROLE_CHIP.user;

  return (
    <tr style={{ borderBottom: '1px solid var(--border)', opacity: isActive ? 1 : 0.55 }}>

      {/* Ad Soyad */}
      <td style={{ padding: '11px 14px' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 9 }}>
          <div style={{
            width: 32, height: 32, borderRadius: 8, flexShrink: 0,
            background: isActive
              ? `linear-gradient(135deg,${chip.color}cc,${chip.color}88)`
              : 'linear-gradient(135deg,#94a3b8,#cbd5e1)',
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            fontSize: 11, fontWeight: 800, color: '#fff',
          }}>{initials}</div>
          <EditCell
            value={name} placeholder="İsim ekle"
            onSave={v => onUpdate(u.id, { full_name: v })}
          />
        </div>
      </td>

      {/* Email */}
      <td style={{ padding: '11px 14px' }}>
        <EditCell value={u.email} placeholder="email" type="email" mono
          onSave={v => onUpdate(u.id, { email: v })}
        />
      </td>

      {/* Rol */}
      <td style={{ padding: '11px 14px', minWidth: 140 }}>
        <GlassSelect
          value={u.role || 'user'}
          disabled={isSavingThis}
          onChange={e => onUpdate(u.id, { role: e.target.value })}
          style={{ minWidth: 130 }}
        >
          {ROLE_OPTIONS.map(r => <option key={r.value} value={r.value}>{r.label}</option>)}
        </GlassSelect>
      </td>

      {/* Modül & Ek yetkiler */}
      <td style={{ padding: '11px 14px', minWidth: 200 }}>
        {u.role === 'user' ? (
          <>
            <ModulePermChips
              userId={u.id}
              currentPerms={u.permissions}
              onSave={onUpdate}
              disabled={isSavingThis}
            />
            <ExtraPermChips
              userId={u.id}
              currentPerms={u.permissions}
              onSave={onUpdate}
              disabled={isSavingThis}
            />
          </>
        ) : (
          <span style={{ fontSize: 11, color: 'var(--muted)', fontStyle: 'italic' }}>
            Tüm yetkiler ({chip.label})
          </span>
        )}
      </td>

      {/* Kayıt Tarihi */}
      <td style={{ padding: '11px 14px', color: 'var(--muted)', fontSize: 11, whiteSpace: 'nowrap' }}>
        {TR_DATE(u.created_at)}
      </td>

      {/* Şifre Sıfırla */}
      <td style={{ padding: '11px 14px' }}>
        {u.email ? (
          <button
            disabled={isResetting}
            onClick={() => onReset(u.id, u.email)}
            style={{
              background: '#fff', color: '#4f46e5', border: '1.5px solid #4f46e5',
              borderRadius: 6, padding: '4px 10px', fontSize: 11, fontWeight: 700,
              cursor: isResetting ? 'not-allowed' : 'pointer', opacity: isResetting ? 0.6 : 1,
            }}
          >
            {isResetting ? '...' : 'Şifre Sıfırla'}
          </button>
        ) : (
          <span style={{ fontSize: 11, color: '#f59e0b', fontWeight: 600 }}>⚠ Email gerekli</span>
        )}
      </td>

      {/* Aktif / Pasif */}
      <td style={{ padding: '11px 14px', whiteSpace: 'nowrap' }}>
        {isCurrentUser ? (
          <span style={{ fontSize: 10, color: 'var(--muted)', fontStyle: 'italic' }}>Kendiniz</span>
        ) : (
          <button
            disabled={isTogglingThis}
            onClick={() => onToggleActive(u.id, isActive)}
            title={isActive ? 'Kullanıcıyı devre dışı bırak' : 'Kullanıcıyı aktif et'}
            style={{
              fontSize: 11, fontWeight: 700, borderRadius: 6, padding: '4px 10px',
              border: `1.5px solid ${isActive ? '#dc2626' : '#16a34a'}`,
              background: isActive ? '#fff1f2' : '#f0fdf4',
              color: isActive ? '#dc2626' : '#16a34a',
              cursor: isTogglingThis ? 'not-allowed' : 'pointer',
              opacity: isTogglingThis ? 0.6 : 1,
              transition: 'all .15s',
            }}
          >
            {isTogglingThis ? '...' : isActive ? 'Pasife Al' : 'Aktif Et'}
          </button>
        )}
      </td>
    </tr>
  );
}

// ── Ana sayfa ──────────────────────────────────────────────────────────
export function UsersPage() {
  const { isSuperAdmin } = usePermissions();
  const { user: currentUser } = useAuthStore();

  const [users,         setUsers]         = useState([]);
  const [loading,       setLoading]       = useState(true);
  const [fetchError,    setFetchError]    = useState(null);
  const [saving,        setSaving]        = useState(null);
  const [resetLoading,  setResetLoading]  = useState(null);
  const [toggleLoading, setToggleLoading] = useState(null);
  const [showAdd,       setShowAdd]       = useState(false);
  const [newUser,       setNewUser]       = useState(EMPTY_NEW);
  const [adding,        setAdding]        = useState(false);

  const fetchData = useCallback(async () => {
    setLoading(true);
    setFetchError(null);
    try {
      const { data, error } = await withTimeout(
        supabase
          .from('profiles')
          .select('id, email, full_name, role, permissions, created_at, is_active')
          .order('created_at', { ascending: false }),
        12000
      );
      if (error) throw error;
      setUsers(data || []);
    } catch (err) {
      setFetchError(err.message || 'Bağlantı hatası');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { fetchData(); }, [fetchData]);

  async function updateProfile(userId, patch) {
    setSaving(userId);
    try {
      const { error } = await withTimeout(
        supabase.from('profiles').update(patch).eq('id', userId),
        8000
      );
      if (error) throw error;
      setUsers(prev => prev.map(u => u.id === userId ? { ...u, ...patch } : u));
      showToast('Güncellendi ✓');
    } catch (err) {
      showToast('Hata: ' + (err.message || 'Bilinmeyen hata'));
    } finally {
      setSaving(null);
    }
  }

  async function sendPasswordReset(userId, email) {
    setResetLoading(userId);
    try {
      const { error } = await withTimeout(
        supabase.auth.resetPasswordForEmail(email, {
          redirectTo: window.location.origin + '/reset-password',
        }),
        8000
      );
      if (error) throw error;
      showToast(`Şifre sıfırlama maili → ${email}`);
    } catch (err) {
      showToast('Hata: ' + (err.message || 'Bilinmeyen hata'));
    } finally {
      setResetLoading(null);
    }
  }

  async function toggleActive(userId, currentlyActive) {
    setToggleLoading(userId);
    try {
      const { error } = await withTimeout(
        supabase.from('profiles').update({ is_active: !currentlyActive }).eq('id', userId),
        8000
      );
      if (error) throw error;
      setUsers(prev => prev.map(u => u.id === userId ? { ...u, is_active: !currentlyActive } : u));
      showToast(currentlyActive ? 'Kullanıcı pasife alındı' : 'Kullanıcı aktif edildi');
    } catch (err) {
      showToast('Hata: ' + (err.message || 'Bilinmeyen hata'));
    } finally {
      setToggleLoading(null);
    }
  }

  async function handleAddUser(e) {
    e.preventDefault();
    if (!newUser.full_name.trim() || !newUser.email.trim() || !newUser.password.trim()) {
      showToast('Tüm alanları doldurun');
      return;
    }
    setAdding(true);
    try {
      // signUp süper admin oturumunu yeni kullanıcıyla değiştirir; geri yüklemek için sakla
      const { data: { session: prevSession } } = await supabase.auth.getSession();

      const { data, error } = await supabase.auth.signUp({
        email:    newUser.email.trim(),
        password: newUser.password,
        options:  { data: { full_name: newUser.full_name.trim() } },
      });
      if (error) throw error;
      if (!data?.user) throw new Error('Kullanıcı oluşturulamadı');

      // Trigger (handle_new_user) profili role='user' ile otomatik oluşturur.
      // Farklı rol seçildiyse veya isim trigger'da boş geldiyse UPDATE et.
      const patch = { full_name: newUser.full_name.trim() };
      if (newUser.role !== 'user') patch.role = newUser.role;

      const { error: pe } = await supabase
        .from('profiles')
        .update(patch)
        .eq('id', data.user.id);
      if (pe) console.warn('Profil güncellenemedi:', pe.message);

      // Süper admin oturumunu geri yükle
      if (prevSession) {
        const { error: restoreErr } = await supabase.auth.setSession({
          access_token:  prevSession.access_token,
          refresh_token: prevSession.refresh_token,
        });
        if (restoreErr) {
          console.error('[UsersPage] Oturum geri yüklenemedi:', restoreErr.message);
          showToast('Yönetici oturumu geri yüklenemedi, lütfen tekrar giriş yapın.');
        }
      }

      showToast(`${newUser.full_name} eklendi ✓`);
      setShowAdd(false);
      setNewUser(EMPTY_NEW);
      await fetchData();
    } catch (err) {
      showToast('Hata: ' + (err.message || 'Bilinmeyen hata'));
    } finally {
      setAdding(false);
    }
  }

  const stats = {
    total:   users.length,
    admins:  users.filter(u => u.role === 'super_admin').length,
    users:   users.filter(u => u.role === 'user').length,
    passive: users.filter(u => u.is_active === false).length,
  };

  if (!isSuperAdmin) {
    return (
      <div style={{ padding: 32, textAlign: 'center', color: 'var(--muted)' }}>
        Bu sayfa için yetkiniz yok.
      </div>
    );
  }

  return (
    <div>
      {/* Başlık */}
      <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', marginBottom: 24 }}>
        <div>
          <h1 style={{ fontSize: 22, fontWeight: 800, marginBottom: 5 }}>Kullanıcı Yönetimi</h1>
          <p style={{ color: 'var(--muted)', fontSize: 13 }}>
            Rolleri, modül erişimlerini ve ek yetkileri yönetin.
          </p>
        </div>
        <button
          onClick={() => { setShowAdd(v => !v); setNewUser(EMPTY_NEW); }}
          style={{
            background: 'linear-gradient(135deg,#4f46e5,#6366f1)', color: '#fff',
            border: 'none', borderRadius: 8, padding: '9px 16px', fontSize: 13,
            fontWeight: 700, cursor: 'pointer',
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
          padding: '18px 22px', marginBottom: 20, boxShadow: '0 2px 12px rgba(79,70,229,.1)',
        }}>
          <div style={{ fontWeight: 700, fontSize: 13, marginBottom: 12, color: '#4f46e5' }}>Yeni Kullanıcı Ekle</div>
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: 10, marginBottom: 10 }}>
            <div>
              <label style={{ display: 'block', fontSize: 11, fontWeight: 700, color: '#64748b', marginBottom: 4 }}>Ad Soyad</label>
              <input type="text" required placeholder="Ahmet Yılmaz"
                value={newUser.full_name} onChange={e => setNewUser(p => ({ ...p, full_name: e.target.value }))}
                style={{ width: '100%', padding: '8px 10px', borderRadius: 6, border: '1.5px solid var(--border)', fontSize: 13, outline: 'none', boxSizing: 'border-box' }} />
            </div>
            <div>
              <label style={{ display: 'block', fontSize: 11, fontWeight: 700, color: '#64748b', marginBottom: 4 }}>Email</label>
              <input type="email" required placeholder="ahmet@sirket.com"
                value={newUser.email} onChange={e => setNewUser(p => ({ ...p, email: e.target.value }))}
                style={{ width: '100%', padding: '8px 10px', borderRadius: 6, border: '1.5px solid var(--border)', fontSize: 13, fontFamily: 'var(--mono)', outline: 'none', boxSizing: 'border-box' }} />
            </div>
            <div>
              <label style={{ display: 'block', fontSize: 11, fontWeight: 700, color: '#64748b', marginBottom: 4 }}>Şifre</label>
              <input type="password" required minLength={6} placeholder="En az 6 karakter"
                value={newUser.password} onChange={e => setNewUser(p => ({ ...p, password: e.target.value }))}
                style={{ width: '100%', padding: '8px 10px', borderRadius: 6, border: '1.5px solid var(--border)', fontSize: 13, outline: 'none', boxSizing: 'border-box' }} />
            </div>
          </div>
          <div style={{ marginBottom: 14, maxWidth: 240 }}>
            <label style={{ display: 'block', fontSize: 11, fontWeight: 700, color: '#64748b', marginBottom: 4 }}>Rol</label>
            <GlassSelect value={newUser.role} onChange={e => setNewUser(p => ({ ...p, role: e.target.value }))}>
              {ROLE_OPTIONS.map(r => <option key={r.value} value={r.value}>{r.label}</option>)}
            </GlassSelect>
          </div>
          <div style={{ display: 'flex', gap: 8 }}>
            <button type="submit" disabled={adding} style={{
              background: '#4f46e5', color: '#fff', border: 'none', borderRadius: 6,
              padding: '8px 18px', fontSize: 13, fontWeight: 700,
              cursor: adding ? 'not-allowed' : 'pointer', opacity: adding ? .7 : 1,
            }}>{adding ? 'Ekleniyor...' : 'Ekle'}</button>
            <button type="button" onClick={() => setShowAdd(false)} style={{
              background: 'none', color: 'var(--muted)', border: '1px solid var(--border)',
              borderRadius: 6, padding: '8px 14px', fontSize: 13, cursor: 'pointer',
            }}>İptal</button>
          </div>
        </form>
      )}

      {/* İstatistikler */}
      <div className="kpis" style={{ marginBottom: 20 }}>
        <div className="kpi"><div className="kl">Toplam</div><div className="kv cacc">{stats.total}</div></div>
        <div className="kpi"><div className="kl">Süper Admin</div><div className="kv" style={{ color: '#b45309' }}>{stats.admins}</div></div>
        <div className="kpi"><div className="kl">Kullanıcı</div><div className="kv" style={{ color: '#16a34a' }}>{stats.users}</div></div>
        <div className="kpi"><div className="kl">Pasif</div><div className="kv" style={{ color: '#dc2626' }}>{stats.passive}</div></div>
      </div>

      {/* Tablo */}
      <div style={{ background: 'var(--white)', border: '1px solid var(--border)', borderRadius: 'var(--r)', overflow: 'hidden', boxShadow: 'var(--sh)' }}>
        {loading ? (
          <div style={{ padding: 32, textAlign: 'center', color: 'var(--muted)', fontSize: 13 }}>Yükleniyor...</div>
        ) : fetchError ? (
          <div style={{ padding: 32, textAlign: 'center' }}>
            <div style={{ fontSize: 13, color: '#dc2626', marginBottom: 12 }}>⚠ {fetchError}</div>
            <button
              onClick={fetchData}
              style={{ background: '#4f46e5', color: '#fff', border: 'none', borderRadius: 6, padding: '8px 18px', fontSize: 13, fontWeight: 700, cursor: 'pointer' }}
            >Tekrar Dene</button>
          </div>
        ) : users.length === 0 ? (
          <div style={{ padding: 32, textAlign: 'center', color: 'var(--muted)', fontSize: 13 }}>Kullanıcı bulunamadı.</div>
        ) : (
          <div style={{ overflowX: 'auto' }}>
            <table style={{ width: '100%', borderCollapse: 'collapse' }}>
              <thead>
                <tr style={{ borderBottom: '2px solid var(--border)', background: 'rgba(0,0,0,0.02)' }}>
                  {['Ad Soyad', 'Email', 'Rol', 'Modül & Ek Yetkiler', 'Kayıt', 'Şifre', 'Durum'].map(h => (
                    <th key={h} style={{ textAlign: 'left', padding: '10px 14px', fontSize: 11, fontWeight: 700, letterSpacing: '.4px', textTransform: 'uppercase', color: 'var(--muted)', whiteSpace: 'nowrap' }}>{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {users.map(u => (
                  <UserRow
                    key={u.id}
                    u={u}
                    onUpdate={updateProfile}
                    onReset={sendPasswordReset}
                    onToggleActive={toggleActive}
                    saving={saving}
                    resetLoading={resetLoading}
                    toggleLoading={toggleLoading}
                    currentUserId={currentUser?.id}
                  />
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      <div className="al al-i" style={{ marginTop: 14 }}>
        <strong>Modül yetkileri:</strong> Kullanıcı rolündeki hesaplar için modül chip'lerine tıklayarak erişimi açıp kapatabilirsiniz.
        Süper admin için tüm yetkiler otomatik aktiftir.
      </div>
    </div>
  );
}
