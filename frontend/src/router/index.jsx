/**
 * 前端路由表
 * ---------------------------------------------------------------------------
 * - /login 公开
 * - 其余页面包在 RequireAuth + MainLayout 中
 * - /admin 额外要求 admin 角色
 */
import { Route, Routes } from 'react-router-dom';
import { AuthLayout } from '../layouts/AuthLayout.jsx';
import { MainLayout } from '../layouts/MainLayout.jsx';
import { RequireAuth } from '../components/RequireAuth.jsx';
import { RequireRole } from '../components/RequireRole.jsx';
import { LoginPage } from '../pages/LoginPage.jsx';
import { DashboardPage } from '../pages/DashboardPage.jsx';
import { BusinessListPage } from '../pages/BusinessListPage.jsx';
import { BusinessDetailPage } from '../pages/BusinessDetailPage.jsx';
import { AdminPage } from '../pages/AdminPage.jsx';
import { NotFoundPage } from '../pages/NotFoundPage.jsx';

export function AppRoutes() {
  return (
    <Routes>
      <Route element={<AuthLayout />}>
        <Route path="/login" element={<LoginPage />} />
      </Route>

      <Route
        element={
          <RequireAuth>
            <MainLayout />
          </RequireAuth>
        }
      >
        <Route index element={<DashboardPage />} />
        <Route path="business" element={<BusinessListPage />} />
        <Route path="business/:id" element={<BusinessDetailPage />} />
        <Route
          path="admin"
          element={
            <RequireRole role="admin">
              <AdminPage />
            </RequireRole>
          }
        />
      </Route>

      <Route path="*" element={<NotFoundPage />} />
    </Routes>
  );
}
