import { createBrowserRouter, Navigate } from 'react-router-dom';
import AppLayout from './layouts/AppLayout.jsx';
import { HomeRedirect, RequireAuth, RequireRole } from './auth.jsx';
import LoginPage from './pages/LoginPage.jsx';
import DashboardPage from './pages/DashboardPage.jsx';
import ProductsPage from './pages/ProductsPage.jsx';
import ProductImportPage from './pages/ProductImportPage.jsx';
import SalesPage from './pages/SalesPage.jsx';
import SalesHistoryPage from './pages/SalesHistoryPage.jsx';
import UsersPage from './pages/UsersPage.jsx';

export const router = createBrowserRouter([
  { path: '/login', element: <LoginPage /> },
  {
    path: '/',
    element: (
      <RequireAuth>
        <AppLayout />
      </RequireAuth>
    ),
    children: [
      { index: true, element: <HomeRedirect /> },
      {
        path: 'dashboard',
        element: (
          <RequireRole roles={['admin', 'superadmin']}>
            <DashboardPage />
          </RequireRole>
        ),
      },
      {
        path: 'products',
        element: (
          <RequireRole roles={['admin', 'superadmin']}>
            <ProductsPage />
          </RequireRole>
        ),
      },
      {
        path: 'products/import',
        element: (
          <RequireRole roles={['admin', 'superadmin']}>
            <ProductImportPage />
          </RequireRole>
        ),
      },
      { path: 'sales', element: <SalesPage /> },
      { path: 'sales-history', element: <SalesHistoryPage adminView /> },
      { path: 'mis-ventas', element: <SalesHistoryPage adminView={false} /> },
      {
        path: 'users',
        element: (
          <RequireRole roles={['admin', 'superadmin']}>
            <UsersPage />
          </RequireRole>
        ),
      },
      { path: '*', element: <Navigate to="/" replace /> },
    ],
  },
]);
