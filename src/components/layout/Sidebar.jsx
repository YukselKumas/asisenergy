// ── Sidebar — Sol navigasyon menüsü ───────────────────────────────────
// Modül bazlı navigasyon. MODULES registry'den beslenecek şekilde tasarlandı.

import { NavLink } from 'react-router-dom';
import { useAuthStore } from '../../store/authStore.js';
import { MODULES } from '../../core/moduleRegistry.js';

// ── İkonlar ────────────────────────────────────────────────────────────
const Icon = ({ d, size = 16 }) => (
  <svg width={size} height={size} viewBox="0 0 24 24" fill="none"
    stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
    {typeof d === 'string' ? <path d={d} /> : d}
  </svg>
);

const ICONS = {
  home:    <><rect x="3" y="3" width="7" height="7" rx="1.5"/><rect x="14" y="3" width="7" height="7" rx="1.5"/><rect x="3" y="14" width="7" height="7" rx="1.5"/><rect x="14" y="14" width="7" height="7" rx="1.5"/></>,
  plus:    <><circle cx="12" cy="12" r="9"/><line x1="12" y1="8" x2="12" y2="16"/><line x1="8" y1="12" x2="16" y2="12"/></>,
  history: <><circle cx="12" cy="12" r="9"/><polyline points="12 7 12 12 15.5 15.5"/></>,
  settings:<><circle cx="12" cy="12" r="3"/><path d="M12 2v3M12 19v3M4.22 4.22l2.12 2.12M17.66 17.66l2.12 2.12M2 12h3M19 12h3M4.22 19.78l2.12-2.12M17.66 6.34l2.12-2.12"/></>,
  users:   <><circle cx="9" cy="7" r="4"/><path d="M3 21v-2a4 4 0 0 1 4-4h4a4 4 0 0 1 4 4v2"/><circle cx="17" cy="9" r="3"/><path d="M21 21v-1.5a3 3 0 0 0-3-3h-1"/></>,
  logout:  <><path d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4"/><polyline points="16 17 21 12 16 7"/><line x1="21" y1="12" x2="9" y2="12"/></>,
  building:<><rect x="3" y="9" width="18" height="12" rx="2"/><path d="M9 21V9M15 21V9"/><path d="M3 9l9-6 9 6"/></>,
};

const ROLE_LABELS = {
  super_admin:   { label: 'Süper Admin', color: '#ff9f0a' },
  company_admin: { label: 'Yönetici',    color: '#0071e3' },
  user:          { label: 'Kullanıcı',   color: '#6e6e73' },
};

function NavItem({ to, end, icon, label }) {
  return (
    <NavLink to={to} end={end}
      style={({ isActive }) => ({
        display: 'flex', alignItems: 'center', gap: 9,
        padding: '7px 10px', borderRadius: 8, marginBottom: 2,
        textDecoration: 'none', fontSize: 13, fontWeight: 500,
        transition: 'all .12s',
        ...(isActive
          ? { background: 'rgba(0,113,227,0.10)', color: '#0071e3' }
          : { background: 'transparent', color: '#1d1d1f' }
        ),
      })}
    >
      <span style={{ flexShrink: 0, display: 'flex', opacity: 0.8 }}>
        <svg width="16" height="16" viewBox="0 0 24 24" fill="none"
          stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
          {icon}
        </svg>
      </span>
      {label}
    </NavLink>
  );
}

function SectionLabel({ children }) {
  return (
    <div style={{
      fontSize: 10, fontWeight: 700, letterSpacing: '.6px',
      textTransform: 'uppercase', color: '#aeaeb2',
      padding: '12px 8px 5px',
    }}>
      {children}
    </div>
  );
}

export function Sidebar() {
  const { profile, signOut } = useAuthStore();

  const role      = profile?.role ?? 'user';
  const roleInfo  = ROLE_LABELS[role] ?? ROLE_LABELS.user;
  const fullName  = profile?.full_name || profile?.name || 'Kullanıcı';
  const initials  = fullName.split(' ').map(w => w[0]).join('').toUpperCase().slice(0, 2);
  const isAdmin   = ['super_admin', 'company_admin'].includes(role);
  const isSuperAdmin = role === 'super_admin';

  return (
    <aside style={{
      width: 'var(--sidebar-w)', minHeight: '100vh',
      background: 'rgba(250,250,252,0.88)',
      backdropFilter: 'blur(24px) saturate(180%)',
      WebkitBackdropFilter: 'blur(24px) saturate(180%)',
      display: 'flex', flexDirection: 'column',
      position: 'fixed', top: 0, left: 0, bottom: 0, zIndex: 100,
      borderRight: '1px solid rgba(255,255,255,0.55)',
      boxShadow: '2px 0 16px rgba(0,0,0,0.06)',
    }}>

      {/* Logo + Şirket */}
      <div style={{ padding: '18px 14px 14px', borderBottom: '1px solid rgba(0,0,0,0.06)' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
          <div style={{
            width: 32, height: 32, borderRadius: 9, background: '#0071e3',
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            fontSize: 14, fontWeight: 800, color: '#fff', flexShrink: 0,
          }}>A</div>
          <div style={{ overflow: 'hidden' }}>
            <div style={{ fontWeight: 700, fontSize: 13, color: '#1d1d1f', letterSpacing: '-0.2px' }}>
              AsisenEnergy
            </div>
            <div style={{ fontSize: 10.5, color: '#aeaeb2', fontWeight: 400, marginTop: 1, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
              PPR Metraj Platformu
            </div>
          </div>
        </div>
      </div>

      {/* Navigasyon */}
      <nav style={{ flex: 1, padding: '6px 10px', overflowY: 'auto' }}>

        {/* Ana */}
        <SectionLabel>Genel</SectionLabel>
        <NavItem to="/" end icon={ICONS.home} label="Ana Sayfa" />

        {/* Modüller — registry'den */}
        {MODULES.map(mod => (
          <div key={mod.id}>
            <SectionLabel>{mod.name}</SectionLabel>
            {mod.navItems.map(item => (
              <NavItem key={item.to} to={item.to}
                icon={item.to.includes('yeni') ? ICONS.plus : ICONS.history}
                label={item.label}
              />
            ))}
          </div>
        ))}

        {/* Yönetim */}
        {isAdmin && (
          <>
            <SectionLabel>Yönetim</SectionLabel>
            <NavItem to="/tanimlamalar" icon={ICONS.settings} label="Tanımlamalar" />
            <NavItem to="/kullanicilar" icon={ICONS.users} label="Kullanıcılar" />
          </>
        )}

        {/* Süper Admin */}
        {isSuperAdmin && (
          <>
            <SectionLabel>Platform</SectionLabel>
            <NavItem to="/sirketler" icon={ICONS.building} label="Şirketler" />
          </>
        )}
      </nav>

      {/* Kullanıcı Bilgisi + Çıkış */}
      <div style={{ padding: '10px 10px 14px', borderTop: '1px solid rgba(0,0,0,0.06)' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 9, padding: '6px 10px', marginBottom: 6 }}>
          <div style={{
            width: 30, height: 30, borderRadius: 8, flexShrink: 0,
            background: roleInfo.color,
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            fontSize: 11, fontWeight: 700, color: '#fff',
          }}>
            {initials}
          </div>
          <div style={{ overflow: 'hidden', flex: 1 }}>
            <div style={{ fontSize: 12.5, fontWeight: 600, color: '#1d1d1f', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
              {fullName}
            </div>
            <div style={{ fontSize: 10, fontWeight: 600, color: roleInfo.color, marginTop: 1 }}>
              {roleInfo.label}
            </div>
          </div>
        </div>
        <button onClick={() => signOut()} style={{
          display: 'flex', alignItems: 'center', gap: 7,
          width: '100%', background: 'rgba(255,255,255,0.5)',
          border: '1px solid rgba(209,213,219,0.6)',
          color: '#6e6e73', borderRadius: 999, padding: '7px 12px',
          fontSize: 12.5, fontWeight: 500, cursor: 'pointer',
          transition: 'all .15s',
          backdropFilter: 'blur(8px)',
          WebkitBackdropFilter: 'blur(8px)',
        }}
          onMouseEnter={e => {
            e.currentTarget.style.borderColor = 'rgba(255,59,48,0.30)';
            e.currentTarget.style.color = '#ff3b30';
            e.currentTarget.style.background = 'rgba(255,59,48,0.07)';
          }}
          onMouseLeave={e => {
            e.currentTarget.style.borderColor = 'rgba(209,213,219,0.60)';
            e.currentTarget.style.color = '#6e6e73';
            e.currentTarget.style.background = 'rgba(255,255,255,0.5)';
          }}
        >
          <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            {ICONS.logout}
          </svg>
          Çıkış Yap
        </button>
      </div>
    </aside>
  );
}
