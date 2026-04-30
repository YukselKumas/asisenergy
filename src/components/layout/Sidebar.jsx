// ── Sidebar — Accordion navigasyon ─────────────────────────────────────
// QDMS benzeri: bölüm başlığına tıklanınca alt menü açılır/kapanır.
// Aktif rota hangi modüle aitse o bölüm otomatik açılır.

import { useState, useEffect } from 'react';
import { NavLink, useLocation } from 'react-router-dom';
import { useAuthStore }   from '../../store/authStore.js';
import { usePermissions } from '../../hooks/usePermissions.js';
import { MODULES }        from '../../core/moduleRegistry.js';

// ── Rol etiketleri ─────────────────────────────────────────────────────
const ROLE_INFO = {
  super_admin: { label: 'Süper Admin', color: '#ff9f0a' },
  user:        { label: 'Kullanıcı',   color: '#8e8e93' },
};

// ── SVG İkon seti ──────────────────────────────────────────────────────
const ICONS = {
  home: (
    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <path d="M3 9l9-6 9 6v11a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2z"/>
      <polyline points="9 22 9 12 15 12 15 22"/>
    </svg>
  ),
  pipe: (
    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <path d="M3 12h18M12 3v18"/>
      <circle cx="12" cy="12" r="9"/>
    </svg>
  ),
  fire: (
    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <path d="M8.5 14.5A2.5 2.5 0 0 0 11 12c0-1.38-.5-2-1-3-1.072-2.143-.224-4.054 2-6 .5 2.5 2 4.9 4 6.5 2 1.6 3 3.5 3 5.5a7 7 0 1 1-14 0c0-1.153.433-2.294 1-3a2.5 2.5 0 0 0 2.5 2.5z"/>
    </svg>
  ),
  plus: (
    <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
      <line x1="12" y1="5" x2="12" y2="19"/><line x1="5" y1="12" x2="19" y2="12"/>
    </svg>
  ),
  list: (
    <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <line x1="8" y1="6" x2="21" y2="6"/><line x1="8" y1="12" x2="21" y2="12"/><line x1="8" y1="18" x2="21" y2="18"/>
      <line x1="3" y1="6" x2="3.01" y2="6"/><line x1="3" y1="12" x2="3.01" y2="12"/><line x1="3" y1="18" x2="3.01" y2="18"/>
    </svg>
  ),
  settings: (
    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <circle cx="12" cy="12" r="3"/>
      <path d="M12 2v3M12 19v3M4.22 4.22l2.12 2.12M17.66 17.66l2.12 2.12M2 12h3M19 12h3M4.22 19.78l2.12-2.12M17.66 6.34l2.12-2.12"/>
    </svg>
  ),
  users: (
    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2"/>
      <circle cx="9" cy="7" r="4"/>
      <path d="M23 21v-2a4 4 0 0 0-3-3.87"/><path d="M16 3.13a4 4 0 0 1 0 7.75"/>
    </svg>
  ),
  building: (
    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <rect x="3" y="9" width="18" height="13"/><path d="M8 22V12h8v10"/><path d="M3 9l9-7 9 7"/>
    </svg>
  ),
  logout: (
    <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <path d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4"/>
      <polyline points="16 17 21 12 16 7"/><line x1="21" y1="12" x2="9" y2="12"/>
    </svg>
  ),
};

// ── Alt nav linki ──────────────────────────────────────────────────────
function NavItem({ to, label, iconKey, end, accentColor = '#0071e3' }) {
  return (
    <NavLink
      to={to}
      end={end}
      style={({ isActive }) => ({
        display: 'flex', alignItems: 'center', gap: 8,
        padding: '6px 10px 6px 10px', borderRadius: 6, marginBottom: 1,
        textDecoration: 'none', fontSize: 12.5, fontWeight: 500,
        borderLeft: isActive ? `2px solid ${accentColor}` : '2px solid transparent',
        background: isActive ? `rgba(${accentColor === '#0071e3' ? '0,113,227' : accentColor === '#ff3b30' ? '255,59,48' : '99,99,102'},0.08)` : 'transparent',
        color: isActive ? accentColor : '#3c3c43',
        transition: 'all .12s',
      })}
    >
      {iconKey && (
        <span style={{ width: 16, display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0, opacity: 0.7 }}>
          {ICONS[iconKey]}
        </span>
      )}
      {label}
    </NavLink>
  );
}

// ── Accordion bölüm ─────────────────────────────────────────────────────
function AccordionSection({ sectionId, label, iconKey, children, isActive, badge, disabled, accentColor, accentRgb, openSections, onToggle }) {
  const open = openSections[sectionId] ?? false;

  // Aktif rota bu bölümdeyse otomatik aç
  useEffect(() => {
    if (isActive && !open) onToggle(sectionId, true);
  }, [isActive]);                     // eslint-disable-line

  return (
    <div style={{ marginBottom: 2 }}>
      {/* Bölüm başlığı */}
      <button
        onClick={() => !disabled && onToggle(sectionId)}
        style={{
          width: '100%',
          display: 'flex', alignItems: 'center', gap: 8,
          padding: '8px 10px', borderRadius: 8,
          background: open && !disabled ? `rgba(${accentRgb},0.09)` : 'transparent',
          border: 'none',
          cursor: disabled ? 'not-allowed' : 'pointer',
          color: open && !disabled ? accentColor : '#1d1d1f',
          fontWeight: 600, fontSize: 13,
          transition: 'background .15s, color .15s',
          opacity: disabled ? 0.6 : 1,
        }}
      >
        {/* İkon */}
        <span style={{ width: 20, height: 20, display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
          {ICONS[iconKey]}
        </span>

        {/* Etiket */}
        <span style={{ flex: 1, textAlign: 'left' }}>{label}</span>

        {/* Badge */}
        {badge && (
          <span style={{
            fontSize: 9, fontWeight: 800, letterSpacing: '.3px',
            background: '#aeaeb2', color: '#fff',
            borderRadius: 999, padding: '1px 6px', flexShrink: 0,
          }}>
            {badge}
          </span>
        )}

        {/* Chevron */}
        {!disabled && (
          <svg
            width="11" height="11" viewBox="0 0 24 24" fill="none"
            stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"
            style={{
              flexShrink: 0, opacity: 0.5,
              transform: open ? 'rotate(90deg)' : 'rotate(0deg)',
              transition: 'transform .2s',
            }}
          >
            <polyline points="9 18 15 12 9 6"/>
          </svg>
        )}
      </button>

      {/* Alt öğeler — CSS max-height ile animasyonlu */}
      <div style={{
        overflow: 'hidden',
        maxHeight: open && !disabled ? 600 : 0,
        transition: 'max-height .22s ease',
      }}>
        <div style={{ paddingLeft: 10, paddingTop: 2, paddingBottom: 4 }}>
          {children}
        </div>
      </div>
    </div>
  );
}

// ── Bölüm etiketi ──────────────────────────────────────────────────────
function SectionLabel({ children }) {
  return (
    <div style={{
      fontSize: 9.5, fontWeight: 700, letterSpacing: '.8px',
      textTransform: 'uppercase', color: '#c7c7cc',
      padding: '14px 10px 5px',
    }}>
      {children}
    </div>
  );
}

// ── Ana bileşen ─────────────────────────────────────────────────────────
export function Sidebar() {
  const { profile, signOut } = useAuthStore();
  const { canAccessModule, canManageUsers, canManageDefinitions, isAdmin } = usePermissions();
  const location = useLocation();

  const role     = profile?.role ?? 'user';
  const roleInfo = ROLE_INFO[role] ?? ROLE_INFO.user;
  const fullName = profile?.full_name || 'Kullanıcı';
  const initials = fullName.split(' ').map(w => w[0]).join('').toUpperCase().slice(0, 2);

  // Hangi accordion bölümlerinin açık olduğunu tut
  const [openSections, setOpenSections] = useState({});

  function handleToggle(id, forceOpen) {
    setOpenSections(prev => ({
      ...prev,
      [id]: forceOpen !== undefined ? forceOpen : !prev[id],
    }));
  }

  // Aktif rota tespiti
  const isAdminActive = ['/tanimlamalar', '/kullanicilar'].some(p => location.pathname.startsWith(p));

  return (
    <aside style={{
      width: 'var(--sidebar-w)', minHeight: '100vh',
      background: 'rgba(250,250,252,0.94)',
      backdropFilter: 'blur(20px) saturate(180%)',
      WebkitBackdropFilter: 'blur(20px) saturate(180%)',
      display: 'flex', flexDirection: 'column',
      position: 'fixed', top: 0, left: 0, bottom: 0, zIndex: 100,
      borderRight: '1px solid rgba(0,0,0,0.08)',
      boxShadow: '2px 0 20px rgba(0,0,0,0.07)',
    }}>

      {/* ── Logo ── */}
      <div style={{ padding: '16px 14px 13px', borderBottom: '1px solid rgba(0,0,0,0.07)', flexShrink: 0 }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
          <div style={{
            width: 32, height: 32, borderRadius: 9,
            background: 'linear-gradient(135deg, #0071e3, #0a84ff)',
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            fontSize: 14, fontWeight: 800, color: '#fff', flexShrink: 0,
            boxShadow: '0 2px 8px rgba(0,113,227,0.35)',
          }}>A</div>
          <div>
            <div style={{ fontWeight: 700, fontSize: 13, color: '#1d1d1f', letterSpacing: '-0.2px' }}>
              AsisenEnergy
            </div>
            <div style={{ fontSize: 10, color: '#aeaeb2', fontWeight: 500, marginTop: 1 }}>
              Metraj Platformu
            </div>
          </div>
        </div>
      </div>

      {/* ── Navigasyon ── */}
      <nav style={{ flex: 1, padding: '8px 10px 8px', overflowY: 'auto' }}>

        {/* Ana Sayfa — accordion dışı direkt link */}
        <NavItem to="/" end label="Ana Sayfa" iconKey="home" accentColor="#0071e3" />

        {/* ── Modüller ── */}
        <SectionLabel>Modüller</SectionLabel>

        {MODULES.map(mod => {
          // Erişim yoksa modülü gizle (comingSoon olanlar her zaman görünür ama disabled)
          if (!mod.comingSoon && !canAccessModule(mod.id)) return null;

          const isModActive = (mod.navItems ?? []).some(item =>
            item.to === location.pathname ||
            (item.to !== '/' && location.pathname.startsWith(item.to.replace('/:id', '').replace(':id', '')))
          );

          return (
            <AccordionSection
              key={mod.id}
              sectionId={mod.id}
              label={mod.name}
              iconKey={mod.icon}
              isActive={isModActive}
              badge={mod.comingSoon ? 'Yakında' : undefined}
              disabled={mod.comingSoon}
              accentColor={mod.color}
              accentRgb={mod.colorRgb}
              openSections={openSections}
              onToggle={handleToggle}
            >
              {(mod.navItems ?? []).map(item => (
                <NavItem
                  key={item.to}
                  to={item.to}
                  label={item.label}
                  iconKey={item.icon}
                  accentColor={mod.color}
                />
              ))}
            </AccordionSection>
          );
        })}

        {/* ── Sistem (admin veya ilgili yetkisi olan) ── */}
        {(isAdmin || canManageUsers() || canManageDefinitions()) && (
          <>
            <SectionLabel>Sistem</SectionLabel>
            <AccordionSection
              sectionId="yonetim"
              label="Yönetim"
              iconKey="settings"
              isActive={isAdminActive}
              accentColor="#636366"
              accentRgb="99,99,102"
              openSections={openSections}
              onToggle={handleToggle}
            >
              {canManageDefinitions() && (
                <NavItem to="/tanimlamalar" label="Tanımlamalar" iconKey="settings" accentColor="#636366" />
              )}
              {canManageUsers() && (
                <NavItem to="/kullanicilar" label="Kullanıcılar" iconKey="users" accentColor="#636366" />
              )}
            </AccordionSection>
          </>
        )}

      </nav>

      {/* ── Kullanıcı + Çıkış ── */}
      <div style={{ padding: '8px 10px 13px', borderTop: '1px solid rgba(0,0,0,0.07)', flexShrink: 0 }}>
        {/* Kullanıcı kartı */}
        <div style={{ display: 'flex', alignItems: 'center', gap: 9, padding: '6px 10px', marginBottom: 7 }}>
          <div style={{
            width: 30, height: 30, borderRadius: 8, flexShrink: 0,
            background: roleInfo.color,
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            fontSize: 11, fontWeight: 700, color: '#fff',
          }}>
            {initials}
          </div>
          <div style={{ overflow: 'hidden', flex: 1 }}>
            <div style={{ fontSize: 12, fontWeight: 600, color: '#1d1d1f', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
              {fullName}
            </div>
            <div style={{ fontSize: 10, fontWeight: 600, color: roleInfo.color, marginTop: 1 }}>
              {roleInfo.label}
            </div>
          </div>
        </div>

        {/* Çıkış butonu */}
        <button
          onClick={() => signOut()}
          style={{
            display: 'flex', alignItems: 'center', gap: 7,
            width: '100%', background: 'rgba(255,255,255,0.5)',
            border: '1px solid rgba(209,213,219,0.6)',
            color: '#6e6e73', borderRadius: 999, padding: '7px 12px',
            fontSize: 12, fontWeight: 500, cursor: 'pointer',
            transition: 'all .15s',
            backdropFilter: 'blur(8px)',
            WebkitBackdropFilter: 'blur(8px)',
          }}
          onMouseEnter={e => {
            e.currentTarget.style.borderColor = 'rgba(255,59,48,0.3)';
            e.currentTarget.style.color = '#ff3b30';
            e.currentTarget.style.background = 'rgba(255,59,48,0.07)';
          }}
          onMouseLeave={e => {
            e.currentTarget.style.borderColor = 'rgba(209,213,219,0.6)';
            e.currentTarget.style.color = '#6e6e73';
            e.currentTarget.style.background = 'rgba(255,255,255,0.5)';
          }}
        >
          {ICONS.logout}
          Çıkış Yap
        </button>
      </div>
    </aside>
  );
}
