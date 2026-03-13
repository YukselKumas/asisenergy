// ── Sidebar — Sol navigasyon menüsü ───────────────────────────────────
import { NavLink } from 'react-router-dom';
import { useAuthStore } from '../../store/authStore.js';

const NAV_ITEMS = [
  {
    to: '/', label: 'Dashboard', end: true,
    icon: (
      <svg width="17" height="17" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
        <rect x="3" y="3" width="7" height="7" rx="1"/><rect x="14" y="3" width="7" height="7" rx="1"/>
        <rect x="3" y="14" width="7" height="7" rx="1"/><rect x="14" y="14" width="7" height="7" rx="1"/>
      </svg>
    ),
  },
  {
    to: '/hesaplama/yeni', label: 'Yeni Hesaplama',
    icon: (
      <svg width="17" height="17" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
        <circle cx="12" cy="12" r="9"/><line x1="12" y1="8" x2="12" y2="16"/><line x1="8" y1="12" x2="16" y2="12"/>
      </svg>
    ),
  },
  {
    to: '/gecmis', label: 'Geçmiş',
    icon: (
      <svg width="17" height="17" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
        <circle cx="12" cy="12" r="9"/><polyline points="12 7 12 12 15.5 15.5"/>
      </svg>
    ),
  },
  {
    to: '/tanimlamalar', label: 'Tanımlamalar',
    icon: (
      <svg width="17" height="17" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
        <circle cx="12" cy="12" r="3"/>
        <path d="M12 2v3M12 19v3M4.22 4.22l2.12 2.12M17.66 17.66l2.12 2.12M2 12h3M19 12h3M4.22 19.78l2.12-2.12M17.66 6.34l2.12-2.12"/>
      </svg>
    ),
  },
];

const ADMIN_ITEMS = [
  {
    to: '/kullanicilar', label: 'Kullanıcılar',
    icon: (
      <svg width="17" height="17" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
        <circle cx="9" cy="7" r="4"/><path d="M3 21v-2a4 4 0 0 1 4-4h4a4 4 0 0 1 4 4v2"/>
        <circle cx="17" cy="9" r="3"/><path d="M21 21v-1.5a3 3 0 0 0-3-3h-1"/>
      </svg>
    ),
  },
];

const linkBase = {
  display: 'flex', alignItems: 'center', gap: 10,
  padding: '9px 12px', borderRadius: 8, marginBottom: 2,
  textDecoration: 'none', fontSize: 13, fontWeight: 600,
  transition: 'all .15s', whiteSpace: 'nowrap',
};

const linkActive = {
  color: '#fff',
  background: 'rgba(99,102,241,0.25)',
  boxShadow: 'inset 0 0 0 1px rgba(99,102,241,0.4)',
};

const linkIdle = {
  color: '#94a3b8',
  background: 'transparent',
};

export function Sidebar() {
  const { profile, signOut } = useAuthStore();
  const isAdmin = profile?.role === 'admin';

  // Kullanıcı adından baş harfler
  const initials = (profile?.name || 'U')
    .split(' ')
    .map(w => w[0])
    .join('')
    .toUpperCase()
    .slice(0, 2);

  return (
    <aside style={{
      width: 'var(--sidebar-w)', minHeight: '100vh',
      background: 'linear-gradient(180deg, #0f172a 0%, #111827 100%)',
      display: 'flex', flexDirection: 'column',
      position: 'fixed', top: 0, left: 0, bottom: 0, zIndex: 100,
      borderRight: '1px solid rgba(255,255,255,0.06)',
    }}>

      {/* Logo */}
      <div style={{ padding: '22px 18px 18px', borderBottom: '1px solid rgba(255,255,255,0.06)' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
          <div style={{
            width: 32, height: 32, borderRadius: 8,
            background: 'linear-gradient(135deg, #6366f1, #4f46e5)',
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            fontSize: 14, fontWeight: 800, color: '#fff', flexShrink: 0,
            boxShadow: '0 2px 8px rgba(99,102,241,0.4)',
          }}>A</div>
          <div>
            <div style={{ fontWeight: 800, fontSize: 13, color: '#f8fafc', letterSpacing: '-.2px' }}>
              AsisenEnergy
            </div>
            <div style={{ fontSize: 10, color: '#475569', letterSpacing: '.5px', textTransform: 'uppercase' }}>
              PPR Metraj
            </div>
          </div>
        </div>
      </div>

      {/* Navigasyon */}
      <nav style={{ flex: 1, padding: '12px 10px', overflowY: 'auto' }}>
        <div style={{ fontSize: 9, fontWeight: 800, letterSpacing: '.8px', textTransform: 'uppercase', color: '#334155', padding: '0 12px 8px' }}>
          Menü
        </div>

        {NAV_ITEMS.map(item => (
          <NavLink key={item.to} to={item.to} end={item.end}
            style={({ isActive }) => ({ ...linkBase, ...(isActive ? linkActive : linkIdle) })}
          >
            <span style={{ flexShrink: 0, display: 'flex' }}>{item.icon}</span>
            {item.label}
          </NavLink>
        ))}

        {isAdmin && (
          <>
            <div style={{ fontSize: 9, fontWeight: 800, letterSpacing: '.8px', textTransform: 'uppercase', color: '#334155', padding: '14px 12px 8px' }}>
              Admin
            </div>
            {ADMIN_ITEMS.map(item => (
              <NavLink key={item.to} to={item.to}
                style={({ isActive }) => ({ ...linkBase, ...(isActive ? linkActive : linkIdle) })}
              >
                <span style={{ flexShrink: 0, display: 'flex' }}>{item.icon}</span>
                {item.label}
              </NavLink>
            ))}
          </>
        )}
      </nav>

      {/* Kullanıcı & Çıkış */}
      <div style={{ padding: '12px 10px 16px', borderTop: '1px solid rgba(255,255,255,0.06)' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 9, padding: '8px 10px', marginBottom: 6 }}>
          <div style={{
            width: 30, height: 30, borderRadius: 8, flexShrink: 0,
            background: 'linear-gradient(135deg, #6366f1, #818cf8)',
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            fontSize: 11, fontWeight: 800, color: '#fff',
          }}>
            {initials}
          </div>
          <div style={{ overflow: 'hidden' }}>
            <div style={{ fontSize: 12, fontWeight: 700, color: '#e2e8f0', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
              {profile?.name || 'Kullanıcı'}
            </div>
            {isAdmin && (
              <div style={{ fontSize: 9, fontWeight: 800, letterSpacing: '.5px', textTransform: 'uppercase', color: '#818cf8' }}>
                Admin
              </div>
            )}
          </div>
        </div>
        <button onClick={() => signOut()} style={{
          display: 'flex', alignItems: 'center', gap: 7,
          width: '100%', background: 'transparent',
          border: '1px solid rgba(255,255,255,0.08)',
          color: '#64748b', borderRadius: 7, padding: '7px 12px',
          fontSize: 12, fontWeight: 600, cursor: 'pointer',
          transition: 'all .15s',
        }}
          onMouseEnter={e => { e.currentTarget.style.borderColor = 'rgba(239,68,68,0.4)'; e.currentTarget.style.color = '#f87171'; }}
          onMouseLeave={e => { e.currentTarget.style.borderColor = 'rgba(255,255,255,0.08)'; e.currentTarget.style.color = '#64748b'; }}
        >
          <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <path d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4"/><polyline points="16 17 21 12 16 7"/><line x1="21" y1="12" x2="9" y2="12"/>
          </svg>
          Çıkış Yap
        </button>
      </div>
    </aside>
  );
}
