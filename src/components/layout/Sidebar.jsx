// ── Sidebar — Sol navigasyon menüsü ───────────────────────────────────
import { NavLink } from 'react-router-dom';
import { useAuthStore } from '../../store/authStore.js';

const NAV_ITEMS = [
  {
    to: '/', label: 'Ana Sayfa', end: true,
    icon: (
      <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
        <rect x="3" y="3" width="7" height="7" rx="1.5"/><rect x="14" y="3" width="7" height="7" rx="1.5"/>
        <rect x="3" y="14" width="7" height="7" rx="1.5"/><rect x="14" y="14" width="7" height="7" rx="1.5"/>
      </svg>
    ),
  },
  {
    to: '/hesaplama/yeni', label: 'Yeni Hesaplama',
    icon: (
      <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
        <circle cx="12" cy="12" r="9"/><line x1="12" y1="8" x2="12" y2="16"/><line x1="8" y1="12" x2="16" y2="12"/>
      </svg>
    ),
  },
  {
    to: '/gecmis', label: 'Geçmiş',
    icon: (
      <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
        <circle cx="12" cy="12" r="9"/><polyline points="12 7 12 12 15.5 15.5"/>
      </svg>
    ),
  },
  {
    to: '/tanimlamalar', label: 'Tanımlamalar',
    icon: (
      <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
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
      <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
        <circle cx="9" cy="7" r="4"/><path d="M3 21v-2a4 4 0 0 1 4-4h4a4 4 0 0 1 4 4v2"/>
        <circle cx="17" cy="9" r="3"/><path d="M21 21v-1.5a3 3 0 0 0-3-3h-1"/>
      </svg>
    ),
  },
];

export function Sidebar() {
  const { profile, signOut } = useAuthStore();
  const isAdmin = profile?.role === 'admin';

  const initials = (profile?.name || 'U')
    .split(' ')
    .map(w => w[0])
    .join('')
    .toUpperCase()
    .slice(0, 2);

  return (
    <aside style={{
      width: 'var(--sidebar-w)', minHeight: '100vh',
      background: '#fafafa',
      display: 'flex', flexDirection: 'column',
      position: 'fixed', top: 0, left: 0, bottom: 0, zIndex: 100,
      borderRight: '1px solid #e8e8ed',
    }}>

      {/* Logo */}
      <div style={{ padding: '20px 16px 16px', borderBottom: '1px solid #e8e8ed' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
          <div style={{
            width: 30, height: 30, borderRadius: 8,
            background: '#0071e3',
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            fontSize: 13, fontWeight: 700, color: '#fff', flexShrink: 0,
          }}>A</div>
          <div>
            <div style={{ fontWeight: 700, fontSize: 13, color: '#1d1d1f', letterSpacing: '-0.2px' }}>
              AsisenEnergy
            </div>
            <div style={{ fontSize: 10.5, color: '#aeaeb2', fontWeight: 400, marginTop: 1 }}>
              PPR Metraj
            </div>
          </div>
        </div>
      </div>

      {/* Navigasyon */}
      <nav style={{ flex: 1, padding: '10px 10px', overflowY: 'auto' }}>
        <div style={{ fontSize: 10, fontWeight: 600, letterSpacing: '.5px', textTransform: 'uppercase', color: '#aeaeb2', padding: '6px 8px 6px' }}>
          Menü
        </div>

        {NAV_ITEMS.map(item => (
          <NavLink key={item.to} to={item.to} end={item.end}
            style={({ isActive }) => ({
              display: 'flex', alignItems: 'center', gap: 9,
              padding: '8px 10px', borderRadius: 8, marginBottom: 2,
              textDecoration: 'none', fontSize: 13, fontWeight: 500,
              transition: 'all .12s',
              ...(isActive
                ? { background: '#e8f2fd', color: '#0071e3' }
                : { background: 'transparent', color: '#1d1d1f' }
              ),
            })}
          >
            <span style={{ flexShrink: 0, display: 'flex', opacity: 0.85 }}>{item.icon}</span>
            {item.label}
          </NavLink>
        ))}

        {isAdmin && (
          <>
            <div style={{ fontSize: 10, fontWeight: 600, letterSpacing: '.5px', textTransform: 'uppercase', color: '#aeaeb2', padding: '14px 8px 6px' }}>
              Admin
            </div>
            {ADMIN_ITEMS.map(item => (
              <NavLink key={item.to} to={item.to}
                style={({ isActive }) => ({
                  display: 'flex', alignItems: 'center', gap: 9,
                  padding: '8px 10px', borderRadius: 8, marginBottom: 2,
                  textDecoration: 'none', fontSize: 13, fontWeight: 500,
                  transition: 'all .12s',
                  ...(isActive
                    ? { background: '#e8f2fd', color: '#0071e3' }
                    : { background: 'transparent', color: '#1d1d1f' }
                  ),
                })}
              >
                <span style={{ flexShrink: 0, display: 'flex', opacity: 0.85 }}>{item.icon}</span>
                {item.label}
              </NavLink>
            ))}
          </>
        )}
      </nav>

      {/* Kullanıcı & Çıkış */}
      <div style={{ padding: '10px 10px 14px', borderTop: '1px solid #e8e8ed' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 9, padding: '8px 10px', marginBottom: 4 }}>
          <div style={{
            width: 28, height: 28, borderRadius: 8, flexShrink: 0,
            background: '#0071e3',
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            fontSize: 10.5, fontWeight: 700, color: '#fff',
          }}>
            {initials}
          </div>
          <div style={{ overflow: 'hidden' }}>
            <div style={{ fontSize: 12.5, fontWeight: 600, color: '#1d1d1f', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
              {profile?.name || 'Kullanıcı'}
            </div>
            {isAdmin && (
              <div style={{ fontSize: 10, fontWeight: 600, color: '#0071e3', marginTop: 1 }}>
                Admin
              </div>
            )}
          </div>
        </div>
        <button onClick={() => signOut()} style={{
          display: 'flex', alignItems: 'center', gap: 7,
          width: '100%', background: 'transparent',
          border: '1px solid #e8e8ed',
          color: '#6e6e73', borderRadius: 8, padding: '7px 10px',
          fontSize: 12.5, fontWeight: 500, cursor: 'pointer',
          transition: 'all .12s',
        }}
          onMouseEnter={e => { e.currentTarget.style.borderColor = '#ffd0cc'; e.currentTarget.style.color = '#ff3b30'; e.currentTarget.style.background = '#fff5f4'; }}
          onMouseLeave={e => { e.currentTarget.style.borderColor = '#e8e8ed'; e.currentTarget.style.color = '#6e6e73'; e.currentTarget.style.background = 'transparent'; }}
        >
          <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <path d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4"/><polyline points="16 17 21 12 16 7"/><line x1="21" y1="12" x2="9" y2="12"/>
          </svg>
          Çıkış Yap
        </button>
      </div>
    </aside>
  );
}
