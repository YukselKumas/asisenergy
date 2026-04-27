// ── RequireAuth — Oturum koruma sarmalayıcı ───────────────────────────
// Giriş yapılmamışsa /login'e yönlendirir.
// authStore.loading süresiz kalmasını önlemek için 5s timeout var.

import { useEffect, useState } from 'react';
import { Navigate } from 'react-router-dom';
import { useAuthStore } from '../../store/authStore.js';

export function RequireAuth({ children }) {
  const { user, loading } = useAuthStore();
  const [timedOut, setTimedOut] = useState(false);

  // 5 saniye sonra hâlâ loading=true ise zorla kapat
  useEffect(() => {
    if (!loading) return;
    const t = setTimeout(() => setTimedOut(true), 5000);
    return () => clearTimeout(t);
  }, [loading]);

  if (loading && !timedOut) {
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
