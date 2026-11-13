/**
 * 概览页：验证健康检查与登录态，展示框架阶段边界
 */
import { useCallback, useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { fetchHealth } from '../api/health.js';
import { PageHeader } from '../components/PageHeader.jsx';
import { ErrorState, LoadingState } from '../components/StateViews.jsx';
import { useAuth } from '../store/auth.jsx';
import { ROLE_LABELS, formatDateTime, formatUptime } from '../utils/format.js';

export function DashboardPage() {
  const { user } = useAuth();
  const [health, setHealth] = useState(null);
  const [error, setError] = useState(null);
  const [loading, setLoading] = useState(true);

  const loadHealth = useCallback(() => {
    const controller = new AbortController();
    setLoading(true);
    setError(null);

    fetchHealth({ signal: controller.signal })
      .then((envelope) => setHealth(envelope.data))
      .catch((err) => {
        if (err.name !== 'AbortError') setError(err);
      })
      .finally(() => {
        if (!controller.signal.aborted) setLoading(false);
      });

    return controller;
  }, []);

  useEffect(() => {
    const controller = loadHealth();
    return () => controller.abort();
  }, [loadHealth]);

  return (
    <>
      <PageHeader
        title="框架概览"
        description="框架阶段验收入口：健康检查、登录态与阶段边界一目了然。"
        actions={
          <button type="button" className="btn btn-outline" onClick={loadHealth} disabled={loading}>
            重新检查
          </button>
        }
      />

      <div className="grid grid-2">
        <section className="card">
          <h2>服务健康状态</h2>
          {loading && <LoadingState label="正在调用 /api/v1/health…" />}
          {!loading && error && <ErrorState error={error} onRetry={loadHealth} />}
          {!loading && health && (
            <dl className="kv">
              <div>
                <dt>状态</dt>
                <dd>
                  <span className={`badge badge-${health.status === 'ok' ? 'success' : 'warning'}`}>
                    {health.status === 'ok' ? '正常' : '降级'}
                  </span>
                </dd>
              </div>
              <div>
                <dt>服务版本</dt>
                <dd>
                  {health.service} v{health.version}
                </dd>
              </div>
              <div>
                <dt>运行环境</dt>
                <dd>{health.env}</dd>
              </div>
              <div>
                <dt>数据库</dt>
                <dd>
                  {health.checks.database.driver} · {health.checks.database.status}
                  {health.checks.database.latencyMs ? ` · ${health.checks.database.latencyMs} ms` : ''}
                </dd>
              </div>
              <div>
                <dt>运行时长</dt>
                <dd>{formatUptime(health.uptimeSeconds)}</dd>
              </div>
            </dl>
          )}
          {health?.checks?.database?.note && <p className="muted">{health.checks.database.note}</p>}
        </section>

        <section className="card">
          <h2>当前账号</h2>
          <dl className="kv">
            <div>
              <dt>用户名</dt>
              <dd>{user?.username}</dd>
            </div>
            <div>
              <dt>显示名称</dt>
              <dd>{user?.displayName ?? '—'}</dd>
            </div>
            <div>
              <dt>角色</dt>
              <dd>{ROLE_LABELS[user?.role] ?? user?.role}</dd>
            </div>
            <div>
              <dt>最近登录</dt>
              <dd>{formatDateTime(user?.lastLoginAt)}</dd>
            </div>
          </dl>
          <p className="muted">
            登录态由 JWT 承载；退出登录后令牌立即失效（服务端撤销列表，框架阶段为单进程实现）。
          </p>
        </section>
      </div>

      <section className="card">
        <h2>框架阶段边界</h2>
        <ul className="check-list">
          <li className="check-list__done">已实现：工程骨架、统一响应/错误码、配置校验、结构化日志</li>
          <li className="check-list__done">已实现：users / roles / business_items / uploaded_files / audit_logs 表结构与迁移脚本</li>
          <li className="check-list__done">已实现：健康检查、登录 / 退出 / 当前用户、业务条目只读接口、图片上传安全基线</li>
          <li className="check-list__pending">占位：业务条目新增 / 编辑 / 删除（后端返回 501 NOT_IMPLEMENTED）</li>
          <li className="check-list__pending">未开始：VULN-01～VULN-05 漏洞设计与实现（见 docs/08-vuln-design.md）</li>
          <li className="check-list__pending">未开始：云服务器部署（文档已给出架构与占位符，未创建任何真实资源）</li>
        </ul>
      </section>

      <div className="grid grid-2">
        <Link className="card card-link" to="/business">
          <h3>教材条目列表 →</h3>
          <p className="muted">验证分页、过滤与统一响应结构。</p>
        </Link>
        {user?.role === 'admin' && (
          <Link className="card card-link" to="/admin">
            <h3>管理后台占位 →</h3>
            <p className="muted">仅 admin 角色可见，用于验证角色守卫。</p>
          </Link>
        )}
      </div>
    </>
  );
}
