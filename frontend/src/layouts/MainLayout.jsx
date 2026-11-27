/**
 * 主布局：登录后页面统一外壳（顶栏 + 内容 + 页脚）
 */
import { Outlet } from 'react-router-dom';
import { AppHeader } from '../components/AppHeader.jsx';

export function MainLayout() {
  return (
    <div className="app-shell">
      <AppHeader />
      <main className="app-main">
        <Outlet />
      </main>
      <footer className="app-footer">
        <span>课程内网全量靶场 · VULN_MODE=ALL · 仅限课程授权测试</span>
        <span className="muted">仅限课程授权范围内的安全测试</span>
      </footer>
    </div>
  );
}
