// ── App — Uygulama kökü ────────────────────────────────────────────────
// Router provider, Toast container ve Auth başlatma.

import { useEffect } from 'react';
import { RouterProvider } from 'react-router-dom';
import { router } from './router.jsx';
import { useAuthStore } from './store/authStore.js';
import { ToastContainer } from './components/ui/Toast.jsx';

export function App() {
  const { init } = useAuthStore();

  // Uygulama açılışında Supabase oturum dinleyicisini başlat
  useEffect(() => {
    init();
  }, []);

  return (
    <>
      <RouterProvider router={router} />
      <ToastContainer />
    </>
  );
}
