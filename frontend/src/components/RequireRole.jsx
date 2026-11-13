/**
 * 角色守卫：框架阶段只做前端可见性控制，真正的权限校验必须在后端。
 */
import { useAuth } from '../store/auth.jsx';

export function RequireRole({ role, children }) {
  const { user } = useAuth();

  if (!user || user.role !== role) {
    return (
      <section className="card state-card">
        <h2>403 · 无访问权限</h2>
        <p>
          该页面仅限 <code>{role}</code> 角色访问。当前账号角色：<code>{user?.role ?? 'unknown'}</code>。
        </p>
        <p className="muted">前端守卫只用于体验优化，后端仍会对每个接口做独立鉴权。</p>
      </section>
    );
  }

  return children;
}
