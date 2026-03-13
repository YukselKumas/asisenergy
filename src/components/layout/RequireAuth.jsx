// ── RequireAuth — Oturum koruma sarmalayıcı ───────────────────────────
// Giriş yapılmamışsa /login'e yönlendirir.

import { Navigate } from 'react-router-dom';
import { useAuthStore } from '../../store/authStore.js';

export function RequireAuth({ children }) {
  const { user, loading } = useAuthStore();

  // İlk oturum kontrolü henüz tamamlanmadıysa yüklenme göster
  if (loading) {
    return (
      <div style={{
        display:        'flex',
        alignItems:     'center',
        justifyContent: 'center',
        minHeight:      '100vh',
        color:          'var(--muted)',
        fontFamily:     'var(--mono)',
        fontSize:       13,
      }}>
        Yükleniyor...
      </div>
    );
  }

  if (!user) return <Navigate to="/login" replace />;

  return children;
}
