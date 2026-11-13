/**
 * 路由守卫：未登录访问受限页面时跳转登录页，并记住来源路径。
 */
import { Navigate, useLocation } from 'react-router-dom';
import { useAuth } from '../store/auth.jsx';
import { FullPageLoading } from './StateViews.jsx';

export function RequireAuth({ children }) {
  const { status } = useAuth();
  const location = useLocation();

  if (status === 'booting') {
    return <FullPageLoading label="正在校验登录状态…" />;
  }

  if (status !== 'authenticated') {
    return <Navigate to="/login" replace state={{ from: location }} />;
  }

  return children;
}
