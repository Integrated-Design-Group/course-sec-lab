/**
 * 404 页面
 */
import { Link } from 'react-router-dom';

export function NotFoundPage() {
  return (
    <div className="not-found">
      <section className="card state-card">
        <p className="not-found__code">404</p>
        <h1>页面不存在</h1>
        <p className="muted">你访问的地址没有对应的前端路由，可能是链接过期或输入有误。</p>
        <div className="not-found__actions">
          <Link className="btn btn-primary" to="/">
            返回首页
          </Link>
          <Link className="btn btn-outline" to="/login">
            前往登录
          </Link>
        </div>
      </section>
    </div>
  );
}
