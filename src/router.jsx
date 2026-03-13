// ── Router — React Router v6 rota tanımları ───────────────────────────
// Tüm uygulama rotaları burada merkezi olarak yönetilir.

import { createBrowserRouter } from 'react-router-dom';
import { Layout }             from './components/layout/Layout.jsx';
import { RequireAuth }        from './components/layout/RequireAuth.jsx';
import { LoginPage }          from './pages/LoginPage.jsx';
import { DashboardPage }      from './pages/DashboardPage.jsx';
import { NewCalculationPage } from './pages/NewCalculationPage.jsx';
import { HistoryPage }        from './pages/HistoryPage.jsx';
import { DefinitionsPage }    from './pages/DefinitionsPage.jsx';

export const router = createBrowserRouter([
  {
    path: '/login',
    element: <LoginPage />,
  },
  {
    // Giriş gerektiren tüm sayfalar Layout içinde sarmalanır
    element: <RequireAuth><Layout /></RequireAuth>,
    children: [
      { index: true,              element: <DashboardPage /> },
      { path: 'hesaplama/yeni',   element: <NewCalculationPage /> },
      { path: 'hesaplama/:id',    element: <NewCalculationPage /> },
      { path: 'gecmis',           element: <HistoryPage /> },
      { path: 'tanimlamalar',     element: <DefinitionsPage /> },
    ],
  },
]);
