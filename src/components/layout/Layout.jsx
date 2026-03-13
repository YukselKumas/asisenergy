// ── Layout — Ana sayfa düzeni (Sidebar + içerik alanı) ────────────────
import { Outlet } from 'react-router-dom';
import { Sidebar } from './Sidebar.jsx';

export function Layout() {
  return (
    <div style={{ display: 'flex', minHeight: '100vh' }}>
      <Sidebar />
      <main style={{
        marginLeft: 'var(--sidebar-w)',
        flex:       1,
        padding:    '28px 24px 60px',
        maxWidth:   '1100px',
        width:      '100%',
      }}>
        <Outlet />
      </main>
    </div>
  );
}
