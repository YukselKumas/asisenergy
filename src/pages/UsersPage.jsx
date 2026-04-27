// ── UsersPage — Kullanıcı & Yetki Yönetimi ────────────────────────────
//
// super_admin : tüm şirketlerin kullanıcılarını görür, şirket filtresi var
// company_admin: sadece kendi şirketinin kullanıcılarını görür
//
// Her kullanıcı için:
//   • Ad Soyad / Email (inline düzenlenebilir)
//   • Rol (user / company_admin / super_admin)
//   • Modül izinleri (hangi modüllere erişebilir — chip toggle)
//   • Şifre sıfırlama

import { useEffect, useState, useCallback } from 'react';
import { supabase }        from '../lib/supabase.js';
import { showToast }       from '../components/ui/Toast.jsx';
import { GlassSelect }     from '../components/ui/GlassSelect.jsx';
import { useAuthStore }    from '../store/authStore.js';
import { usePermissions }  from '../hooks/usePermissions.js';
import { MODULES }         from '../core/moduleRegistry.js';

const TR_DATE = d => new Date(d).toLocaleDateString('tr-TR');

const ROLE_OPTIONS = [
  { value: 'user',          label: 'Kullanıcı'   },
  { value: 'company_admin', label: 'Yönetici'    },
  { value: 'super_admin',   label: 'Süper Admin' },
];

const ROLE_CHIP = {
  super_admin:   { label: 'Süper Admin', bg: '#fff8e6', color: '#b45309',  bd: '#fde68a' },
  company_admin: { label: 'Yönetici',   bg: '#eef2ff', color: '#4f46e5',  bd: '#c7d2fe' },
  user:          { label: 'Kullanıcı',  bg: '#f0fdf4', color: '#16a34a',  bd: '#bbf7d0' },
};

const ALL_MODULES = MODULES.filter(m => !m.comingSoon);
const EMPTY_NEW   = { full_name: '', email: '', password: '', role: 'user', company_id: '' };

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

  // null = tüm modüller açık (kısıtlama yok)
  function isEnabled(moduleId) {
    if (modules === null) return true;
    return modules.includes(moduleId);
  }

  async function toggle(moduleId) {
    if (disabled) return;
    let next;
    if (modules === null) {
      // Tüm açıkken bir tanesini kapat → explicit liste yap
      next = ALL_MODULES.map(m => m.id).filter(id => id !== moduleId);
    } else if (modules.includes(moduleId)) {
      next = modules.filter(id => id !== moduleId);
    } else {
      const candidate = [...modules, moduleId];
      // Hepsi açıksa null'a dön (kısıtlama yok)
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
function UserRow({ u, companies, onUpdate, onReset, saving, resetLoading, canEditSuperAdmin }) {
  const isSavingThis  = saving === u.id;
  const isResetting   = resetLoading === u.id;
  const name          = u.full_name || '';
  const initials      = (name || u.email || 'U').split(' ').map(w => w[0]).join('').toUpperCase().slice(0, 2);
  const chip          = ROLE_CHIP[u.role] ?? ROLE_CHIP.user;
  const companyName   = companies.find(c => c.id === u.company_id)?.name ?? '—';

  // super_admin satırını sadece süper admin düzenleyebilir
  const locked = u.role === 'super_admin' && !canEditSuperAdmin;

  return (
    <tr style={{ borderBottom: '1px solid var(--border)' }}>

      {/* Ad Soyad */}
      <td style={{ padding: '11px 14px' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 9 }}>
          <div style={{
            width: 32, height: 32, borderRadius: 8, flexShrink: 0,
            background: `linear-gradient(135deg,${chip.color}cc,${chip.color}88)`,
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            fontSize: 11, fontWeight: 800, color: '#fff',
          }}>{initials}</div>
          <div>
            <EditCell
              value={name} placeholder="İsim ekle"
              onSave={v => onUpdate(u.id, { full_name: v })}
            />
            <div style={{ fontSize: 10, color: 'var(--muted)', marginTop: 1 }}>{companyName}</div>
          </div>
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
          disabled={isSavingThis || locked}
          onChange={e => onUpdate(u.id, { role: e.target.value })}
          style={{ minWidth: 130 }}
        >
          {ROLE_OPTIONS
            .filter(r => canEditSuperAdmin || r.value !== 'super_admin')
            .map(r => <option key={r.value} value={r.value}>{r.label}</option>)
          }
        </GlassSelect>
      </td>

      {/* Modül & Ek yetkiler */}
      <td style={{ padding: '11px 14px', minWidth: 200 }}>
        {(u.role === 'user') ? (
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
    </tr>
  );
}

// ── Ana sayfa ──────────────────────────────────────────────────────────
export function UsersPage() {
  const { profile } = useAuthStore();
  const { isSuperAdmin, isAdmin } = usePermissions();

  const [users,        setUsers]        = useState([]);
  const [companies,    setCompanies]    = useState([]);
  const [loading,      setLoading]      = useState(true);
  const [saving,       setSaving]       = useState(null);
  const [resetLoading, setResetLoading] = useState(null);
  const [companyFilter, setCompanyFilter] = useState('all');
  const [showAdd,      setShowAdd]      = useState(false);
  const [newUser,      setNewUser]      = useState(EMPTY_NEW);
  const [adding,       setAdding]       = useState(false);

  const fetchData = useCallback(async () => {
    setLoading(true);
    // Şirketleri çek
    const { data: comps } = await supabase
      .from('companies')
      .select('id, name')
      .eq('is_active', true)
      .order('name');
    setCompanies(comps || []);

    // Kullanıcıları çek (super_admin: hepsi, company_admin: kendi şirketi)
    let q = supabase
      .from('profiles')
      .select('id, email, full_name, role, company_id, permissions, created_at')
      .order('created_at', { ascending: false });

    if (!isSuperAdmin && profile?.company_id) {
      q = q.eq('company_id', profile.company_id);
    }

    const { data, error } = await q;
    if (error) showToast('Kullanıcılar yüklenemedi: ' + error.message);
    else setUsers(data || []);
    setLoading(false);
  }, [isSuperAdmin, profile?.company_id]);

  useEffect(() => { fetchData(); }, [fetchData]);

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
    else showToast(`Şifre sıfırlama maili → ${email}`);
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
      const companyId = isSuperAdmin
        ? (newUser.company_id || null)
        : (profile?.company_id || null);

      const { data, error } = await supabase.auth.signUp({
        email:    newUser.email.trim(),
        password: newUser.password,
        options:  { data: { full_name: newUser.full_name.trim(), role: newUser.role, company_id: companyId } },
      });
      if (error) throw error;

      if (data?.user) {
        const { error: pe } = await supabase.from('profiles').upsert({
          id:          data.user.id,
          email:       newUser.email.trim(),
          full_name:   newUser.full_name.trim(),
          role:        newUser.role,
          company_id:  companyId,
          permissions: {},
        });
        if (pe) throw pe;
        showToast(`${newUser.full_name} eklendi ✓`);
        setShowAdd(false);
        setNewUser(EMPTY_NEW);
        await fetchData();
      }
    } catch (err) {
      showToast('Hata: ' + (err.message || 'Bilinmeyen hata'));
    } finally {
      setAdding(false);
    }
  }

  // Filtre
  const filtered = companyFilter === 'all'
    ? users
    : users.filter(u => u.company_id === companyFilter);

  const stats = {
    total:   filtered.length,
    admins:  filtered.filter(u => ['super_admin','company_admin'].includes(u.role)).length,
    noPerms: filtered.filter(u => u.role === 'user' && u.permissions?.modules?.length === 0).length,
  };

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
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10, marginBottom: 14 }}>
            <div>
              <label style={{ display: 'block', fontSize: 11, fontWeight: 700, color: '#64748b', marginBottom: 4 }}>Rol</label>
              <GlassSelect value={newUser.role} onChange={e => setNewUser(p => ({ ...p, role: e.target.value }))}>
                {ROLE_OPTIONS
                  .filter(r => isSuperAdmin || r.value !== 'super_admin')
                  .map(r => <option key={r.value} value={r.value}>{r.label}</option>)
                }
              </GlassSelect>
            </div>
            {isSuperAdmin && (
              <div>
                <label style={{ display: 'block', fontSize: 11, fontWeight: 700, color: '#64748b', marginBottom: 4 }}>Şirket</label>
                <GlassSelect value={newUser.company_id} onChange={e => setNewUser(p => ({ ...p, company_id: e.target.value }))}>
                  <option value="">— Şirket seç —</option>
                  {companies.map(c => <option key={c.id} value={c.id}>{c.name}</option>)}
                </GlassSelect>
              </div>
            )}
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

      {/* Filtre (super_admin için şirket filtresi) */}
      {isSuperAdmin && companies.length > 0 && (
        <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 16 }}>
          <span style={{ fontSize: 12, color: 'var(--muted)', fontWeight: 600 }}>Şirket:</span>
          <GlassSelect value={companyFilter} onChange={e => setCompanyFilter(e.target.value)} style={{ minWidth: 180 }}>
            <option value="all">Tüm Şirketler</option>
            {companies.map(c => <option key={c.id} value={c.id}>{c.name}</option>)}
          </GlassSelect>
          <span style={{ fontSize: 11, color: 'var(--muted)' }}>{filtered.length} kullanıcı</span>
        </div>
      )}

      {/* İstatistikler */}
      <div className="kpis" style={{ marginBottom: 20 }}>
        <div className="kpi"><div className="kl">Toplam</div><div className="kv cacc">{stats.total}</div></div>
        <div className="kpi"><div className="kl">Yönetici</div><div className="kv" style={{ color: 'var(--circ)' }}>{stats.admins}</div></div>
        <div className="kpi"><div className="kl">Yetkisiz Kullanıcı</div><div className="kv" style={{ color: 'var(--warn)' }}>{stats.noPerms}</div></div>
      </div>

      {/* Tablo */}
      <div style={{ background: 'var(--white)', border: '1px solid var(--border)', borderRadius: 'var(--r)', overflow: 'hidden', boxShadow: 'var(--sh)' }}>
        {loading ? (
          <div style={{ padding: 32, textAlign: 'center', color: 'var(--muted)', fontSize: 13 }}>Yükleniyor...</div>
        ) : filtered.length === 0 ? (
          <div style={{ padding: 32, textAlign: 'center', color: 'var(--muted)', fontSize: 13 }}>Kullanıcı bulunamadı.</div>
        ) : (
          <div style={{ overflowX: 'auto' }}>
            <table style={{ width: '100%', borderCollapse: 'collapse' }}>
              <thead>
                <tr style={{ borderBottom: '2px solid var(--border)', background: 'rgba(0,0,0,0.02)' }}>
                  {['Ad Soyad', 'Email', 'Rol', 'Modül & Ek Yetkiler', 'Kayıt', 'Şifre'].map(h => (
                    <th key={h} style={{ textAlign: 'left', padding: '10px 14px', fontSize: 11, fontWeight: 700, letterSpacing: '.4px', textTransform: 'uppercase', color: 'var(--muted)', whiteSpace: 'nowrap' }}>{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {filtered.map(u => (
                  <UserRow
                    key={u.id}
                    u={u}
                    companies={companies}
                    onUpdate={updateProfile}
                    onReset={sendPasswordReset}
                    saving={saving}
                    resetLoading={resetLoading}
                    canEditSuperAdmin={isSuperAdmin}
                  />
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      <div className="al al-i" style={{ marginTop: 14 }}>
        <strong>Modül yetkileri:</strong> Kullanıcı rolündeki hesaplar için modül chip'lerine tıklayarak erişimi açıp kapatabilirsiniz.
        Yönetici ve üstü roller için tüm yetkiler otomatik aktiftir.
      </div>
    </div>
  );
}
