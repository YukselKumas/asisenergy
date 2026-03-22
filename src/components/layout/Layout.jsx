// ── Layout — Ana sayfa düzeni ──────────────────────────────────────────
import { Outlet, useLocation } from 'react-router-dom';
import { Sidebar } from './Sidebar.jsx';

export function Layout() {
  const location = useLocation();
  // Her rota değişikliğinde sayfayı yeniden mount et (stale data önleme)
  // Sadece pathname tabanlı — query/hash değişiklikleri dahil edilmez
  const routeKey = location.pathname;

  return (
    <div style={{ display: 'flex', minHeight: '100vh', background: 'transparent' }}>
      <Sidebar />
      <main style={{
        marginLeft: 'var(--sidebar-w)',
        flex: 1,
        padding: '32px 28px 60px',
        maxWidth: 'calc(100vw - var(--sidebar-w))',
        minWidth: 0,
      }}>
        <div style={{ maxWidth: 1080, margin: '0 auto' }} key={routeKey}>
          <Outlet />
        </div>
      </main>
    </div>
  );
}
