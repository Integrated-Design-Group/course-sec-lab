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
        <span>课程 Web 安全靶场 · 框架阶段（未植入任何漏洞）</span>
        <span className="muted">仅限课程授权范围内的安全测试</span>
      </footer>
    </div>
  );
}
