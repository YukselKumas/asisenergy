// ── Sidebar — Sol navigasyon menüsü ───────────────────────────────────
import { NavLink } from 'react-router-dom';
import { useAuthStore } from '../../store/authStore.js';

const NAV_ITEMS = [
  { to: '/',               label: 'Dashboard',      icon: '⊞' },
  { to: '/hesaplama/yeni', label: 'Yeni Hesaplama', icon: '＋' },
  { to: '/gecmis',         label: 'Geçmiş',         icon: '◷' },
  { to: '/tanimlamalar',   label: 'Tanımlamalar',   icon: '⚙' },
];

const ADMIN_ITEMS = [
  { to: '/kullanicilar', label: 'Kullanıcılar', icon: '👤' },
];

export function Sidebar() {
  const { profile, signOut } = useAuthStore();
  const isAdmin = profile?.role === 'admin';

  return (
    <aside style={{
      width:      'var(--sidebar-w)',
      minHeight:  '100vh',
      background: '#0f172a',
      display:    'flex',
      flexDirection: 'column',
      padding:    '0',
      flexShrink: 0,
      position:   'fixed',
      top: 0, left: 0, bottom: 0,
      zIndex: 100,
    }}>
      {/* Logo */}
      <div style={{
        padding:    '20px 18px 16px',
        borderBottom: '1px solid rgba(255,255,255,0.07)',
      }}>
        <div style={{ fontFamily:'var(--mono)', fontWeight:700, fontSize:13, color:'#60a5fa' }}>
          AsisenEnergy
        </div>
        <div style={{ fontSize:10, color:'#475569', marginTop:2, letterSpacing:'.5px', textTransform:'uppercase' }}>
          PPR Metraj
        </div>
      </div>

      {/* Navigasyon */}
      <nav style={{ flex:1, padding:'12px 8px' }}>
        {NAV_ITEMS.map(item => (
          <NavLink
            key={item.to}
            to={item.to}
            end={item.to === '/'}
            style={({ isActive }) => ({
              display:       'flex',
              alignItems:    'center',
              gap:           10,
              padding:       '9px 12px',
              borderRadius:  7,
              marginBottom:  3,
              textDecoration:'none',
              fontSize:      13,
              fontWeight:    600,
              color:         isActive ? '#fff' : '#94a3b8',
              background:    isActive ? 'rgba(99,102,241,0.2)' : 'transparent',
              borderLeft:    isActive ? '2px solid #6366f1' : '2px solid transparent',
              transition:    'all .15s',
            })}
          >
            <span style={{ fontSize:15 }}>{item.icon}</span>
            {item.label}
          </NavLink>
        ))}

        {/* Admin bölümü */}
        {isAdmin && (
          <>
            <div style={{ fontSize:9, fontWeight:700, letterSpacing:'.5px', textTransform:'uppercase', color:'#334155', padding:'12px 12px 4px' }}>
              Admin
            </div>
            {ADMIN_ITEMS.map(item => (
              <NavLink
                key={item.to}
                to={item.to}
                style={({ isActive }) => ({
                  display:       'flex',
                  alignItems:    'center',
                  gap:           10,
                  padding:       '9px 12px',
                  borderRadius:  7,
                  marginBottom:  3,
                  textDecoration:'none',
                  fontSize:      13,
                  fontWeight:    600,
                  color:         isActive ? '#fff' : '#94a3b8',
                  background:    isActive ? 'rgba(99,102,241,0.2)' : 'transparent',
                  borderLeft:    isActive ? '2px solid #6366f1' : '2px solid transparent',
                })}
              >
                <span>{item.icon}</span>
                {item.label}
              </NavLink>
            ))}
          </>
        )}
      </nav>

      {/* Kullanıcı & Çıkış */}
      <div style={{
        padding:    '12px 16px',
        borderTop:  '1px solid rgba(255,255,255,0.07)',
        fontSize:   12,
      }}>
        <div style={{ color:'#94a3b8', marginBottom:6, overflow:'hidden', textOverflow:'ellipsis', whiteSpace:'nowrap' }}>
          {profile?.name || 'Kullanıcı'}
          {isAdmin && (
            <span style={{ marginLeft:6, background:'#4f46e5', color:'#fff', fontSize:9, padding:'1px 5px', borderRadius:3, fontWeight:700 }}>
              ADMIN
            </span>
          )}
        </div>
        <button
          onClick={() => signOut()}
          style={{
            background: 'transparent',
            border:     '1px solid rgba(255,255,255,0.1)',
            color:      '#64748b',
            borderRadius: 6,
            padding:    '5px 10px',
            fontSize:   11,
            cursor:     'pointer',
            width:      '100%',
            textAlign:  'left',
          }}
        >
          ↩ Çıkış Yap
        </button>
      </div>
    </aside>
  );
}
