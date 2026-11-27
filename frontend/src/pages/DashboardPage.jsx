/**
 * 概览页：验证健康检查与登录态，展示当前交付边界
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
        title="系统概览"
        description="M1 业务可用 / M2 全量靶场在 vuln/ALL / M3 已部署；main 保持安全基线。"
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
            登录态由 JWT 承载；退出登录后令牌立即失效（服务端撤销列表当前为单进程实现）。
          </p>
        </section>
      </div>

      <section className="card">
        <h2>当前交付边界</h2>
        <ul className="check-list">
          <li className="check-list__done">已实现：统一响应/错误码、配置校验、结构化日志、健康检查</li>
          <li className="check-list__done">已实现：登录 / 退出 / 当前用户 / 角色守卫</li>
          <li className="check-list__done">已实现：业务条目增删改查（归属校验 + 状态机 + 乐观锁 + 审计）</li>
          <li className="check-list__done">已实现：封面受控鉴权读取、管理端用户启停与审计检索</li>
          <li className="check-list__done">已实现：VULN-01～05 位于 vuln/ALL（默认 ALL，不合入 main）；VULN-01/04 已补全</li>
          <li className="check-list__done">已实现：课程授权云服务器部署（HTTP 8080，主站保留运行）</li>
          <li className="check-list__pending">未启用：域名 / HTTPS（课程选择暂不需要）；D/E 外部流程待确认</li>
        </ul>
        <p className="muted">
          main 保持安全基线；全量靶场仅课程内网使用，详见 docs/08 与 docs/16。
        </p>
      </section>

      <div className="grid grid-2">
        <Link className="card card-link" to="/business">
          <h3>教材条目列表 →</h3>
          <p className="muted">验证分页、过滤、我的条目与统一响应结构。</p>
        </Link>
        <Link className="card card-link" to="/business/new">
          <h3>发布条目 →</h3>
          <p className="muted">新建条目并上传封面，初始状态为草稿。</p>
        </Link>
        {user?.role === 'admin' && (
          <Link className="card card-link" to="/admin">
            <h3>管理后台 →</h3>
            <p className="muted">用户启停、条目审核与审计日志检索。</p>
          </Link>
        )}
      </div>
    </>
  );
}
